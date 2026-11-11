using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Data;

public class AdmissionDbContext(DbContextOptions<AdmissionDbContext> options) : DbContext(options)
{
    public DbSet<ClassEntity> Classes => Set<ClassEntity>();
    public DbSet<HoldEntity> Holds => Set<HoldEntity>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<ClassEntity>(e =>
        {
            e.ToTable("classes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            e.Property(x => x.TotalSeats).HasColumnName("total_seats");
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("timestamp with time zone").HasDefaultValueSql("now()");
        });

        b.Entity<HoldEntity>(e =>
        {
            e.ToTable("holds");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ClassId).HasColumnName("class_id").IsRequired();
            e.Property(x => x.StudentId).HasColumnName("student_id").HasMaxLength(17).IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(16).IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at")
                .HasColumnType("timestamp with time zone").HasDefaultValueSql("now()");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at")
                .HasColumnType("timestamp with time zone");
            e.Property(x => x.ConfirmedAt).HasColumnName("confirmed_at")
                .HasColumnType("timestamp with time zone");
            e.Property(x => x.CancelledAt).HasColumnName("cancelled_at")
                .HasColumnType("timestamp with time zone");

            e.HasOne<ClassEntity>().WithMany().HasForeignKey(x => x.ClassId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
