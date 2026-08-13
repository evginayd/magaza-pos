using Microsoft.EntityFrameworkCore;
using Magaza.Api.Models;

namespace Magaza.Api;

public class AppDb : DbContext
{
    public AppDb(DbContextOptions<AppDb> options) : base(options)
    {
    }

    public DbSet<Sale> Sales { get; set; }
    public DbSet<SaleItem> SaleItems { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<QuickLabel> QuickLabels { get; set; }
}