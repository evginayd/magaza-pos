namespace Magaza.Api.Dtos;

public record ExpenseCreateDto(
    decimal Amount,
    string Category,
    string? Note,
    string? Date
);