package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.DashboardSummaryResponse;
import com.hisabnikash.api.entity.Transaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.TransactionRepository;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public DashboardController(UserRepository userRepository, WalletRepository walletRepository, TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        DashboardSummaryResponse response = new DashboardSummaryResponse();

        // 1. Total Balance
        List<Wallet> wallets = walletRepository.findByUserIdAndIsArchivedFalse(user.getId());
        BigDecimal totalBalance = wallets.stream()
                .map(Wallet::getCurrentBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        response.setTotalBalance(totalBalance);

        // 2. Monthly Income
        BigDecimal monthlyIncome = user.getMonthlyIncome() != null ? user.getMonthlyIncome() : BigDecimal.ZERO;
        response.setMonthlyIncome(monthlyIncome);

        // 3. Monthly Expenses & Category Spending
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId());
        
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        BigDecimal monthlyExpenses = BigDecimal.ZERO;
        BigDecimal totalSavings = BigDecimal.ZERO;
        
        Map<String, DashboardSummaryResponse.CategorySpending> categoryMap = new HashMap<>();

        for (Transaction tx : transactions) {
            // Only consider current month
            if (!tx.getTransactionDate().isBefore(startOfMonth)) {
                if (tx.getTransactionType() == Transaction.TransactionType.EXPENSE) {
                    monthlyExpenses = monthlyExpenses.add(tx.getConvertedAmount());
                    
                    if (tx.getCategory() != null) {
                        String catName = tx.getCategory().getName();
                        DashboardSummaryResponse.CategorySpending cs = categoryMap.getOrDefault(catName, new DashboardSummaryResponse.CategorySpending());
                        cs.setCategoryName(catName);
                        cs.setCategoryIcon(tx.getCategory().getIcon());
                        cs.setColorHex(tx.getCategory().getColorHex());
                        cs.setBudgetLimit(tx.getCategory().getMonthlyBudgetCap());
                        cs.setSpent(cs.getSpent() != null ? cs.getSpent().add(tx.getConvertedAmount()) : tx.getConvertedAmount());
                        categoryMap.put(catName, cs);
                    }
                } else if (tx.getTransactionType() == Transaction.TransactionType.VAULT_CONTRIBUTION) {
                    totalSavings = totalSavings.add(tx.getConvertedAmount());
                }
            }
        }

        response.setMonthlyExpenses(monthlyExpenses);
        response.setRemainingBudget(monthlyIncome.subtract(monthlyExpenses));
        response.setTotalSavings(totalSavings);
        response.setCategorySpending(categoryMap.values().stream().toList());

        return ResponseEntity.ok(response);
    }
}
