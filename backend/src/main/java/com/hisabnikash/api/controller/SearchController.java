package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.SearchResponse;
import com.hisabnikash.api.entity.BudgetCategory;
import com.hisabnikash.api.entity.Transaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.entity.SavingsVault;
import com.hisabnikash.api.repository.BudgetCategoryRepository;
import com.hisabnikash.api.repository.SavingsVaultRepository;
import com.hisabnikash.api.repository.TransactionRepository;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/search")
@Transactional
public class SearchController {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetCategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final SavingsVaultRepository vaultRepository;

    public SearchController(UserRepository userRepository,
                            TransactionRepository transactionRepository,
                            BudgetCategoryRepository categoryRepository,
                            WalletRepository walletRepository,
                            SavingsVaultRepository vaultRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.walletRepository = walletRepository;
        this.vaultRepository = vaultRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @RequestParam(value = "q", required = false) String query,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        String trimmed = query != null ? query.trim() : "";

        List<Transaction> transactions;
        List<BudgetCategory> categories;
        List<Wallet> wallets;

        if (trimmed.isEmpty()) {
            transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId());
            categories = categoryRepository.findByUserId(user.getId());
            wallets = walletRepository.findByUserIdAndIsArchivedFalse(user.getId());
        } else {
            transactions = transactionRepository.searchTransactions(user.getId(), trimmed);
            categories = categoryRepository.searchCategories(user.getId(), trimmed);
            wallets = walletRepository.searchWallets(user.getId(), trimmed);
        }

        LocalDate startDate = LocalDate.now().withDayOfMonth(1);
        LocalDate endDate = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        List<SavingsVault> userVaults = vaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());
        List<SearchResponse.TransactionResult> txResults = new ArrayList<>();
        for (Transaction t : transactions) {
            SearchResponse.TransactionResult r = new SearchResponse.TransactionResult();
            r.setId(t.getId());
            r.setDescription(t.getDescription());
            if (t.getCategory() != null) {
                r.setCategoryId(t.getCategory().getId());
                r.setCategoryName(t.getCategory().getName());
                r.setCategoryIcon(t.getCategory().getIcon());
                r.setCategoryColor(t.getCategory().getColorHex());
            } else if (t.getTransactionType() == Transaction.TransactionType.SADAQA_CONTRIBUTION) {
                r.setCategoryName("Charity / Sadaqa");
                r.setCategoryIcon("hand-holding-heart");
                r.setCategoryColor("#ea580c");
            } else if (t.getTransactionType() == Transaction.TransactionType.VAULT_CONTRIBUTION) {
                r.setCategoryName("Savings Vault");
                r.setCategoryIcon("piggy-bank");
                r.setCategoryColor("#10b981");
            } else {
                r.setCategoryName("General");
                r.setCategoryIcon("receipt");
                r.setCategoryColor("#64748b");
            }

            if (t.getVault() != null) {
                r.setVaultId(t.getVault().getId());
                r.setVaultName(t.getVault().getName());
            } else if (t.getTransactionType() == Transaction.TransactionType.VAULT_CONTRIBUTION) {
                String desc = t.getDescription();
                if (desc != null && userVaults != null) {
                    for (SavingsVault v : userVaults) {
                        String vName = v.getName().trim().toLowerCase();
                        String descLower = desc.toLowerCase();
                        if (descLower.contains(vName) || descLower.equals(vName) || descLower.endsWith("to " + vName)) {
                            r.setVaultId(v.getId());
                            r.setVaultName(v.getName());
                            break;
                        }
                    }
                }
            }

            if (t.getWallet() != null) {
                r.setWalletId(t.getWallet().getId());
                r.setWalletName(t.getWallet().getName());
                r.setWalletIcon(t.getWallet().getIcon());
                r.setWalletColor(t.getWallet().getColorHex());
            }

            r.setAmount(t.getConvertedAmount());
            r.setTransactionType(t.getTransactionType() != null ? t.getTransactionType().name() : "EXPENSE");
            r.setEntryMethod(t.getEntryMethod() != null ? t.getEntryMethod().name() : "MANUAL");
            r.setDate(t.getTransactionDate());
            r.setSourceNote(t.getSourceNote());
            txResults.add(r);
        }

        List<SearchResponse.CategoryResult> catResults = new ArrayList<>();
        for (BudgetCategory c : categories) {
            SearchResponse.CategoryResult r = new SearchResponse.CategoryResult();
            r.setId(c.getId());
            r.setName(c.getName());
            r.setIcon(c.getIcon());
            r.setColorHex(c.getColorHex());
            r.setMonthlyBudgetCap(c.getMonthlyBudgetCap());

            BigDecimal spent = transactionRepository.sumByCategoryAndTypeAndDateBetween(
                    c.getId(), Transaction.TransactionType.EXPENSE, startDate, endDate);
            r.setSpent(spent != null ? spent : BigDecimal.ZERO);

            BigDecimal cap = c.getMonthlyBudgetCap() != null ? c.getMonthlyBudgetCap() : BigDecimal.ZERO;
            long progress = 0;
            if (cap.compareTo(BigDecimal.ZERO) > 0) {
                progress = Math.min((r.getSpent().longValue() * 100) / cap.longValue(), 100);
            }
            r.setProgress(progress);
            if (cap.compareTo(BigDecimal.ZERO) > 0 && r.getSpent().compareTo(cap) >= 0) {
                r.setStatus("Over Budget");
                r.setStatusClass("badge-danger");
            } else if (progress >= 80) {
                r.setStatus("Warning");
                r.setStatusClass("badge-warning");
            } else {
                r.setStatus("On Track");
                r.setStatusClass("badge-on-track");
            }
            catResults.add(r);
        }

        List<SearchResponse.WalletResult> walletResults = new ArrayList<>();
        for (Wallet w : wallets) {
            SearchResponse.WalletResult r = new SearchResponse.WalletResult();
            r.setId(w.getId());
            r.setName(w.getName());
            r.setIcon(w.getIcon());
            r.setColorHex(w.getColorHex());
            r.setCurrentBalance(w.getCurrentBalance());
            r.setOpeningBalance(w.getOpeningBalance());
            r.setCurrencyCode(w.getCurrency() != null ? w.getCurrency().getCurrencyCode() : "BDT");
            walletResults.add(r);
        }

        SearchResponse response = new SearchResponse();
        response.setQuery(trimmed);
        response.setTransactions(txResults);
        response.setCategories(catResults);
        response.setWallets(walletResults);
        response.setTotalMatches(txResults.size() + catResults.size() + walletResults.size());

        return ResponseEntity.ok(response);
    }
}
