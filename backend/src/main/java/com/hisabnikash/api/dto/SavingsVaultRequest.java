package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SavingsVaultRequest {
    private String name;
    private BigDecimal targetAmount;
    private LocalDate targetDate;
    private String emoji;
    private String colorHex;
}
