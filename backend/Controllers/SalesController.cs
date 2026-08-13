using Magaza.Api.Dtos;
using Magaza.Api.Models;
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
    public async Task<IActionResult> CreateSale(SaleCreateDto dto)
    {
        if (dto.Items is null || dto.Items.Count == 0)
            return BadRequest(new { error = "Fişte en az bir ürün olmalı." });
        foreach (var i in dto.Items)
        {
            if (string.IsNullOrWhiteSpace(i.Label) || i.UnitPrice <= 0 || i.Quantity <= 0)
                return BadRequest(new { error = "Her kalemde ürün adı, fiyat ve adet geçerli olmalı." });
        }
        if (dto.CashAmount < 0 || dto.CardAmount < 0)
            return BadRequest(new { error = "Tutarlar negatif olamaz." });

        // Bütünlük: ödemelerin toplamı = kalemlerin toplamı
        var itemsTotal = dto.Items.Sum(i => i.UnitPrice * i.Quantity);
        if (dto.CashAmount + dto.CardAmount != itemsTotal)
            return BadRequest(new { error = $"Ödeme toplamı ({dto.CashAmount + dto.CardAmount}) ürün toplamına ({itemsTotal}) eşit olmalı." });

        var sale = new Sale
        {
            SoldAt = DateTime.UtcNow,
            CashAmount = dto.CashAmount,
            CardAmount = dto.CardAmount,
            Items = dto.Items.Select(i => new SaleItem
            {
                Label = i.Label.Trim(),
                UnitPrice = i.UnitPrice,
                Quantity = i.Quantity
            }).ToList()
        };

        _db.Sales.Add(sale);
        await _db.SaveChangesAsync();   // fiş + kalemler tek transaction: ya hepsi ya hiçbiri
        return Created($"/api/sales/{sale.Id}", sale);
    }

    // GET api/sales?date=2026-08-13 — o iş gününün fişleri, kalemleriyle birlikte
    [HttpGet]
    public async Task<IActionResult> GetSales(string date)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var day))
            return BadRequest(new { error = "Tarih formatı yyyy-MM-dd olmalı." });

        var startUtc = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endUtc = startUtc.AddDays(1);

        var sales = await _db.Sales
            .Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc)
            .Include(s => s.Items)              // "kalemleri de getir" — bunsuz Items boş gelir
            .OrderByDescending(s => s.SoldAt)
            .ToListAsync();

        return Ok(sales);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteSale(int id)
    {
        var sale = await _db.Sales.FindAsync(id);
        if (sale is null) return NotFound();

        _db.Sales.Remove(sale);            // cascade: kalemler de otomatik silinir
        await _db.SaveChangesAsync();
        return NoContent();
    }
}