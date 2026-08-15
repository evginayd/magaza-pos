using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Magaza.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLabelPinAndColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "QuickLabels",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPinned",
                table: "QuickLabels",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "QuickLabels");

            migrationBuilder.DropColumn(
                name: "IsPinned",
                table: "QuickLabels");
        }
    }
}
