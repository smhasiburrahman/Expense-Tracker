import os

BASE_DIR = "backend/src/main/java/com/hisabnikash/api"
ENTITY_DIR = os.path.join(BASE_DIR, "entity")
REPO_DIR = os.path.join(BASE_DIR, "repository")

os.makedirs(ENTITY_DIR, exist_ok=True)
os.makedirs(REPO_DIR, exist_ok=True)

entities = {
    "Currency": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "currencies")
public class Currency {
    @Id
    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "currency_name", nullable = false, length = 50)
    private String currencyName;

    @Column(nullable = false, length = 5)
    private String symbol;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
""",

    "User": """package com.hisabnikash.api.entity;
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
""",

    "Wallet": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "wallets")
public class Wallet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String icon;

    @Column(name = "color_hex", length = 7)
    private String colorHex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "currency_code", nullable = false)
    private Currency currency;

    @Column(name = "opening_balance", precision = 19, scale = 4, nullable = false)
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(name = "current_balance", precision = 19, scale = 4, nullable = false)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived = false;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

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
""",

    "BudgetCategory": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "budget_categories")
public class BudgetCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String icon;

    @Column(name = "color_hex", length = 7)
    private String colorHex;

    @Column(name = "monthly_budget_cap", precision = 19, scale = 4)
    private BigDecimal monthlyBudgetCap;

    @Enumerated(EnumType.STRING)
    @Column(name = "limit_type", nullable = false)
    private LimitType limitType = LimitType.SOFT;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum LimitType { SOFT, HARD }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
""",

    "DefaultCategoryTemplate": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "default_category_templates")
public class DefaultCategoryTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 50)
    private String icon;

    @Column(name = "color_hex", length = 7)
    private String colorHex;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
""",

    "SavingsVault": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "savings_vaults")
public class SavingsVault {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 10)
    private String emoji;

    @Column(name = "color_hex", length = 7)
    private String colorHex;

    @Column(name = "target_amount", precision = 19, scale = 4, nullable = false)
    private BigDecimal targetAmount;

    @Column(name = "initial_savings", precision = 19, scale = 4, nullable = false)
    private BigDecimal initialSavings = BigDecimal.ZERO;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

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
""",

    "RecurringTransaction": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "recurring_transactions")
public class RecurringTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private BudgetCategory category;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 50)
    private String icon;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Frequency frequency;

    @Column(name = "next_charge_date", nullable = false)
    private LocalDate nextChargeDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.ACTIVE;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Frequency { DAILY, WEEKLY, MONTHLY, YEARLY }
    public enum Status { ACTIVE, PAUSED }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
""",

    "Transaction": """package com.hisabnikash.api.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private BudgetCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vault_id")
    private SavingsVault vault;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recurring_transaction_id")
    private RecurringTransaction recurringTransaction;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_method", nullable = false)
    private EntryMethod entryMethod = EntryMethod.MANUAL;

    @Column(length = 255)
    private String description;

    @Column(name = "source_note", length = 500)
    private String sourceNote;

    @Column(name = "original_amount", precision = 19, scale = 4, nullable = false)
    private BigDecimal originalAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_currency_code", nullable = false)
    private Currency originalCurrency;

    @Column(name = "exchange_rate", precision = 19, scale = 6, nullable = false)
    private BigDecimal exchangeRate = BigDecimal.ONE;

    @Column(name = "exchange_rate_at", nullable = false)
    private LocalDateTime exchangeRateAt;

    @Column(name = "converted_amount", precision = 19, scale = 4, nullable = false)
    private BigDecimal convertedAmount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum TransactionType { EXPENSE, VAULT_CONTRIBUTION, SADAQA_CONTRIBUTION }
    public enum EntryMethod { MANUAL, AI_QUICK_ADD, RECEIPT_OCR, SYSTEM_RECURRING }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (exchangeRateAt == null) exchangeRateAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
"""
}

# Write entities
for entity_name, entity_code in entities.items():
    with open(os.path.join(ENTITY_DIR, f"{entity_name}.java"), "w") as f:
        f.write(entity_code)

# Write repositories
for entity_name in entities.keys():
    id_type = "String" if entity_name == "Currency" else "Long"
    repo_code = f"""package com.hisabnikash.api.repository;

import com.hisabnikash.api.entity.{entity_name};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface {entity_name}Repository extends JpaRepository<{entity_name}, {id_type}> {{
}}
"""
    with open(os.path.join(REPO_DIR, f"{entity_name}Repository.java"), "w") as f:
        f.write(repo_code)

print("Entities and Repositories generated successfully.")
