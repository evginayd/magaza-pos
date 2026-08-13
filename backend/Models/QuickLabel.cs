namespace Magaza.Api.Models;

public class QuickLabel
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ParentId { get; set; }   // null = kök etiket; dolu = hangi kökün çocuğu

}