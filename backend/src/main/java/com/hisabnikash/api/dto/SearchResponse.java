package com.hisabnikash.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SearchResponse {
    private String query;
    private int totalMatches;
    private List<TransactionResult> transactions;
    private List<CategoryResult> categories;
    private List<WalletResult> wallets;

    @Data
    public static class TransactionResult {
        private Long id;
        private String description;
        private Long categoryId;
        private String categoryName;
        private String categoryIcon;
        private String categoryColor;
        private Long walletId;
        private String walletName;
        private String walletIcon;
        private String walletColor;
        private Long vaultId;
        private String vaultName;
        private BigDecimal amount;
        private String transactionType;
        private String entryMethod;
        private LocalDate date;
        private String sourceNote;
    }

    @Data
    public static class CategoryResult {
        private Long id;
        private String name;
        private String icon;
        private String colorHex;
        private BigDecimal monthlyBudgetCap;
        private BigDecimal spent;
        private long progress;
        private String status;
        private String statusClass;
    }

    @Data
    public static class WalletResult {
        private Long id;
        private String name;
        private String icon;
        private String colorHex;
        private BigDecimal currentBalance;
        private BigDecimal openingBalance;
        private String currencyCode;
    }
}
