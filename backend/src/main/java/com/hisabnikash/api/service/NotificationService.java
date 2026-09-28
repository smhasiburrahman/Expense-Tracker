package com.hisabnikash.api.service;

import com.hisabnikash.api.dto.NotificationDto;
import com.hisabnikash.api.entity.BudgetCategory;
import com.hisabnikash.api.entity.Currency;
import com.hisabnikash.api.entity.NotificationRead;
import com.hisabnikash.api.entity.SavingsVault;
import com.hisabnikash.api.entity.Transaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final BudgetCategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final SavingsVaultRepository savingsVaultRepository;
    private final TransactionRepository transactionRepository;
    private final NotificationReadRepository notificationReadRepository;
    private final UserRepository userRepository;

    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public NotificationService(BudgetCategoryRepository categoryRepository,
                               WalletRepository walletRepository,
                               SavingsVaultRepository savingsVaultRepository,
                               TransactionRepository transactionRepository,
                               NotificationReadRepository notificationReadRepository,
                               UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.walletRepository = walletRepository;
        this.savingsVaultRepository = savingsVaultRepository;
        this.transactionRepository = transactionRepository;
        this.notificationReadRepository = notificationReadRepository;
        this.userRepository = userRepository;
    }

    /**
     * Generate alerts for the user, verifying user's specific notification toggles:
     * - notifyBudgetAlerts: Over-budget events & category cap warnings & wallet alerts
     * - notifyDailySummary: Daily financial & spending updates
     * - notifyWeeklyReport: Weekly spending digest and category trends
     * - notifySavingsGoals: Savings vault milestones (100%, 75%, 50%, 25%)
     */
    @Transactional(readOnly = true)
    public List<NotificationDto> getNotificationsForUser(User user) {
        if (user == null) {
            return Collections.emptyList();
        }

        // 1. Verify User Specific Notification Toggles
        boolean notifyBudget = user.getNotifyBudgetAlerts() != null && user.getNotifyBudgetAlerts();
        boolean notifyDaily = user.getNotifyDailySummary() != null && user.getNotifyDailySummary();
        boolean notifyWeekly = user.getNotifyWeeklyReport() != null && user.getNotifyWeeklyReport();
        boolean notifySavings = user.getNotifySavingsGoals() != null && user.getNotifySavingsGoals();

        Set<String> readAlertIds = notificationReadRepository.findAlertIdsByUserId(user.getId());
        String currencySymbol = resolveCurrencySymbol(user.getBaseCurrency());

        List<NotificationDto> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // ---------------------------------------------------------------------
        // Category 1: OVER-BUDGET EVENTS & BUDGET ALERTS
        // ---------------------------------------------------------------------
        if (notifyBudget) {
            LocalDate startOfMonth = today.withDayOfMonth(1);
            LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

            List<BudgetCategory> categories = categoryRepository.findByUserId(user.getId());
            boolean hasBudgetCapAlert = false;

            for (BudgetCategory cat : categories) {
                BigDecimal cap = cat.getMonthlyBudgetCap();
                if (cap == null || cap.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                BigDecimal spent = transactionRepository.sumByCategoryAndTypeAndDateBetween(
                        cat.getId(),
                        Transaction.TransactionType.EXPENSE,
                        startOfMonth,
                        endOfMonth
                );
                if (spent == null) spent = BigDecimal.ZERO;

                int percent = spent.multiply(BigDecimal.valueOf(100))
                        .divide(cap, 0, RoundingMode.HALF_UP)
                        .intValue();

                if (percent >= 100) {
                    hasBudgetCapAlert = true;
                    String alertId = "alert-budget-cap-" + cat.getId();
                    BigDecimal overAmount = spent.subtract(cap);
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("budget")
                            .title("Over Budget Alert: " + cat.getName())
                            .category(cat.getName())
                            .amount(spent)
                            .cap(cap)
                            .percent(percent)
                            .message(cat.getName() + " has exceeded its monthly cap of " + currencySymbol + formatAmount(cap) +
                                    (overAmount.compareTo(BigDecimal.ZERO) > 0 ? " by " + currencySymbol + formatAmount(overAmount) : "") +
                                    ". Immediate attention recommended.")
                            .timeAgo("Recent")
                            .timestamp(LocalDateTime.now().minusMinutes(15))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-triangle-exclamation")
                            .link("budgets.html")
                            .severity("danger")
                            .build());
                } else if (percent >= 80) {
                    hasBudgetCapAlert = true;
                    String alertId = "alert-budget-warn-" + cat.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("budget")
                            .title("Budget Warning: " + cat.getName())
                            .category(cat.getName())
                            .amount(spent)
                            .cap(cap)
                            .percent(percent)
                            .message(cat.getName() + " spending has reached " + percent + "% of your " +
                                    currencySymbol + formatAmount(cap) + " monthly limit.")
                            .timeAgo("1h ago")
                            .timestamp(LocalDateTime.now().minusHours(1))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-chart-pie")
                            .link("budgets.html")
                            .severity("warning")
                            .build());
                }
            }

            // Wallet Balance Updates
            List<Wallet> wallets = walletRepository.findByUserId(user.getId());
            for (Wallet wallet : wallets) {
                BigDecimal balance = wallet.getCurrentBalance() != null ? wallet.getCurrentBalance() : BigDecimal.ZERO;
                if (balance.compareTo(BigDecimal.valueOf(1000)) < 0) {
                    String alertId = "alert-wallet-low-" + wallet.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("budget")
                            .title("Low Wallet Balance: " + wallet.getName())
                            .category(wallet.getName())
                            .amount(balance)
                            .message(wallet.getName() + " has a low balance of " + currencySymbol + formatAmount(balance) + ". Consider transferring funds.")
                            .timeAgo("2h ago")
                            .timestamp(LocalDateTime.now().minusHours(2))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-wallet")
                            .link("wallets.html")
                            .severity("warning")
                            .build());
                }
            }
        }

        // ---------------------------------------------------------------------
        // Category 2: DAILY SUMMARIES
        // ---------------------------------------------------------------------
        if (notifyDaily) {
            List<Transaction> todayTxs = transactionRepository.findByUserIdAndTransactionDateBetweenOrderByTransactionDateDesc(
                    user.getId(), today, today
            );

            List<Transaction> todayExpenses = todayTxs.stream()
                    .filter(t -> t.getTransactionType() == Transaction.TransactionType.EXPENSE)
                    .collect(Collectors.toList());

            BigDecimal todayTotal = todayExpenses.stream()
                    .map(Transaction::getConvertedAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String alertId = "alert-daily-summary-" + today;
            if (!todayExpenses.isEmpty()) {
                alerts.add(NotificationDto.builder()
                        .id(alertId)
                        .type("daily")
                        .title("Daily Spending Summary")
                        .amount(todayTotal)
                        .message("Today you have spent " + currencySymbol + formatAmount(todayTotal) +
                                " across " + todayExpenses.size() + " expense transaction(s).")
                        .timeAgo("Today")
                        .timestamp(LocalDateTime.now().minusMinutes(30))
                        .read(readAlertIds.contains(alertId))
                        .icon("fa-solid fa-calendar-day")
                        .link("dashboard.html")
                        .severity("info")
                        .build());
            } else {
                alerts.add(NotificationDto.builder()
                        .id(alertId)
                        .type("daily")
                        .title("Daily Financial Update")
                        .amount(BigDecimal.ZERO)
                        .message("No expenses logged today yet. Excellent progress on controlling your daily spend!")
                        .timeAgo("Today")
                        .timestamp(LocalDateTime.now().minusHours(3))
                        .read(readAlertIds.contains(alertId))
                        .icon("fa-regular fa-calendar-check")
                        .link("dashboard.html")
                        .severity("info")
                        .build());
            }
        }

        // ---------------------------------------------------------------------
        // Category 3: WEEKLY REPORTS
        // ---------------------------------------------------------------------
        if (notifyWeekly) {
            LocalDate startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1); // Monday
            List<Transaction> weekTxs = transactionRepository.findByUserIdAndTransactionDateBetweenOrderByTransactionDateDesc(
                    user.getId(), startOfWeek, today
            );

            List<Transaction> weekExpenses = weekTxs.stream()
                    .filter(t -> t.getTransactionType() == Transaction.TransactionType.EXPENSE)
                    .collect(Collectors.toList());

            BigDecimal weekTotal = weekExpenses.stream()
                    .map(Transaction::getConvertedAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Group by Category to highlight top spending area
            Map<String, BigDecimal> categorySpending = new HashMap<>();
            for (Transaction t : weekExpenses) {
                String catName = t.getCategory() != null ? t.getCategory().getName() : "General";
                BigDecimal amt = t.getConvertedAmount() != null ? t.getConvertedAmount() : BigDecimal.ZERO;
                categorySpending.put(catName, categorySpending.getOrDefault(catName, BigDecimal.ZERO).add(amt));
            }

            String topCategory = categorySpending.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("General");

            String alertId = "alert-weekly-report-" + startOfWeek;
            if (!weekExpenses.isEmpty()) {
                alerts.add(NotificationDto.builder()
                        .id(alertId)
                        .type("weekly")
                        .title("Weekly Spending Report")
                        .amount(weekTotal)
                        .message("This week's spending total is " + currencySymbol + formatAmount(weekTotal) +
                                " across " + weekExpenses.size() + " expense(s). Top category: " + topCategory + ".")
                        .timeAgo("This week")
                        .timestamp(LocalDateTime.now().minusHours(5))
                        .read(readAlertIds.contains(alertId))
                        .icon("fa-solid fa-chart-line")
                        .link("analytics.html")
                        .severity("info")
                        .build());
            } else {
                alerts.add(NotificationDto.builder()
                        .id(alertId)
                        .type("weekly")
                        .title("Weekly Financial Digest")
                        .amount(BigDecimal.ZERO)
                        .message("Zero expenses logged so far this week. Your weekly financial health is excellent!")
                        .timeAgo("This week")
                        .timestamp(LocalDateTime.now().minusHours(6))
                        .read(readAlertIds.contains(alertId))
                        .icon("fa-solid fa-chart-pie")
                        .link("analytics.html")
                        .severity("info")
                        .build());
            }
        }

        // ---------------------------------------------------------------------
        // Category 4: SAVING GOAL MILESTONES
        // ---------------------------------------------------------------------
        if (notifySavings) {
            List<SavingsVault> vaults = savingsVaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());

            for (SavingsVault vault : vaults) {
                BigDecimal target = vault.getTargetAmount();
                BigDecimal current = vault.getInitialSavings() != null ? vault.getInitialSavings() : BigDecimal.ZERO;

                if (target == null || target.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                int percent = current.multiply(BigDecimal.valueOf(100))
                        .divide(target, 0, RoundingMode.HALF_UP)
                        .intValue();

                if (percent >= 100) {
                    String alertId = "alert-savings-milestone-100-" + vault.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("savings")
                            .title("Goal Milestone Reached: " + vault.getName() + " 🎉")
                            .category(vault.getName())
                            .amount(current)
                            .cap(target)
                            .percent(percent)
                            .message("Congratulations! You have reached 100% of your savings goal for " + vault.getName() +
                                    " (" + currencySymbol + formatAmount(current) + " of " + currencySymbol + formatAmount(target) + " saved)!")
                            .timeAgo("Milestone")
                            .timestamp(LocalDateTime.now().minusHours(1))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-trophy")
                            .link("savings.html")
                            .severity("success")
                            .build());
                } else if (percent >= 75) {
                    String alertId = "alert-savings-milestone-75-" + vault.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("savings")
                            .title("Goal Milestone: " + vault.getName())
                            .category(vault.getName())
                            .amount(current)
                            .cap(target)
                            .percent(percent)
                            .message("Outstanding progress! " + vault.getName() + " is at " + percent + "% of target (" +
                                    currencySymbol + formatAmount(current) + " of " + currencySymbol + formatAmount(target) + ").")
                            .timeAgo("Milestone")
                            .timestamp(LocalDateTime.now().minusHours(4))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-piggy-bank")
                            .link("savings.html")
                            .severity("info")
                            .build());
                } else if (percent >= 50) {
                    String alertId = "alert-savings-milestone-50-" + vault.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("savings")
                            .title("Halfway Milestone: " + vault.getName())
                            .category(vault.getName())
                            .amount(current)
                            .cap(target)
                            .percent(percent)
                            .message("You are halfway there! " + vault.getName() + " has reached " + percent + "% of target (" +
                                    currencySymbol + formatAmount(current) + " saved).")
                            .timeAgo("Milestone")
                            .timestamp(LocalDateTime.now().minusHours(6))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-bullseye")
                            .link("savings.html")
                            .severity("info")
                            .build());
                } else if (percent >= 25) {
                    String alertId = "alert-savings-milestone-25-" + vault.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("savings")
                            .title("Savings Milestone: " + vault.getName())
                            .category(vault.getName())
                            .amount(current)
                            .cap(target)
                            .percent(percent)
                            .message("Solid momentum! " + vault.getName() + " has reached " + percent + "% of your target.")
                            .timeAgo("Milestone")
                            .timestamp(LocalDateTime.now().minusHours(8))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-piggy-bank")
                            .link("savings.html")
                            .severity("info")
                            .build());
                } else {
                    String alertId = "alert-savings-status-" + vault.getId();
                    alerts.add(NotificationDto.builder()
                            .id(alertId)
                            .type("savings")
                            .title("Savings Goal: " + vault.getName())
                            .category(vault.getName())
                            .amount(current)
                            .cap(target)
                            .percent(percent)
                            .message(vault.getName() + " currently has " + currencySymbol + formatAmount(current) +
                                    " saved towards " + currencySymbol + formatAmount(target) + " (" + percent + "%).")
                            .timeAgo("Recent")
                            .timestamp(LocalDateTime.now().minusHours(12))
                            .read(readAlertIds.contains(alertId))
                            .icon("fa-solid fa-piggy-bank")
                            .link("savings.html")
                            .severity("info")
                            .build());
                }
            }
        }

        // ---------------------------------------------------------------------
        // Sort: Unread first, then by priority/timestamp descending
        // ---------------------------------------------------------------------
        alerts.sort((a, b) -> {
            boolean aRead = Boolean.TRUE.equals(a.getRead());
            boolean bRead = Boolean.TRUE.equals(b.getRead());
            if (aRead != bRead) {
                return aRead ? 1 : -1; // unread first
            }
            if (a.getTimestamp() != null && b.getTimestamp() != null) {
                return b.getTimestamp().compareTo(a.getTimestamp());
            }
            return 0;
        });

        return alerts;
    }

    @Transactional
    public void markAlertRead(User user, String alertId) {
        if (user == null || alertId == null || alertId.trim().isEmpty()) return;
        if (!notificationReadRepository.existsByUserIdAndAlertId(user.getId(), alertId.trim())) {
            NotificationRead record = new NotificationRead(user, alertId.trim());
            notificationReadRepository.save(record);
            broadcastNotifications(user.getId());
        }
    }

    @Transactional
    public void markAllAlertsRead(User user, List<String> alertIds) {
        if (user == null) return;
        List<String> idsToMark = alertIds;
        if (idsToMark == null || idsToMark.isEmpty()) {
            List<NotificationDto> activeAlerts = getNotificationsForUser(user);
            idsToMark = activeAlerts.stream().map(NotificationDto::getId).collect(Collectors.toList());
        }

        Set<String> alreadyRead = notificationReadRepository.findAlertIdsByUserId(user.getId());
        List<NotificationRead> newRecords = new ArrayList<>();
        for (String id : idsToMark) {
            if (id != null && !alreadyRead.contains(id.trim())) {
                newRecords.add(new NotificationRead(user, id.trim()));
            }
        }
        if (!newRecords.isEmpty()) {
            notificationReadRepository.saveAll(newRecords);
            broadcastNotifications(user.getId());
        }
    }

    /**
     * Create real-time Server-Sent Events stream for connected browser client
     */
    @Transactional(readOnly = true)
    public SseEmitter createEmitter(User user) {
        if (user == null) {
            return null;
        }
        Long userId = user.getId();
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour connection timeout

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // Immediately push current active alerts to this newly connected client
        try {
            List<NotificationDto> currentAlerts = getNotificationsForUser(user);
            emitter.send(SseEmitter.event()
                    .name("notifications")
                    .data(currentAlerts));
        } catch (Exception e) {
            removeEmitter(userId, emitter);
            try {
                emitter.completeWithError(e);
            } catch (Exception ignored) {}
        }

        return emitter;
    }

    public void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> list = userEmitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
    }

    /**
     * Push freshly evaluated alerts immediately to all open tabs for this user
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public void broadcastNotifications(Long userId) {
        if (userId == null) return;
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;

            List<NotificationDto> alerts = getNotificationsForUser(user);
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("notifications")
                            .data(alerts));
                } catch (Throwable e) {
                    removeEmitter(userId, emitter);
                }
            }
        } catch (Throwable t) {
            System.err.println("Warning: broadcastNotifications encountered error: " + t.getMessage());
        }
    }

    public void broadcastNotifications(User user) {
        if (user != null) {
            broadcastNotifications(user.getId());
        }
    }

    /**
     * Heartbeat keep-alive to prevent client timeout disconnects
     */
    @Scheduled(fixedRate = 20000)
    public void heartbeatAndSync() {
        for (Map.Entry<Long, List<SseEmitter>> entry : userEmitters.entrySet()) {
            Long userId = entry.getKey();
            List<SseEmitter> emitters = entry.getValue();
            if (emitters == null || emitters.isEmpty()) continue;

            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (Throwable e) {
                    removeEmitter(userId, emitter);
                }
            }
        }
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0";
        DecimalFormat df = new DecimalFormat("#,##0");
        return df.format(amount);
    }

    private String resolveCurrencySymbol(Currency currency) {
        if (currency == null) return "৳";
        String code = currency.getCurrencyCode();
        if (code == null) return "৳";
        switch (code.toUpperCase()) {
            case "USD": return "$";
            case "EUR": return "€";
            case "GBP": return "£";
            case "CAD": return "C$";
            case "AUD": return "A$";
            case "INR": return "₹";
            case "SAR": return "﷼";
            case "AED": return "د.إ";
            case "JPY": return "¥";
            case "SGD": return "S$";
            case "MYR": return "RM";
            case "BDT":
            default: return "৳";
        }
    }
}
