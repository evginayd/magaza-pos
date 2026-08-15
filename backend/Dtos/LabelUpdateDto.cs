namespace Magaza.Api.Dtos;

// Price null gelirse fiyat kaldırılır (fiyat satışta sorulur haline döner)
public record LabelUpdateDto(string Name, decimal? Price);
