package com.hisabnikash.api.entity;
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
