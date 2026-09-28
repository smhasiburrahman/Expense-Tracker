package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    private String baseCurrencyCode = "BDT";
    private BigDecimal monthlyIncome;
}
