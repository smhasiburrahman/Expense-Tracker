package com.hisabnikash.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private String id;
    private String type;         // "budget", "daily", "weekly", "savings"
    private String title;
    private String message;
    private String category;
    private BigDecimal amount;
    private BigDecimal cap;
    private Integer percent;
    private String timeAgo;
    private LocalDateTime timestamp;
    private Boolean read;
    private String icon;
    private String link;
    private String severity;     // "danger", "warning", "info", "success"
}
