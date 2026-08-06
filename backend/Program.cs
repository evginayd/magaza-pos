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
// --- API ENDPOINT'LERİ ---
app.MapGet("/", () => "Mağaza POS API Çalışıyor!");
app.MapControllers();
app.Run();