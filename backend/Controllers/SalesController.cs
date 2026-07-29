using Magaza.Api.Models;
using Magaza.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Magaza.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly AppDb _db;
    public SalesController(AppDb db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateSaleEntry(SaleCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Label))
        {
            return BadRequest(new { error = "Ürün adı boş olamaz." });
        }
        if (dto.UnitPrice <= 0 || dto.Quantity <= 0)
        {
            return BadRequest(new { error = "Birim fiyat sıfırdan büyük olmalıdır." });
        }
        var pm = dto.PaymentMethod?.Trim().ToLowerInvariant();
        if (pm != "cash" && pm != "card")
            return BadRequest(new { error = "Ödeme tipi 'cash' veya 'card' olmalı." });

        var sale = new SaleEntry
        {
            Label = dto.Label.Trim(),
            UnitPrice = dto.UnitPrice,
            Quantity = dto.Quantity,
            PaymentMethod = dto.PaymentMethod,
            SoldAt = DateTime.UtcNow
        };

        _db.SaleEntries.Add(sale);
        await _db.SaveChangesAsync();
        return Created($"/api/sales/{sale.Id}", sale);
    }

    [HttpGet]
    public async Task<IActionResult> GetSaleEntries()
    {
        var sale = await _db.SaleEntries.OrderByDescending(s => s.SoldAt).Take(50).ToListAsync();
        return Ok(sale);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteSaleEntry(int id)
    {
        var sale = await _db.SaleEntries.FindAsync(id);
        if (sale == null)
        {
            return NotFound(new { error = "Satış kaydı bulunamadı." });
        }

        _db.SaleEntries.Remove(sale);
        await _db.SaveChangesAsync();
        return NoContent();
    }

}