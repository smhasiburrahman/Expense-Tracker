package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data
public class RecurringTransactionRequest {
    private Long walletId;
    private Long categoryId;
    private String name;
    private String icon;
    private BigDecimal amount;
    private String frequency; // DAILY, WEEKLY, MONTHLY, YEARLY
    private LocalDate nextChargeDate;
}
