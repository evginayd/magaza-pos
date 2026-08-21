![CI](https://github.com/evginayd/magaza-pos/actions/workflows/ci.yml/badge.svg)

# Mağaza — Point of Sale & Daily Reconciliation

A mobile-first sales tracking system for a small clothing retail store, replacing a
paper ledger and manual spreadsheet workflow. Built as a full-stack application with a
real production user base.

🔗 **Live demo:** _(added after deployment)_

## Problem

Sales were recorded on paper with incomplete data ("trousers 700"), then re-typed into a
spreadsheet every evening — duplicate work. Monthly per-product totals were counted by
hand from those lists, taking hours. Income vs. expenses and per-category profit were
estimated rather than measured.

**Outcome:** manual month-end counting eliminated; cash drawer reconciliation is now
available at any moment.

## Design constraints

The difficulty here is the user profile, not the technology:

- **Operators are not comfortable with software.** The UI is built around large touch
  targets, minimal typing, and one-tap sales.
- **The system must tolerate imperfect use.** No step may silently break the data if it
  is skipped or done out of order.
- **Administration happens remotely.** Product setup, corrections and reporting are done
  from anywhere, which ruled out a LAN-only deployment.

## Architecture

```
[Phones — PWA shortcut, full screen]
        │  HTTPS · REST · X-Api-Key
        ▼
[Next.js 16 (App Router) + Tailwind]        → Vercel
        │
        ▼
[ASP.NET Core Web API (.NET 10) + EF Core]  → Railway
        │
        ▼
[PostgreSQL]                                → Railway
```

**Stack:** .NET 10 · ASP.NET Core · Entity Framework Core · PostgreSQL · Next.js 16 ·
TypeScript · Tailwind CSS · Docker · GitHub Actions (CI) · Railway + Vercel (CD)

## Data model

```
QuickLabel  : id, name, parentId?, price?, isPinned, color?, sortOrder, isActive
Sale        : id, soldAt, cashAmount, cardAmount
SaleItem    : id, saleId, label, unitPrice, quantity
Expense     : id, expenseDate, category, amount, note?
```

## Key design decisions

**Business day boundary at 03:00 local time.** The store occasionally stays open past
midnight, so a calendar-day boundary would file a 00:30 sale under the wrong day. The
cutoff sits at an hour the store is never open. Since the locale is a fixed UTC+3 offset,
03:00 local equals 00:00 UTC — the business day maps directly onto the UTC calendar day,
so report queries need no timezone arithmetic.

**Receipt model (Sale / SaleItem).** One transaction with three products is one `Sale`
and three `SaleItem` rows, persisted in a single `SaveChanges` call — one database
transaction, so a partial receipt cannot exist.

**Split payment stored as two amounts, not a type.** Instead of a `PaymentMethod` enum,
`Sale` holds `CashAmount` and `CardAmount`. Mixed payments stop being a special case;
all-cash and all-card become instances of the same model, and cash reconciliation stays
correct in every scenario. The server validates that the payment total equals the line
item total.

**Product names are copied onto sales.** `SaleItem.Label` is a text snapshot rather than
a foreign key, so renaming or deleting a product never alters historical sales or reports.

**Soft delete.** Removing a product deactivates it; deleting a parent deactivates its
variants with it.

**Group-level profitability.** The first segment of a product name is treated as its group
("Kurtuluş - Polo Shirt M" → "Kurtuluş"), and an expense category with the same name is
treated as that group's cost — turning revenue, cost and net margin per group into a
single report.

**Shared-secret auth instead of JWT.** There is one trusted principal and no per-user
claims, so a token carrying identity data would add nothing. The secret lives in an
environment variable, is compared in constant time, and is persisted client-side so
sign-in happens once per device.

**Charts without a charting library.** Revenue bars are plain CSS — appropriate for this
data volume and cheaper on mobile than adding a dependency.

## Features

- **Sales:** two-level product selection, fixed-price items skip price entry, cart with
  automatic line merging and quantity editing, cash / card / split payment, undo last sale
- **Daily close:** cash-card-total breakdown, expense list, expected cash in drawer,
  itemized sales table with receipts distinguished by row colour
- **Reports:** monthly and yearly — revenue, expenses, net, revenue chart, per-product
  and per-group breakdown
- **Expenses:** category buttons, expenses attributable to a product group
- **Product management:** groups and variants, fixed prices, colour coding, pinning
- **PWA:** installs to the home screen and opens full screen

## API

All `/api` routes require an `X-Api-Key` header.

| Method | Path | Description |
|---|---|---|
| GET / POST | `/api/labels` | Product tree · create group or variant |
| PUT / DELETE | `/api/labels/{id}` | Update name, price, colour, pin · soft delete |
| GET | `/api/sales?date=` | Receipts for a business day, with line items |
| POST / DELETE | `/api/sales` · `/api/sales/{id}` | Create · delete receipt |
| GET / POST / DELETE | `/api/expenses` | Expense operations |
| GET | `/api/reports/daily?date=` | Daily close report |
| GET | `/api/reports/monthly?month=` | Monthly report |
| GET | `/api/reports/yearly?year=` | Yearly report |

## Running locally

```bash
git clone git@github.com:evginayd/magaza-pos.git
cd magaza-pos
docker compose up -d db
dotnet dotnet-ef database update --project backend
dotnet watch --project backend run
```

```bash
cd frontend && npm install && npm run dev
```

Local settings live in `backend/appsettings.Development.json` and `frontend/.env.local`.

## Environment variables (production)

| Variable | Service | Example |
|---|---|---|
| `ConnectionStrings__Default` | Backend | `Host=...;Port=5432;Database=...;Username=...;Password=...` |
| `Auth__Password` | Backend | shared secret |
| `Cors__Origins` | Backend | `https://app.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Frontend | `https://api.up.railway.app` |

Migrations are applied automatically on startup.

## Screenshots

_(added after deployment)_

## Roadmap

- [ ] Daily close reconciliation record (counted cash + POS total + variance)
- [ ] Barcode scanning (camera or Bluetooth scanner)
- [ ] Automated database backups
- [ ] Test coverage and a test step in CI
