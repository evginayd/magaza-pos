namespace Magaza.Api.Dtos;

// Price null gelirse fiyat kaldırılır (fiyat satışta sorulur haline döner)
// Color null gelirse varsayılan renge döner
public record LabelUpdateDto(string Name, decimal? Price, string? Color, bool? IsPinned);
