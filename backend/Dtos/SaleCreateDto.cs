namespace Magaza.Api.Dtos;

public record SaleCreateDto(
    string Label,
    decimal UnitPrice,
    int Quantity,
    string PaymentMethod
);