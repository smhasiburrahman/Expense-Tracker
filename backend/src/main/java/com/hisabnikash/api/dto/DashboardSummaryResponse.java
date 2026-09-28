package com.hisabnikash.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class DashboardSummaryResponse {
    private BigDecimal totalBalance;
    private BigDecimal monthlyIncome;
    private BigDecimal monthlyExpenses;
    private BigDecimal remainingBudget;
    private BigDecimal totalSavings;
    private List<CategorySpending> categorySpending;

    @Data
    public static class CategorySpending {
        private String categoryName;
        private String categoryIcon;
        private BigDecimal spent;
        private BigDecimal budgetLimit;
        private String colorHex;
    }
}
