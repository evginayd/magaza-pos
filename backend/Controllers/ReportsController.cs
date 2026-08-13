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

        var monthSales = _db.Sales.Where(s => s.SoldAt >= startUtc && s.SoldAt < endUtc);

        var cash = await monthSales.SumAsync(s => (decimal?)s.CashAmount) ?? 0;
        var card = await monthSales.SumAsync(s => (decimal?)s.CardAmount) ?? 0;
        var salesTotal = cash + card;

        // Babanın listesi artık kalemlerden geliyor
        var byLabel = await _db.SaleItems
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

        var expensesTotal = await _db.Expenses
            .Where(e => e.ExpenseDate >= first && e.ExpenseDate < next)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        return Ok(new
        {
            month,
            cashTotal = cash,
            cardTotal = card,
            salesTotal,
            itemCount = byLabel.Sum(x => x.Quantity),
            byLabel,
            expensesTotal,
            net = salesTotal - expensesTotal
        });
    }
}