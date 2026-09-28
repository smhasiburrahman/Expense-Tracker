package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SavingsVaultDepositRequest {
    private BigDecimal amount;
    private Long walletId;
}
