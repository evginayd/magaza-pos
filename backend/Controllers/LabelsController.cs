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
            return BadRequest(new { error = "Etiket adı boş olamaz." });

        var name = dto.Name.Trim();
        var parentId = dto.ParentId;

        // Üst etiket verildiyse: var mı, aktif mi, kendisi kök mü?
        if (parentId is int pid)
        {
            var parent = await _db.QuickLabels.FindAsync(pid);
            if (parent is null || !parent.IsActive)
                return BadRequest(new { error = "Üst etiket bulunamadı." });
            if (parent.ParentId != null)
                return BadRequest(new { error = "Etiketler en fazla iki kademeli olabilir." });
        }

        // Tekrar kontrolü artık AYNI ÜST ETİKET altında:
        // "Keten" hem Pantolon'un hem Gömlek'in altında olabilmeli.
        var exists = await _db.QuickLabels
            .AnyAsync(l => l.IsActive && l.ParentId == parentId && l.Name.ToLower() == name.ToLower());
        if (exists)
            return Conflict(new { error = $"'{name}' isimli etiket bu grupta zaten var." });

        // Sıra numarası da kendi grubu içinde
        var maxSort = await _db.QuickLabels
            .Where(l => l.ParentId == parentId)
            .MaxAsync(l => (int?)l.SortOrder) ?? -1;

        var label = new QuickLabel
        {
            Name = name,
            ParentId = parentId,
            SortOrder = maxSort + 1,
            IsActive = true
        };

        _db.QuickLabels.Add(label);
        await _db.SaveChangesAsync();
        return Created($"/api/labels/{label.Id}", label);
    }

    // PUT api/labels/5 — sadece ismi değiştirir (kademe/üst etiket değişmez)
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateLabel(int id, LabelUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Etiket adı boş olamaz." });

        var label = await _db.QuickLabels.FindAsync(id);
        if (label is null || !label.IsActive)
            return NotFound(new { error = "Bu etiket bulunamadı." });

        var name = dto.Name.Trim();

        // Aynı grupta aynı isim olmasın — ama KENDİSİ hariç (l.Id != id)
        var exists = await _db.QuickLabels
            .AnyAsync(l => l.IsActive && l.Id != id && l.ParentId == label.ParentId
                        && l.Name.ToLower() == name.ToLower());
        if (exists)
            return Conflict(new { error = $"'{name}' isimli etiket bu grupta zaten var." });

        label.Name = name;
        await _db.SaveChangesAsync();
        return Ok(label);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteLabel(int id)
    {
        var label = await _db.QuickLabels.FindAsync(id);
        if (label == null || !label.IsActive)
        {
            return NotFound(new { error = "Bu etiket bulunamadı." });
        }

        label.IsActive = false;

        // Kök etiket siliniyorsa çeşitleri de gitsin (sahipsiz çeşit kalmasın)
        if (label.ParentId is null)
        {
            var children = await _db.QuickLabels
                .Where(l => l.ParentId == id && l.IsActive)
                .ToListAsync();
            foreach (var c in children)
                c.IsActive = false;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}