using Magaza.Api.Models;
using Magaza.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Magaza.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly AppDb _db;

    public ExpensesController(AppDb db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateExpense(ExpenseCreateDto dto)
    {
        if (dto.Amount <= 0)
        {
            return BadRequest(new { error = "Gider miktarı sıfırdan büyük olmalıdır." });
        }

        var expense = new Expense
        {
            Amount = dto.Amount,
            Category = dto.Category,
            ExpenseDate = dto.Date != null ? DateOnly.Parse(dto.Date) : DateOnly.FromDateTime(DateTime.UtcNow),
            Note = dto.Note
        };

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();
        return Created($"/api/expenses/{expense.Id}", expense);
    }

    [HttpGet]
    public async Task<IActionResult> GetExpenses()
    {
        var expenses = await _db.Expenses.OrderByDescending(e => e.ExpenseDate).Take(50).ToListAsync();
        return Ok(expenses);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null)
        {
            return NotFound(new { error = "Gider kaydı bulunamadı." });
        }

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}