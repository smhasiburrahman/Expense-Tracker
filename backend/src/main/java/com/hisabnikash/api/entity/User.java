package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "base_currency_code", referencedColumnName = "currency_code", nullable = false)
    private Currency baseCurrency;

    @Column(name = "monthly_income", precision = 19, scale = 4)
    private BigDecimal monthlyIncome;

    @Column(name = "sadaqa_monthly_target", precision = 19, scale = 4, nullable = false)
    private BigDecimal sadaqaMonthlyTarget = BigDecimal.ZERO;

    @Column(length = 100)
    private String region;

    @Column(name = "notify_budget_alerts", nullable = false)
    private Boolean notifyBudgetAlerts = true;

    @Column(name = "notify_periodic_summary", nullable = false)
    private Boolean notifyPeriodicSummary = true;

    @Column(name = "notify_savings_goals", nullable = false)
    private Boolean notifySavingsGoals = true;

    @Column(name = "onboarding_completed_at")
    private LocalDateTime onboardingCompletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
