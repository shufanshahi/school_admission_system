using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolAdmission.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE classes
                  ADD CONSTRAINT ck_classes_total_seats CHECK (total_seats > 0);
                """);

            migrationBuilder.Sql("""
                ALTER TABLE holds
                  ADD CONSTRAINT ck_holds_status
                  CHECK (status IN ('HELD','CONFIRMED','EXPIRED','CANCELLED'));
                """);

            // DB-level backstop: at most one active (HELD or CONFIRMED) row per student per class.
            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX ux_holds_active_student_class
                  ON holds (class_id, student_id)
                  WHERE status IN ('HELD','CONFIRMED');
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_holds_class_status_expires
                  ON holds (class_id, status, expires_at);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_holds_student_created
                  ON holds (student_id, created_at DESC);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_holds_student_created;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_holds_class_status_expires;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ux_holds_active_student_class;");
            migrationBuilder.Sql("ALTER TABLE holds DROP CONSTRAINT IF EXISTS ck_holds_status;");
            migrationBuilder.Sql("ALTER TABLE classes DROP CONSTRAINT IF EXISTS ck_classes_total_seats;");
        }
    }
}
