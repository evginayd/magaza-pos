# ── 1. AŞAMA: derle ──
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Önce sadece csproj: paketler değişmedikçe bu katman önbellekten gelir
COPY Magaza.Api.csproj .
RUN dotnet restore

# Sonra kodun tamamı
COPY . .
RUN dotnet publish -c Release -o /app

# ── 2. AŞAMA: çalıştır (SDK yok, sadece çalışma ortamı → küçük imaj) ──
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

EXPOSE 8080

# Bulut platformları dinlenecek portu PORT değişkeniyle bildirir.
# Kabuk biçimi kullanıyoruz ki ${PORT} çalışma anında çözülsün;
# tanımlı değilse 8080'e düşer.
ENTRYPOINT ["sh", "-c", "dotnet Magaza.Api.dll --urls http://+:${PORT:-8080}"]
