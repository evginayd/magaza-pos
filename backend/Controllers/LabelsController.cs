using Magaza.Api.Models;
using Magaza.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Magaza.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LabelsController : ControllerBase
{
    private readonly AppDb _db;

    public LabelsController(AppDb db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetLabels()
    {
        var labels = await _db.QuickLabels
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .ToListAsync();

        return Ok(labels);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLabel(LabelCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { error = "Label name cannot be empty." });
        }

        var maxSort = await _db.QuickLabels.MaxAsync(l => (int?)l.SortOrder) ?? -1;
        var label = new QuickLabel
        {
            Name = dto.Name.Trim(),
            SortOrder = maxSort + 1,
            IsActive = true
        };

        _db.QuickLabels.Add(label);
        await _db.SaveChangesAsync();
        return Created($"/api/labels/{label.Id}", label);
    }
}