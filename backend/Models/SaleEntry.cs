namespace Magaza.Api.Models;

public class SaleEntry
{
    public int Id { get; set; }
    public string Label { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public string PaymentMethod { get; set; } = "";
    public DateTime SoldAt { get; set; }
}