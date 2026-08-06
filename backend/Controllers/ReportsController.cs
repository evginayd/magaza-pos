using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Magaza.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDb _db;

    public ReportsController(AppDb db)
    {
        _db = db;
    }

    // GET api/reports/daily?date=2026-07-29
    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyReport(string date)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var day))
            return BadRequest(new { error = "Tarih formatı yyyy-MM-dd olmalı." });

        // İş günü sınırı TR 03:00 = UTC 00:00 → iş günü, UTC takvim günüyle aynı.
        // Bu yüzden saat kaydırması YOK. (TR sabit UTC+3, yaz saati uygulanmıyor.)
        var startUtc = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endUtc = startUtc.AddDays(1);

        var byMethod = await _db.SaleEntries
            .Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc)   // yarı açık aralık
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new
            {
                Method = g.Key,
                Total = g.Sum(s => s.UnitPrice * s.Quantity),   // Postgres'te SUM olur
                Count = g.Sum(s => s.Quantity)
            })
            .ToListAsync();

        var cash = byMethod.FirstOrDefault(r => r.Method == "cash")?.Total ?? 0;
        var card = byMethod.FirstOrDefault(r => r.Method == "card")?.Total ?? 0;

        // Defterin alt kısmı: o günün gider listesi
        var expenses = await _db.Expenses
            .Where(e => e.ExpenseDate == day)
            .OrderBy(e => e.Id)
            .Select(e => new { e.Id, e.Category, e.Amount, e.Note })
            .ToListAsync();

        var expensesTotal = expenses.Sum(e => e.Amount);   // liste bellekte, bu Sum C#'ta

        return Ok(new
        {
            date,
            cashTotal = cash,               // defterdeki NAKİT satırı (brüt!)
            cardTotal = card,               // KART satırı
            total = cash + card,            // TOPLAM
            itemCount = byMethod.Sum(r => r.Count),
            expenses,                       // Yemek 100, Su 170...
            expensesTotal,
            expectedCash = cash - expensesTotal   // kasada olması gereken nakit (yardımcı pusula)
        });
    }

    // GET api/reports/monthly?month=2026-07
    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyReport(string month)
    {
        // "2026-07" + "-01" = tam tarih → format VE değer doğrulaması tek adımda
        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var first))
            return BadRequest(new { error = "Ay formatı yyyy-MM olmalı." });

        var next = first.AddMonths(1);

        // İş günü = UTC günü (TR 03:00 sınırı) → ay aralığı da UTC gün sınırlarıyla çizilir
        var startUtc = DateTime.SpecifyKind(first.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(next.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        // DİKKAT: Bu satır veri ÇEKMEZ — sorgu tanımıdır. İki gruplama da bunu paylaşır.
        var monthSales = _db.SaleEntries
            .Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc);

        var byMethod = await monthSales
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new { Method = g.Key, Total = g.Sum(s => s.UnitPrice * s.Quantity) })
            .ToListAsync();                       // SUM Postgres'te çalıştı, özet geldi

        var byLabel = await monthSales
            .GroupBy(s => s.Label)
            .Select(g => new
            {
                Label = g.Key,
                Quantity = g.Sum(s => s.Quantity),
                Revenue = g.Sum(s => s.UnitPrice * s.Quantity)
            })
            .OrderByDescending(x => x.Revenue)    // babanın listesi: en çok satan en üstte
            .ToListAsync();

        var expensesTotal = await _db.Expenses
            .Where(e => e.ExpenseDate >= first && e.ExpenseDate < next)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;   // boş ay → NULL → 0 (Max'taki numaranın kardeşi)

        var cash = byMethod.FirstOrDefault(r => r.Method == "cash")?.Total ?? 0;
        var card = byMethod.FirstOrDefault(r => r.Method == "card")?.Total ?? 0;
        var salesTotal = cash + card;

        return Ok(new
        {
            month,
            cashTotal = cash,
            cardTotal = card,
            salesTotal,
            itemCount = byLabel.Sum(x => x.Quantity),   // küçük özet listede, C#'ta — sorun değil
            byLabel,
            expensesTotal,
            net = salesTotal - expensesTotal
        });
    }
}