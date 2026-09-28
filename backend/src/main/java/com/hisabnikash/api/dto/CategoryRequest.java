package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class CategoryRequest {
    private String name;
    private String icon;
    private String colorHex;
    private BigDecimal monthlyBudgetCap;
}
