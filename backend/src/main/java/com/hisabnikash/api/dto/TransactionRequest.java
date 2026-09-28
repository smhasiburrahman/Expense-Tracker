package com.hisabnikash.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TransactionRequest {
    private String transactionType; // EXPENSE, VAULT_CONTRIBUTION, SADAQA_CONTRIBUTION
    private Long walletId;
    private Long categoryId;
    private Long vaultId;
    private BigDecimal amount;
    private String description;
    private LocalDate transactionDate;
    private String sourceNote;
}
