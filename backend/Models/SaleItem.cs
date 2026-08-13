using System.Text.Json.Serialization;
//Fişteki her bir kalem
namespace Magaza.Api.Models;

public class SaleItem
{
    public int Id { get; set; }
    public int SaleId { get; set; }          // hangi fişe ait (FK)

    [JsonIgnore]                             // JSON'a çıkarken bu kapıyı kapat:
    public Sale Sale { get; set; } = null!;  // fiş→kalem→fiş→... sonsuz döngü olmasın

    public string Label { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}