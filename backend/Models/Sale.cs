namespace Magaza.Api.Models;

//Fişin kendisi
public class Sale
{
    public int Id { get; set; }
    public DateTime SoldAt { get; set; }
    public decimal CashAmount { get; set; }   // fişin nakit kısmı
    public decimal CardAmount { get; set; }   // fişin kart kısmı
    public List<SaleItem> Items { get; set; } = [];
}