namespace Magaza.Api.Models;

public class QuickLabel
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ParentId { get; set; }   // null = kök etiket; dolu = hangi kökün çocuğu

    // Sabit fiyatlı ürünler için (okul kıyafeti gibi). null = fiyat satışta sorulur.
    public decimal? Price { get; set; }

    // Listede en üste sabitlenir (okul sezonu gibi yoğun dönemler için)
    public bool IsPinned { get; set; }

    // Görsel ayrım: "bordo", "turuncu", "yesil", "mavi", "mor". null = varsayılan
    public string? Color { get; set; }
}