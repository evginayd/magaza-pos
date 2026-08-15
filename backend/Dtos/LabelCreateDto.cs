namespace Magaza.Api.Dtos;

public record LabelCreateDto(string Name, int? ParentId, decimal? Price);
