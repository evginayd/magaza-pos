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

    public record LabelStat(string Label, int Quantity, decimal Revenue);

    // Aylık ve yıllık raporun ORTAK kısmı: toplamlar, ürün kırılımı, gider.
    // Sadece "dönem" değişiyor; tekrar yazmıyoruz.
    private async Task<(decimal Cash, decimal Card, decimal Expenses, List<LabelStat> ByLabel)>
        GetPeriodTotals(DateTime startUtc, DateTime endUtc, DateOnly firstDay, DateOnly nextDay)
    {
        var sales = _db.Sales.Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc);

        var cash = await sales.SumAsync(s => (decimal?)s.CashAmount) ?? 0;
        var card = await sales.SumAsync(s => (decimal?)s.CardAmount) ?? 0;

        var rows = await _db.SaleItems
            .Where(i => i.Sale.SoldAt >= startUtc && i.Sale.SoldAt < endUtc)
            .GroupBy(i => i.Label)
            .Select(g => new
            {
                Label = g.Key,
                Quantity = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.UnitPrice * i.Quantity)
            })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync();

        var byLabel = rows
            .Select(x => new LabelStat(x.Label, x.Quantity, x.Revenue))
            .ToList();

        var expenses = await _db.Expenses
            .Where(e => e.ExpenseDate >= firstDay && e.ExpenseDate < nextDay)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        return (cash, card, expenses, byLabel);
    }

    // GET api/reports/daily?date=2026-08-13
    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyReport(string date)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var day))
            return BadRequest(new { error = "Tarih formatı yyyy-MM-dd olmalı." });

        // İş günü sınırı TR 03:00 = UTC 00:00 → iş günü, UTC takvim günüyle aynı
        var startUtc = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endUtc = startUtc.AddDays(1);

        var daySales = _db.Sales.Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc);

        // Karma ödemenin meyvesi: GroupBy yok, iki düz toplam var
        var cash = await daySales.SumAsync(s => (decimal?)s.CashAmount) ?? 0;
        var card = await daySales.SumAsync(s => (decimal?)s.CardAmount) ?? 0;

        var itemCount = await _db.SaleItems
            .Where(i => i.Sale.SoldAt >= startUtc && i.Sale.SoldAt < endUtc)
            .SumAsync(i => (int?)i.Quantity) ?? 0;

        var expenses = await _db.Expenses
            .Where(e => e.ExpenseDate == day)
            .OrderBy(e => e.Id)
            .Select(e => new { e.Id, e.Category, e.Amount, e.Note })
            .ToListAsync();

        var expensesTotal = expenses.Sum(e => e.Amount);

        return Ok(new
        {
            date,
            cashTotal = cash,
            cardTotal = card,
            total = cash + card,
            itemCount,
            expenses,
            expensesTotal,
            expectedCash = cash - expensesTotal
        });
    }

    // GET api/reports/monthly?month=2026-08
    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyReport(string month)
    {
        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var first))
            return BadRequest(new { error = "Ay formatı yyyy-MM olmalı." });

        var next = first.AddMonths(1);
        var startUtc = DateTime.SpecifyKind(first.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(next.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        var (cash, card, expensesTotal, byLabel) =
            await GetPeriodTotals(startUtc, endUtc, first, next);
        var salesTotal = cash + card;

        // Gün gün kırılım (grafik için). İş günü = UTC günü olduğu için
        // SoldAt.Date doğrudan iş gününü verir.
        var byDay = await _db.Sales
            .Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc)
            .GroupBy(s => s.SoldAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Cash = g.Sum(s => s.CashAmount),
                Card = g.Sum(s => s.CardAmount),
                Total = g.Sum(s => s.CashAmount + s.CardAmount)
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        return Ok(new
        {
            month,
            cashTotal = cash,
            cardTotal = card,
            salesTotal,
            itemCount = byLabel.Sum(x => x.Quantity),
            byLabel,
            byDay,
            expensesTotal,
            net = salesTotal - expensesTotal
        });
    }

    // GET api/reports/yearly?year=2026
    [HttpGet("yearly")]
    public async Task<IActionResult> GetYearlyReport(int year)
    {
        if (year < 2000 || year > 2999)
            return BadRequest(new { error = "Yıl 2000-2999 arasında olmalı." });

        var first = new DateOnly(year, 1, 1);
        var next = first.AddYears(1);
        var startUtc = DateTime.SpecifyKind(first.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(next.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        var (cash, card, expensesTotal, byLabel) =
            await GetPeriodTotals(startUtc, endUtc, first, next);
        var salesTotal = cash + card;

        // Ay ay kırılım (yıllık grafik için)
        var byMonth = await _db.Sales
            .Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc)
            .GroupBy(s => s.SoldAt.Month)
            .Select(g => new
            {
                Month = g.Key,
                Cash = g.Sum(s => s.CashAmount),
                Card = g.Sum(s => s.CardAmount),
                Total = g.Sum(s => s.CashAmount + s.CardAmount)
            })
            .OrderBy(x => x.Month)
            .ToListAsync();

        return Ok(new
        {
            year,
            cashTotal = cash,
            cardTotal = card,
            salesTotal,
            itemCount = byLabel.Sum(x => x.Quantity),
            byLabel,
            byMonth,
            expensesTotal,
            net = salesTotal - expensesTotal
        });
    }
}