using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Magaza.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabelPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "QuickLabels",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Price",
                table: "QuickLabels");
        }
    }
}
