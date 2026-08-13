namespace Magaza.Api.Dtos;

public record SaleItemDto(string Label, decimal UnitPrice, int Quantity);

public record SaleCreateDto(decimal CashAmount, decimal CardAmount, List<SaleItemDto> Items);