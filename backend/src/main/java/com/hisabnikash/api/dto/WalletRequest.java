package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class WalletRequest {
    private String name;
    private String icon;
    private String colorHex;
    private BigDecimal openingBalance;
    private String currencyCode = "BDT";
}
