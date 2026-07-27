namespace Magaza.Api.Models;

public class Expense
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
    public string Category { get; set; } = "";
    public string? Note { get; set; }
    public DateOnly ExpenseDate { get; set; }
}