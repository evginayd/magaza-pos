using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Magaza.Api;

var builder = WebApplication.CreateBuilder(args);

// DbContext Servis Kaydı (PostgreSQL)
builder.Services.AddDbContext<AppDb>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// .NET 9/10 Yerleşik OpenAPI Servisi
builder.Services.AddOpenApi();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
        ));


var app = builder.Build();

// Development ortamında OpenAPI endpoint'ini aktif et
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("frontend");

// ── Paylaşılan şifre koruması ────────────────────────────────────────────
// /api ile başlayan her isteğin "X-Api-Key" başlığında doğru şifreyi
// taşıması gerekir. Şifre koda yazılmaz; ayardan/ortam değişkeninden gelir
// (üretimde: Auth__Password). CORS'tan SONRA çalışır ki tarayıcının
// ön kontrol (OPTIONS) isteği takılmasın.
var authPassword = builder.Configuration["Auth:Password"];

app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/api")
        || HttpMethods.IsOptions(context.Request.Method))
    {
        await next();
        return;
    }

    var provided = context.Request.Headers["X-Api-Key"].ToString();

    // FixedTimeEquals: karşılaştırma süresinden şifre tahmin edilemesin diye
    // (uzunluklar farklıysa zaten false döner)
    var ok = !string.IsNullOrEmpty(authPassword)
             && CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(provided),
                    Encoding.UTF8.GetBytes(authPassword));

    if (!ok)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }

    await next();
});

// --- API ENDPOINT'LERİ ---
app.MapGet("/", () => "Mağaza POS API Çalışıyor!");
app.MapControllers();
app.Run();