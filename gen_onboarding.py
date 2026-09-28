import os

BASE_DIR = "backend/src/main/java/com/hisabnikash/api"
CONTROLLER_DIR = os.path.join(BASE_DIR, "controller")
SERVICE_DIR = os.path.join(BASE_DIR, "service")
DTO_DIR = os.path.join(BASE_DIR, "dto")

dto_wallet_req = """package com.hisabnikash.api.dto;
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
"""

dto_category_req = """package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class CategoryRequest {
    private String name;
    private String icon;
    private String colorHex;
    private BigDecimal monthlyBudgetCap;
}
"""

dto_recurring_req = """package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data
public class RecurringTransactionRequest {
    private Long walletId;
    private Long categoryId;
    private String name;
    private String icon;
    private BigDecimal amount;
    private String frequency; // DAILY, WEEKLY, MONTHLY, YEARLY
    private LocalDate nextChargeDate;
}
"""

onboarding_controller = """package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.CategoryRequest;
import com.hisabnikash.api.dto.RecurringTransactionRequest;
import com.hisabnikash.api.dto.WalletRequest;
import com.hisabnikash.api.entity.BudgetCategory;
import com.hisabnikash.api.entity.Currency;
import com.hisabnikash.api.entity.RecurringTransaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.BudgetCategoryRepository;
import com.hisabnikash.api.repository.CurrencyRepository;
import com.hisabnikash.api.repository.RecurringTransactionRepository;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Optional;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final BudgetCategoryRepository categoryRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;
    private final CurrencyRepository currencyRepository;

    public OnboardingController(UserRepository userRepository, WalletRepository walletRepository,
                                BudgetCategoryRepository categoryRepository,
                                RecurringTransactionRepository recurringTransactionRepository,
                                CurrencyRepository currencyRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.categoryRepository = categoryRepository;
        this.recurringTransactionRepository = recurringTransactionRepository;
        this.currencyRepository = currencyRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping("/income")
    public ResponseEntity<?> setMonthlyIncome(@RequestParam BigDecimal income, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        user.setMonthlyIncome(income);
        userRepository.save(user);
        return ResponseEntity.ok("Monthly income updated successfully.");
    }

    @PostMapping("/categories")
    public ResponseEntity<?> addCategory(@RequestBody CategoryRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        BudgetCategory category = new BudgetCategory();
        category.setUser(user);
        category.setName(req.getName());
        category.setIcon(req.getIcon());
        category.setColorHex(req.getColorHex());
        category.setMonthlyBudgetCap(req.getMonthlyBudgetCap());
        
        categoryRepository.save(category);
        return ResponseEntity.ok(category);
    }

    @PostMapping("/wallets")
    public ResponseEntity<?> addWallet(@RequestBody WalletRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Currency currency = currencyRepository.findById(req.getCurrencyCode())
                .orElseThrow(() -> new RuntimeException("Currency not found"));

        Wallet wallet = new Wallet();
        wallet.setUser(user);
        wallet.setName(req.getName());
        wallet.setIcon(req.getIcon());
        wallet.setColorHex(req.getColorHex());
        wallet.setCurrency(currency);
        wallet.setOpeningBalance(req.getOpeningBalance());
        wallet.setCurrentBalance(req.getOpeningBalance());
        
        walletRepository.save(wallet);
        return ResponseEntity.ok(wallet);
    }

    @PostMapping("/recurring")
    public ResponseEntity<?> addRecurringTransaction(@RequestBody RecurringTransactionRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Wallet wallet = walletRepository.findById(req.getWalletId())
                .orElseThrow(() -> new RuntimeException("Wallet not found"));
        
        BudgetCategory category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepository.findById(req.getCategoryId()).orElse(null);
        }

        RecurringTransaction rt = new RecurringTransaction();
        rt.setUser(user);
        rt.setWallet(wallet);
        rt.setCategory(category);
        rt.setName(req.getName());
        rt.setIcon(req.getIcon());
        rt.setAmount(req.getAmount());
        rt.setFrequency(RecurringTransaction.Frequency.valueOf(req.getFrequency()));
        rt.setNextChargeDate(req.getNextChargeDate());
        
        recurringTransactionRepository.save(rt);
        return ResponseEntity.ok(rt);
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeOnboarding(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        user.setOnboardingCompletedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok("Onboarding completed.");
    }
}
"""

with open(os.path.join(DTO_DIR, "WalletRequest.java"), "w") as f: f.write(dto_wallet_req)
with open(os.path.join(DTO_DIR, "CategoryRequest.java"), "w") as f: f.write(dto_category_req)
with open(os.path.join(DTO_DIR, "RecurringTransactionRequest.java"), "w") as f: f.write(dto_recurring_req)
with open(os.path.join(CONTROLLER_DIR, "OnboardingController.java"), "w") as f: f.write(onboarding_controller)

print("Onboarding APIs generated successfully.")
