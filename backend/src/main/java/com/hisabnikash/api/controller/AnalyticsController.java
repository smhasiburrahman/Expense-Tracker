package com.hisabnikash.api.controller;

import com.hisabnikash.api.entity.BudgetCategory;
import com.hisabnikash.api.entity.RecurringTransaction;
import com.hisabnikash.api.entity.Transaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.BudgetCategoryRepository;
import com.hisabnikash.api.repository.RecurringTransactionRepository;
import com.hisabnikash.api.repository.SavingsVaultRepository;
import com.hisabnikash.api.repository.TransactionRepository;
import com.hisabnikash.api.repository.UserRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@Transactional
public class AnalyticsController {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetCategoryRepository categoryRepository;
    private final RecurringTransactionRepository recurringRepository;
    private final SavingsVaultRepository vaultRepository;

    public AnalyticsController(UserRepository userRepository,
                               TransactionRepository transactionRepository,
                               BudgetCategoryRepository categoryRepository,
                               RecurringTransactionRepository recurringRepository,
                               SavingsVaultRepository vaultRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.recurringRepository = recurringRepository;
        this.vaultRepository = vaultRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> getAnalytics(
            @RequestParam(defaultValue = "monthly") String filter,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);
        LocalDate today = LocalDate.now();

        // 1. Determine Selected Timeframe
        if ("weekly".equalsIgnoreCase(filter)) {
            startDate = today.minusDays(6);
            endDate = today;
        } else if ("monthly".equalsIgnoreCase(filter)) {
            startDate = today.withDayOfMonth(1);
            endDate = today.withDayOfMonth(today.lengthOfMonth());
        } else {
            // custom range
            if (startDate == null) startDate = today.minusDays(29);
            if (endDate == null) endDate = today;
            if (startDate.isAfter(endDate)) {
                LocalDate temp = startDate;
                startDate = endDate;
                endDate = temp;
            }
        }

        long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        DateTimeFormatter rangeFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy");
        String formattedRange = startDate.format(rangeFormatter) + " — " + endDate.format(rangeFormatter);

        // 2. Fetch Transactions Strictly Within Selected Range
        List<Transaction> periodTransactions = transactionRepository
                .findByUserIdAndTransactionDateBetweenOrderByTransactionDateDesc(user.getId(), startDate, endDate);

        // Filter Expense Transactions
        List<Transaction> expenseTransactions = periodTransactions.stream()
                .filter(t -> t.getTransactionType() == Transaction.TransactionType.EXPENSE)
                .collect(Collectors.toList());

        BigDecimal totalPeriodExpense = expenseTransactions.stream()
                .map(Transaction::getConvertedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Spending by Category (Donut Chart & Breakdown)
        String[] fallbackColors = new String[]{"#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"};
        Map<String, Map<String, Object>> catMap = new LinkedHashMap<>();

        int colorIdx = 0;
        for (Transaction tx : expenseTransactions) {
            String catName = tx.getCategory() != null ? tx.getCategory().getName() : "General / Others";
            String catColor = tx.getCategory() != null && tx.getCategory().getColorHex() != null
                    ? tx.getCategory().getColorHex()
                    : fallbackColors[colorIdx % fallbackColors.length];
            String catIcon = tx.getCategory() != null ? tx.getCategory().getIcon() : "receipt";

            if (!catMap.containsKey(catName)) {
                Map<String, Object> item = new HashMap<>();
                item.put("name", catName);
                item.put("color", catColor);
                item.put("icon", catIcon);
                item.put("amount", BigDecimal.ZERO);
                catMap.put(catName, item);
                colorIdx++;
            }

            Map<String, Object> item = catMap.get(catName);
            BigDecimal currentAmt = (BigDecimal) item.get("amount");
            item.put("amount", currentAmt.add(tx.getConvertedAmount()));
        }

        List<Map<String, Object>> categoryList = new ArrayList<>(catMap.values());
        // Sort descending by amount
        categoryList.sort((a, b) -> ((BigDecimal) b.get("amount")).compareTo((BigDecimal) a.get("amount")));

        for (Map<String, Object> item : categoryList) {
            BigDecimal amt = (BigDecimal) item.get("amount");
            int percent = totalPeriodExpense.compareTo(BigDecimal.ZERO) > 0
                    ? amt.multiply(BigDecimal.valueOf(100)).divide(totalPeriodExpense, 0, RoundingMode.HALF_UP).intValue()
                    : 0;
            item.put("percent", percent);
        }

        Map<String, Object> donutOverview = new HashMap<>();
        donutOverview.put("title", "Spending by Category");
        donutOverview.put("subtitle", formattedRange + " · ৳" + String.format("%,.0f", totalPeriodExpense) + " total");
        donutOverview.put("totalAmount", totalPeriodExpense);
        donutOverview.put("categories", categoryList);

        // 4. Spending Trend Graph (Strictly Filtered by Timeframe)
        List<BudgetCategory> userCategories = categoryRepository.findByUserId(user.getId());
        List<String> topCategories = categoryList.stream()
                .map(c -> (String) c.get("name"))
                .limit(4)
                .collect(Collectors.toList());

        if (topCategories.isEmpty()) {
            topCategories = userCategories.stream().map(BudgetCategory::getName).limit(4).collect(Collectors.toList());
        }
        if (topCategories.isEmpty()) {
            topCategories = List.of("Food & Dining", "Shopping", "Groceries", "Utilities");
        }

        Map<String, String> catColorMap = new HashMap<>();
        for (BudgetCategory bc : userCategories) {
            if (bc.getColorHex() != null) catColorMap.put(bc.getName(), bc.getColorHex());
        }

        List<String> trendLabels = new ArrayList<>();
        List<Map<String, Object>> trendDatasets = new ArrayList<>();
        String trendTitle = "Spending Trend";
        String trendSubtitle = formattedRange;

        if ("weekly".equalsIgnoreCase(filter) || totalDays <= 14) {
            // Group by Day
            trendTitle = "Daily Spending Trend";
            trendSubtitle = formattedRange + " · daily by category";
            DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("EEE, MMM d");

            List<LocalDate> days = new ArrayList<>();
            for (int i = 0; i < totalDays; i++) {
                LocalDate d = startDate.plusDays(i);
                days.add(d);
                trendLabels.add(d.format(dayFmt));
            }

            int cIdx = 0;
            for (String cat : topCategories) {
                String color = catColorMap.getOrDefault(cat, fallbackColors[cIdx % fallbackColors.length]);
                cIdx++;
                List<BigDecimal> dataPoints = new ArrayList<>();

                for (LocalDate d : days) {
                    BigDecimal daySum = expenseTransactions.stream()
                            .filter(t -> t.getTransactionDate().equals(d))
                            .filter(t -> (t.getCategory() != null && t.getCategory().getName().equalsIgnoreCase(cat))
                                    || (t.getCategory() == null && "General / Others".equalsIgnoreCase(cat)))
                            .map(Transaction::getConvertedAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    dataPoints.add(daySum);
                }

                Map<String, Object> ds = new HashMap<>();
                ds.put("label", cat);
                ds.put("data", dataPoints);
                ds.put("backgroundColor", color);
                trendDatasets.add(ds);
            }

            // Others dataset
            List<BigDecimal> othersData = new ArrayList<>();
            final List<String> fTopCats = topCategories;
            for (LocalDate d : days) {
                BigDecimal othersSum = expenseTransactions.stream()
                        .filter(t -> t.getTransactionDate().equals(d))
                        .filter(t -> t.getCategory() == null || !fTopCats.contains(t.getCategory().getName()))
                        .map(Transaction::getConvertedAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                othersData.add(othersSum);
            }
            Map<String, Object> othersDs = new HashMap<>();
            othersDs.put("label", "Others");
            othersDs.put("data", othersData);
            othersDs.put("backgroundColor", "#cbd5e1");
            trendDatasets.add(othersDs);

        } else if ("monthly".equalsIgnoreCase(filter) || totalDays <= 60) {
            // Group by Week Intervals (e.g. Week 1, Week 2, Week 3, Week 4, Week 5)
            trendTitle = "Weekly Spending Trend";
            trendSubtitle = formattedRange + " · weekly by category";

            // Slices of 7 days
            List<LocalDate> sliceStarts = new ArrayList<>();
            List<LocalDate> sliceEnds = new ArrayList<>();

            LocalDate cur = startDate;
            int weekNum = 1;
            while (!cur.isAfter(endDate)) {
                LocalDate sEnd = cur.plusDays(6);
                if (sEnd.isAfter(endDate)) sEnd = endDate;

                sliceStarts.add(cur);
                sliceEnds.add(sEnd);
                trendLabels.add("Week " + weekNum + " (" + cur.getDayOfMonth() + "-" + sEnd.getDayOfMonth() + ")");

                cur = sEnd.plusDays(1);
                weekNum++;
            }

            int cIdx = 0;
            for (String cat : topCategories) {
                String color = catColorMap.getOrDefault(cat, fallbackColors[cIdx % fallbackColors.length]);
                cIdx++;
                List<BigDecimal> dataPoints = new ArrayList<>();

                for (int i = 0; i < sliceStarts.size(); i++) {
                    LocalDate s = sliceStarts.get(i);
                    LocalDate e = sliceEnds.get(i);

                    BigDecimal weekSum = expenseTransactions.stream()
                            .filter(t -> !t.getTransactionDate().isBefore(s) && !t.getTransactionDate().isAfter(e))
                            .filter(t -> (t.getCategory() != null && t.getCategory().getName().equalsIgnoreCase(cat))
                                    || (t.getCategory() == null && "General / Others".equalsIgnoreCase(cat)))
                            .map(Transaction::getConvertedAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    dataPoints.add(weekSum);
                }

                Map<String, Object> ds = new HashMap<>();
                ds.put("label", cat);
                ds.put("data", dataPoints);
                ds.put("backgroundColor", color);
                trendDatasets.add(ds);
            }

            // Others dataset
            List<BigDecimal> othersData = new ArrayList<>();
            final List<String> fTopCats = topCategories;
            for (int i = 0; i < sliceStarts.size(); i++) {
                LocalDate s = sliceStarts.get(i);
                LocalDate e = sliceEnds.get(i);

                BigDecimal othersSum = expenseTransactions.stream()
                        .filter(t -> !t.getTransactionDate().isBefore(s) && !t.getTransactionDate().isAfter(e))
                        .filter(t -> t.getCategory() == null || !fTopCats.contains(t.getCategory().getName()))
                        .map(Transaction::getConvertedAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                othersData.add(othersSum);
            }
            Map<String, Object> othersDs = new HashMap<>();
            othersDs.put("label", "Others");
            othersDs.put("data", othersData);
            othersDs.put("backgroundColor", "#cbd5e1");
            trendDatasets.add(othersDs);

        } else {
            // Group by Month (for multi-month custom ranges)
            trendTitle = "Monthly Spending Trend";
            trendSubtitle = formattedRange + " · monthly by category";

            YearMonth startYm = YearMonth.from(startDate);
            YearMonth endYm = YearMonth.from(endDate);
            List<YearMonth> months = new ArrayList<>();

            YearMonth mCur = startYm;
            while (!mCur.isAfter(endYm)) {
                months.add(mCur);
                trendLabels.add(mCur.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + mCur.getYear());
                mCur = mCur.plusMonths(1);
            }

            int cIdx = 0;
            for (String cat : topCategories) {
                String color = catColorMap.getOrDefault(cat, fallbackColors[cIdx % fallbackColors.length]);
                cIdx++;
                List<BigDecimal> dataPoints = new ArrayList<>();

                for (YearMonth ym : months) {
                    LocalDate mStart = ym.atDay(1);
                    LocalDate mEnd = ym.atEndOfMonth();
                    if (mStart.isBefore(startDate)) mStart = startDate;
                    if (mEnd.isAfter(endDate)) mEnd = endDate;

                    final LocalDate ms = mStart;
                    final LocalDate me = mEnd;

                    BigDecimal sum = expenseTransactions.stream()
                            .filter(t -> !t.getTransactionDate().isBefore(ms) && !t.getTransactionDate().isAfter(me))
                            .filter(t -> (t.getCategory() != null && t.getCategory().getName().equalsIgnoreCase(cat))
                                    || (t.getCategory() == null && "General / Others".equalsIgnoreCase(cat)))
                            .map(Transaction::getConvertedAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    dataPoints.add(sum);
                }

                Map<String, Object> ds = new HashMap<>();
                ds.put("label", cat);
                ds.put("data", dataPoints);
                ds.put("backgroundColor", color);
                trendDatasets.add(ds);
            }

            // Others dataset
            List<BigDecimal> othersData = new ArrayList<>();
            final List<String> fTopCats = topCategories;
            for (YearMonth ym : months) {
                LocalDate mStart = ym.atDay(1);
                LocalDate mEnd = ym.atEndOfMonth();
                if (mStart.isBefore(startDate)) mStart = startDate;
                if (mEnd.isAfter(endDate)) mEnd = endDate;

                final LocalDate ms = mStart;
                final LocalDate me = mEnd;

                BigDecimal othersSum = expenseTransactions.stream()
                        .filter(t -> !t.getTransactionDate().isBefore(ms) && !t.getTransactionDate().isAfter(me))
                        .filter(t -> t.getCategory() == null || !fTopCats.contains(t.getCategory().getName()))
                        .map(Transaction::getConvertedAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                othersData.add(othersSum);
            }
            Map<String, Object> othersDs = new HashMap<>();
            othersDs.put("label", "Others");
            othersDs.put("data", othersData);
            othersDs.put("backgroundColor", "#cbd5e1");
            trendDatasets.add(othersDs);
        }

        Map<String, Object> trendOverview = new HashMap<>();
        trendOverview.put("title", trendTitle);
        trendOverview.put("subtitle", trendSubtitle);
        trendOverview.put("labels", trendLabels);
        trendOverview.put("datasets", trendDatasets);

        // 5. Dynamic AI Insights (Strictly Based on Selected Timeframe)
        List<Map<String, Object>> insights = new ArrayList<>();
        BigDecimal income = user.getMonthlyIncome() != null ? user.getMonthlyIncome() : BigDecimal.ZERO;
        BigDecimal proportionalIncome = income.multiply(BigDecimal.valueOf(totalDays)).divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);

        // A. Spending Anomaly (Based strictly on this timeframe)
        Map<String, Object> anomalyInsight = new HashMap<>();
        anomalyInsight.put("title", "Spending Anomaly");

        BudgetCategory anomalyCat = null;
        BigDecimal highestSpent = BigDecimal.ZERO;
        BigDecimal highestRatio = BigDecimal.ZERO;

        for (BudgetCategory cat : userCategories) {
            BigDecimal catSpent = expenseTransactions.stream()
                    .filter(t -> t.getCategory() != null && t.getCategory().getId().equals(cat.getId()))
                    .map(Transaction::getConvertedAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal cap = cat.getMonthlyBudgetCap() != null ? cat.getMonthlyBudgetCap() : BigDecimal.ZERO;
            // Pro-rate cap for this timeframe
            BigDecimal timeframeCap = cap.multiply(BigDecimal.valueOf(totalDays)).divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);

            if (timeframeCap.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal ratio = catSpent.divide(timeframeCap, 4, RoundingMode.HALF_UP);
                if (ratio.compareTo(highestRatio) > 0) {
                    highestRatio = ratio;
                    anomalyCat = cat;
                    highestSpent = catSpent;
                }
            }
        }

        if (totalPeriodExpense.compareTo(BigDecimal.ZERO) == 0) {
            anomalyInsight.put("desc", "No expenses recorded in this " + totalDays + "-day window (" + formattedRange + "). Excellent spending control.");
            anomalyInsight.put("icon", "fa-shield-heart");
            anomalyInsight.put("btnText", "View Budgets");
            anomalyInsight.put("btnColor", "#10b981");
            anomalyInsight.put("iconBg", "#d1fae5");
            anomalyInsight.put("iconColor", "#10b981");
            anomalyInsight.put("actionUrl", "budgets.html");
        } else if (anomalyCat != null && highestRatio.compareTo(BigDecimal.valueOf(1.0)) >= 0) {
            int pct = highestRatio.multiply(BigDecimal.valueOf(100)).intValue();
            anomalyInsight.put("desc", anomalyCat.getName() + " spent ৳" + String.format("%,.0f", highestSpent) + " (" + pct + "% of proportional cap) in this timeframe — Anomaly alert!");
            anomalyInsight.put("icon", "fa-triangle-exclamation");
            anomalyInsight.put("btnText", "Review Budget");
            anomalyInsight.put("btnColor", "#ef4444");
            anomalyInsight.put("iconBg", "#fee2e2");
            anomalyInsight.put("iconColor", "#ef4444");
            anomalyInsight.put("actionUrl", "budgets.html");
        } else if (anomalyCat != null && highestRatio.compareTo(BigDecimal.valueOf(0.80)) >= 0) {
            int pct = highestRatio.multiply(BigDecimal.valueOf(100)).intValue();
            anomalyInsight.put("desc", anomalyCat.getName() + " reached " + pct + "% of its proportional allowance (৳" + String.format("%,.0f", highestSpent) + ") in this period.");
            anomalyInsight.put("icon", "fa-triangle-exclamation");
            anomalyInsight.put("btnText", "Review");
            anomalyInsight.put("btnColor", "#ea580c");
            anomalyInsight.put("iconBg", "#ffedd5");
            anomalyInsight.put("iconColor", "#ea580c");
            anomalyInsight.put("actionUrl", "budgets.html");
        } else {
            anomalyInsight.put("desc", "All categories remained well-balanced and within budget limits during this " + totalDays + "-day timeframe.");
            anomalyInsight.put("icon", "fa-circle-check");
            anomalyInsight.put("btnText", "View Budgets");
            anomalyInsight.put("btnColor", "#10b981");
            anomalyInsight.put("iconBg", "#d1fae5");
            anomalyInsight.put("iconColor", "#10b981");
            anomalyInsight.put("actionUrl", "budgets.html");
        }
        insights.add(anomalyInsight);

        // B. Budget Forecast (Strictly from timeframe burn rate)
        Map<String, Object> forecastInsight = new HashMap<>();
        forecastInsight.put("title", "Budget Forecast");

        BigDecimal dailyBurn = totalPeriodExpense.divide(BigDecimal.valueOf(Math.max(totalDays, 1)), 2, RoundingMode.HALF_UP);
        BigDecimal projectedMonthEnd = dailyBurn.multiply(BigDecimal.valueOf(30)).setScale(0, RoundingMode.HALF_UP);

        if (totalPeriodExpense.compareTo(BigDecimal.ZERO) == 0) {
            forecastInsight.put("desc", "Zero expenses incurred in this timeframe (৳0/day). Maintaining this pace maximizes your monthly savings.");
            forecastInsight.put("icon", "fa-chart-line");
            forecastInsight.put("btnText", "View Dashboard");
            forecastInsight.put("btnColor", "#10b981");
            forecastInsight.put("iconBg", "#d1fae5");
            forecastInsight.put("iconColor", "#10b981");
            forecastInsight.put("actionUrl", "dashboard.html");
        } else if (income.compareTo(BigDecimal.ZERO) > 0 && totalPeriodExpense.compareTo(proportionalIncome) > 0) {
            BigDecimal over = totalPeriodExpense.subtract(proportionalIncome);
            forecastInsight.put("desc", "At ৳" + String.format("%,.0f", dailyBurn) + "/day in this window, spending (৳" + String.format("%,.0f", totalPeriodExpense) + ") exceeded proportional income by ৳" + String.format("%,.0f", over) + ".");
            forecastInsight.put("icon", "fa-chart-line");
            forecastInsight.put("btnText", "Adjust Budget");
            forecastInsight.put("btnColor", "#ef4444");
            forecastInsight.put("iconBg", "#fee2e2");
            forecastInsight.put("iconColor", "#ef4444");
            forecastInsight.put("actionUrl", "budgets.html");
        } else {
            BigDecimal surplus = income.compareTo(BigDecimal.ZERO) > 0 ? proportionalIncome.subtract(totalPeriodExpense) : BigDecimal.ZERO;
            forecastInsight.put("desc", "Spending pace was ৳" + String.format("%,.0f", dailyBurn) + "/day in this window (৳" + String.format("%,.0f", surplus) + " proportional surplus against income).");
            forecastInsight.put("icon", "fa-chart-line");
            forecastInsight.put("btnText", "View Dashboard");
            forecastInsight.put("btnColor", "#10b981");
            forecastInsight.put("iconBg", "#d1fae5");
            forecastInsight.put("iconColor", "#10b981");
            forecastInsight.put("actionUrl", "dashboard.html");
        }
        insights.add(forecastInsight);

        // C. Subscription Audit (Strictly from this timeframe)
        Map<String, Object> subInsight = new HashMap<>();
        subInsight.put("title", "Subscription Audit");
        List<RecurringTransaction> allRecurring = recurringRepository.findByUserId(user.getId());

        final LocalDate fStart = startDate;
        final LocalDate fEnd = endDate;
        List<RecurringTransaction> timeframeRecurring = allRecurring.stream()
                .filter(r -> r.getStatus() == RecurringTransaction.Status.ACTIVE && r.getDeletedAt() == null)
                .filter(r -> r.getNextChargeDate() != null && !r.getNextChargeDate().isBefore(fStart) && !r.getNextChargeDate().isAfter(fEnd))
                .collect(Collectors.toList());

        BigDecimal timeframeRecurringTotal = timeframeRecurring.stream()
                .map(RecurringTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (!timeframeRecurring.isEmpty()) {
            subInsight.put("desc", timeframeRecurring.size() + " recurring subscription charge" + (timeframeRecurring.size() > 1 ? "s were" : " was") + " scheduled in this timeframe totaling ৳" + String.format("%,.0f", timeframeRecurringTotal) + ".");
            subInsight.put("icon", "fa-credit-card");
            subInsight.put("btnText", "Review Subs");
            subInsight.put("btnColor", "#2563eb");
            subInsight.put("iconBg", "#dbeafe");
            subInsight.put("iconColor", "#2563eb");
            subInsight.put("actionUrl", "budgets.html");
        } else {
            subInsight.put("desc", "0 recurring subscription charges scheduled within this " + totalDays + "-day window (" + formattedRange + ").");
            subInsight.put("icon", "fa-credit-card");
            subInsight.put("btnText", "Manage Subs");
            subInsight.put("btnColor", "#2563eb");
            subInsight.put("iconBg", "#dbeafe");
            subInsight.put("iconColor", "#2563eb");
            subInsight.put("actionUrl", "budgets.html");
        }
        insights.add(subInsight);

        // D. Price Benchmarking (Strictly from this timeframe)
        Map<String, Object> benchmarkInsight = new HashMap<>();
        benchmarkInsight.put("title", "Price Benchmarking");
        if (income.compareTo(BigDecimal.ZERO) > 0 && proportionalIncome.compareTo(BigDecimal.ZERO) > 0) {
            int expenseRatio = totalPeriodExpense.multiply(BigDecimal.valueOf(100)).divide(proportionalIncome, 0, RoundingMode.HALF_UP).intValue();
            benchmarkInsight.put("desc", "In this timeframe, expenses consumed " + expenseRatio + "% of proportional income. Guideline: Keep needs ≤50%, wants ≤30%, savings ≥20%.");
            benchmarkInsight.put("icon", "fa-wand-magic-sparkles");
            benchmarkInsight.put("btnText", "AI Guidance");
            benchmarkInsight.put("btnColor", "#10b981");
            benchmarkInsight.put("iconBg", "#d1fae5");
            benchmarkInsight.put("iconColor", "#10b981");
            benchmarkInsight.put("actionUrl", "ai-bestie.html");
        } else {
            benchmarkInsight.put("desc", "Set your monthly income in Settings to enable real-time financial health benchmarks for any timeframe.");
            benchmarkInsight.put("icon", "fa-wand-magic-sparkles");
            benchmarkInsight.put("btnText", "Set Income");
            benchmarkInsight.put("btnColor", "#8b5cf6");
            benchmarkInsight.put("iconBg", "#ede9fe");
            benchmarkInsight.put("iconColor", "#8b5cf6");
            benchmarkInsight.put("actionUrl", "settings.html");
        }
        insights.add(benchmarkInsight);

        // 6. Detailed Transactions for Export
        List<Map<String, Object>> txDetails = periodTransactions.stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("date", t.getTransactionDate() != null ? t.getTransactionDate().toString() : "");
            m.put("description", t.getDescription() != null ? t.getDescription() : "");
            m.put("category", t.getCategory() != null ? t.getCategory().getName() : "General");
            m.put("wallet", t.getWallet() != null ? t.getWallet().getName() : "-");
            m.put("amount", t.getConvertedAmount());
            m.put("type", t.getTransactionType() != null ? t.getTransactionType().name() : "EXPENSE");
            return m;
        }).collect(Collectors.toList());

        // 7. Assemble Final Response
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", user.getFullName() != null ? user.getFullName() : "User");
        userInfo.put("email", user.getEmail());
        String initial = (user.getFullName() != null && !user.getFullName().isEmpty())
                ? user.getFullName().substring(0, 1).toUpperCase()
                : "U";
        userInfo.put("avatarInitial", initial);

        response.put("user", userInfo);
        response.put("filter", filter.toLowerCase());
        response.put("startDate", startDate.toString());
        response.put("endDate", endDate.toString());
        response.put("dateRange", formattedRange);
        response.put("totalDays", totalDays);
        response.put("donutOverview", donutOverview);
        response.put("trendOverview", trendOverview);
        response.put("insights", insights);
        response.put("transactions", txDetails);

        return ResponseEntity.ok(response);
    }
}
