package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.TransactionRequest;
import com.hisabnikash.api.entity.BudgetCategory;
import com.hisabnikash.api.entity.SavingsVault;
import com.hisabnikash.api.entity.Transaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.BudgetCategoryRepository;
import com.hisabnikash.api.repository.SavingsVaultRepository;
import com.hisabnikash.api.entity.Currency;
import com.hisabnikash.api.repository.CurrencyRepository;
import com.hisabnikash.api.repository.TransactionRepository;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@Transactional
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final BudgetCategoryRepository categoryRepository;
    private final SavingsVaultRepository vaultRepository;
    private final CurrencyRepository currencyRepository;
    private final com.hisabnikash.api.service.NotificationService notificationService;

    public TransactionController(TransactionRepository transactionRepository, UserRepository userRepository,
                                 WalletRepository walletRepository, BudgetCategoryRepository categoryRepository,
                                 SavingsVaultRepository vaultRepository, CurrencyRepository currencyRepository,
                                 com.hisabnikash.api.service.NotificationService notificationService) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.categoryRepository = categoryRepository;
        this.vaultRepository = vaultRepository;
        this.currencyRepository = currencyRepository;
        this.notificationService = notificationService;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> getTransactions(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId());
        return ResponseEntity.ok(transactions);
    }

    @PostMapping
    public ResponseEntity<?> createTransaction(@RequestBody List<TransactionRequest> requests, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        String currencyCode = user.getBaseCurrency() != null ? user.getBaseCurrency().getCurrencyCode() : "BDT";
        Currency currency = currencyRepository.findById(currencyCode).orElseThrow(() -> new RuntimeException("Currency not found"));
        
        // Pre-validation: Check HARD limit on categories for all EXPENSE items
        Map<Long, BigDecimal> categoryPendingSpent = new HashMap<>();
        for (TransactionRequest req : requests) {
            if ("EXPENSE".equalsIgnoreCase(req.getTransactionType()) && req.getCategoryId() != null) {
                BudgetCategory category = categoryRepository.findById(req.getCategoryId()).orElse(null);
                if (category != null && category.getLimitType() == BudgetCategory.LimitType.HARD) {
                    BigDecimal cap = category.getMonthlyBudgetCap();
                    if (cap != null && cap.compareTo(BigDecimal.ZERO) > 0) {
                        LocalDate txDate = req.getTransactionDate() != null ? req.getTransactionDate() : LocalDate.now();
                        LocalDate startDate = txDate.withDayOfMonth(1);
                        LocalDate endDate = txDate.withDayOfMonth(txDate.lengthOfMonth());

                        BigDecimal currentSpent = transactionRepository.sumByCategoryAndTypeAndDateBetween(
                                category.getId(), Transaction.TransactionType.EXPENSE, startDate, endDate);
                        if (currentSpent == null) currentSpent = BigDecimal.ZERO;

                        BigDecimal pending = categoryPendingSpent.getOrDefault(category.getId(), BigDecimal.ZERO);
                        BigDecimal reqAmt = req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO;
                        BigDecimal totalProjected = currentSpent.add(pending).add(reqAmt);

                        if (totalProjected.compareTo(cap) > 0) {
                            BigDecimal remaining = cap.subtract(currentSpent.add(pending));
                            if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;
                            String msg = String.format("Cannot add expense: Category '%s' has a Hard Limit of ৳%.2f. Current monthly spending is ৳%.2f (remaining: ৳%.2f). This expense of ৳%.2f exceeds the cap by ৳%.2f.",
                                    category.getName(), cap, currentSpent.add(pending), remaining, reqAmt, totalProjected.subtract(cap));
                            return ResponseEntity.badRequest().body(Map.of("message", msg, "error", "HARD_LIMIT_EXCEEDED"));
                        }
                        categoryPendingSpent.put(category.getId(), pending.add(reqAmt));
                    }
                }
            }
        }
        
        for (TransactionRequest req : requests) {
            Transaction tx = new Transaction();
            tx.setUser(user);
            tx.setTransactionType(Transaction.TransactionType.valueOf(req.getTransactionType()));
            tx.setTransactionDate(req.getTransactionDate());
            tx.setOriginalAmount(req.getAmount());
            tx.setConvertedAmount(req.getAmount());
            tx.setOriginalCurrency(currency);
            tx.setDescription(req.getDescription());
            if (req.getSourceNote() != null) {
                tx.setSourceNote(req.getSourceNote());
            }
            
            // Handle wallet deduction
            Wallet wallet = walletRepository.findById(req.getWalletId()).orElseThrow(() -> new RuntimeException("Wallet not found"));
            wallet.setCurrentBalance(wallet.getCurrentBalance().subtract(req.getAmount()));
            walletRepository.save(wallet);
            tx.setWallet(wallet);
            
            if (req.getCategoryId() != null) {
                BudgetCategory category = categoryRepository.findById(req.getCategoryId()).orElse(null);
                tx.setCategory(category);
            }
            
            if (req.getVaultId() != null) {
                SavingsVault vault = vaultRepository.findById(req.getVaultId()).orElse(null);
                tx.setVault(vault);
                if (vault != null) {
                    vault.setInitialSavings(vault.getInitialSavings().add(req.getAmount()));
                    vaultRepository.save(vault);
                }
            }
            
            transactionRepository.save(tx);
        }
        
        notificationService.broadcastNotifications(user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTransactionById(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Transaction tx = transactionRepository.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!tx.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", tx.getId());
        map.put("transactionType", tx.getTransactionType() != null ? tx.getTransactionType().name() : "EXPENSE");
        map.put("amount", tx.getConvertedAmount());
        map.put("description", tx.getDescription());
        map.put("sourceNote", tx.getSourceNote());
        map.put("transactionDate", tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : "");
        map.put("walletId", tx.getWallet() != null ? tx.getWallet().getId() : null);
        map.put("walletName", tx.getWallet() != null ? tx.getWallet().getName() : null);
        map.put("categoryId", tx.getCategory() != null ? tx.getCategory().getId() : null);
        map.put("categoryName", tx.getCategory() != null ? tx.getCategory().getName() : null);

        SavingsVault vault = tx.getVault();
        if (vault == null && tx.getTransactionType() == Transaction.TransactionType.VAULT_CONTRIBUTION) {
            String desc = tx.getDescription();
            if (desc != null) {
                List<SavingsVault> userVaults = vaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());
                for (SavingsVault v : userVaults) {
                    String vName = v.getName().trim().toLowerCase();
                    String descLower = desc.toLowerCase();
                    if (descLower.contains(vName) || descLower.equals(vName) || descLower.endsWith("to " + vName)) {
                        vault = v;
                        tx.setVault(v);
                        transactionRepository.save(tx);
                        break;
                    }
                }
            }
        }
        map.put("vaultId", vault != null ? vault.getId() : null);
        map.put("vaultName", vault != null ? vault.getName() : null);
        return ResponseEntity.ok(map);
    }

    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(@PathVariable Long id, @RequestBody TransactionRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Transaction tx = transactionRepository.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found"));
        
        if (!tx.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        BigDecimal oldAmt = tx.getConvertedAmount() != null ? tx.getConvertedAmount() : BigDecimal.ZERO;
        BigDecimal newAmt = req.getAmount() != null ? req.getAmount() : oldAmt;

        Transaction.TransactionType newTxType = tx.getTransactionType();
        if (req.getTransactionType() != null && !req.getTransactionType().trim().isEmpty()) {
            try {
                newTxType = Transaction.TransactionType.valueOf(req.getTransactionType());
            } catch (Exception ignored) {}
        }

        // Pre-validation: Check HARD limit if resulting transaction is an EXPENSE
        if (newTxType == Transaction.TransactionType.EXPENSE) {
            Long targetCategoryId = req.getCategoryId() != null ? req.getCategoryId() : (tx.getCategory() != null ? tx.getCategory().getId() : null);
            if (targetCategoryId != null) {
                BudgetCategory targetCat = categoryRepository.findById(targetCategoryId).orElse(null);
                if (targetCat != null && targetCat.getLimitType() == BudgetCategory.LimitType.HARD) {
                    BigDecimal cap = targetCat.getMonthlyBudgetCap();
                    if (cap != null && cap.compareTo(BigDecimal.ZERO) > 0) {
                        LocalDate txDate = req.getTransactionDate() != null ? req.getTransactionDate() : (tx.getTransactionDate() != null ? tx.getTransactionDate() : LocalDate.now());
                        LocalDate startDate = txDate.withDayOfMonth(1);
                        LocalDate endDate = txDate.withDayOfMonth(txDate.lengthOfMonth());

                        BigDecimal currentSpent = transactionRepository.sumByCategoryAndTypeAndDateBetween(
                                targetCat.getId(), Transaction.TransactionType.EXPENSE, startDate, endDate);
                        if (currentSpent == null) currentSpent = BigDecimal.ZERO;

                        BigDecimal adjustedSpent = currentSpent;
                        boolean wasInSameCategoryAndMonth = tx.getCategory() != null && tx.getCategory().getId().equals(targetCat.getId())
                                && tx.getTransactionType() == Transaction.TransactionType.EXPENSE
                                && tx.getTransactionDate() != null
                                && !tx.getTransactionDate().isBefore(startDate) && !tx.getTransactionDate().isAfter(endDate);
                        if (wasInSameCategoryAndMonth) {
                            adjustedSpent = adjustedSpent.subtract(oldAmt);
                            if (adjustedSpent.compareTo(BigDecimal.ZERO) < 0) adjustedSpent = BigDecimal.ZERO;
                        }

                        BigDecimal totalProjected = adjustedSpent.add(newAmt);
                        if (totalProjected.compareTo(cap) > 0) {
                            BigDecimal remaining = cap.subtract(adjustedSpent);
                            if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;
                            String msg = String.format("Cannot update expense: Category '%s' has a Hard Limit of ৳%.2f. Current monthly spending is ৳%.2f (remaining: ৳%.2f). This updated expense of ৳%.2f exceeds the cap by ৳%.2f.",
                                    targetCat.getName(), cap, adjustedSpent, remaining, newAmt, totalProjected.subtract(cap));
                            return ResponseEntity.badRequest().body(Map.of("message", msg, "error", "HARD_LIMIT_EXCEEDED"));
                        }
                    }
                }
            }
        }

        // 1. REVERSE & APPLY WALLET EFFECTS
        Wallet oldWallet = tx.getWallet();
        Long newWalletId = req.getWalletId() != null ? req.getWalletId() : (oldWallet != null ? oldWallet.getId() : null);
        Wallet newWallet = newWalletId != null ? walletRepository.findById(newWalletId).orElse(null) : null;
        if (newWalletId != null && newWallet == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Selected wallet not found"));
        }
        if (newWallet != null && !newWallet.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        if (oldWallet != null && newWallet != null && oldWallet.getId().equals(newWallet.getId())) {
            BigDecimal curBal = oldWallet.getCurrentBalance() != null ? oldWallet.getCurrentBalance() : BigDecimal.ZERO;
            oldWallet.setCurrentBalance(curBal.add(oldAmt).subtract(newAmt));
            walletRepository.save(oldWallet);
            tx.setWallet(oldWallet);
        } else {
            if (oldWallet != null) {
                BigDecimal oldBal = oldWallet.getCurrentBalance() != null ? oldWallet.getCurrentBalance() : BigDecimal.ZERO;
                oldWallet.setCurrentBalance(oldBal.add(oldAmt));
                walletRepository.save(oldWallet);
            }
            if (newWallet != null) {
                BigDecimal newBal = newWallet.getCurrentBalance() != null ? newWallet.getCurrentBalance() : BigDecimal.ZERO;
                newWallet.setCurrentBalance(newBal.subtract(newAmt));
                walletRepository.save(newWallet);
                tx.setWallet(newWallet);
            }
        }

        // 2. IDENTIFY OLD VAULT & TARGET VAULT ACCURATELY
        SavingsVault oldVault = tx.getVault();
        if (oldVault == null && tx.getTransactionType() == Transaction.TransactionType.VAULT_CONTRIBUTION) {
            String oldDesc = tx.getDescription();
            if (oldDesc != null) {
                List<SavingsVault> userVaults = vaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());
                for (SavingsVault v : userVaults) {
                    String vName = v.getName().trim().toLowerCase();
                    String descLower = oldDesc.toLowerCase();
                    if (descLower.contains(vName) || descLower.equals(vName) || descLower.endsWith("to " + vName)) {
                        oldVault = v;
                        break;
                    }
                }
            }
        }

        boolean isVaultTx = (newTxType == Transaction.TransactionType.VAULT_CONTRIBUTION);
        SavingsVault targetVault = null;
        if (isVaultTx) {
            if (req.getVaultId() != null) {
                targetVault = vaultRepository.findById(req.getVaultId()).orElse(null);
            }
            if (targetVault == null && oldVault != null) {
                targetVault = oldVault;
            }
            if (targetVault == null) {
                String searchDesc = req.getDescription() != null ? req.getDescription() : tx.getDescription();
                if (searchDesc != null) {
                    List<SavingsVault> userVaults = vaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());
                    for (SavingsVault v : userVaults) {
                        String vName = v.getName().trim().toLowerCase();
                        String descLower = searchDesc.toLowerCase();
                        if (descLower.contains(vName) || descLower.equals(vName) || descLower.endsWith("to " + vName)) {
                            targetVault = v;
                            break;
                        }
                    }
                }
            }
        }

        // 3. ACCURATELY REVERSE ORIGINAL DEPOSIT AND APPLY NEW VALUE TO TARGET VAULT
        if (oldVault != null && targetVault != null && oldVault.getId().equals(targetVault.getId())) {
            // Same target vault: accurately adjust balance: cur + newAmt - oldAmt
            BigDecimal curVaultSavings = targetVault.getInitialSavings() != null ? targetVault.getInitialSavings() : BigDecimal.ZERO;
            BigDecimal updatedVaultSavings = curVaultSavings.subtract(oldAmt).add(newAmt);
            if (updatedVaultSavings.compareTo(BigDecimal.ZERO) < 0) {
                updatedVaultSavings = BigDecimal.ZERO;
            }
            targetVault.setInitialSavings(updatedVaultSavings);
            vaultRepository.save(targetVault);
            tx.setVault(targetVault);
        } else {
            // Target vault changed, or transaction type switched
            if (oldVault != null) {
                BigDecimal oldVaultSavings = oldVault.getInitialSavings() != null ? oldVault.getInitialSavings() : BigDecimal.ZERO;
                BigDecimal reversedSavings = oldVaultSavings.subtract(oldAmt);
                if (reversedSavings.compareTo(BigDecimal.ZERO) < 0) {
                    reversedSavings = BigDecimal.ZERO;
                }
                oldVault.setInitialSavings(reversedSavings);
                vaultRepository.save(oldVault);
            }
            if (targetVault != null) {
                BigDecimal targetVaultSavings = targetVault.getInitialSavings() != null ? targetVault.getInitialSavings() : BigDecimal.ZERO;
                targetVault.setInitialSavings(targetVaultSavings.add(newAmt));
                vaultRepository.save(targetVault);
                tx.setVault(targetVault);
            } else {
                tx.setVault(null);
            }
        }

        // 4. APPLY UPDATED TRANSACTION DETAILS
        tx.setTransactionType(newTxType);
        if (req.getTransactionDate() != null) {
            tx.setTransactionDate(req.getTransactionDate());
        }
        tx.setOriginalAmount(newAmt);
        tx.setConvertedAmount(newAmt);
        if (req.getDescription() != null) {
            tx.setDescription(req.getDescription());
        }
        if (req.getSourceNote() != null) {
            tx.setSourceNote(req.getSourceNote());
        }

        if (req.getCategoryId() != null) {
            BudgetCategory category = categoryRepository.findById(req.getCategoryId()).orElse(null);
            tx.setCategory(category);
        } else if (!isVaultTx) {
            tx.setCategory(null);
        }

        transactionRepository.save(tx);
        try {
            notificationService.broadcastNotifications(user.getId());
        } catch (Exception e) {
            System.err.println("Warning: failed to broadcast notifications after updating transaction: " + e.getMessage());
        }
        return ResponseEntity.ok(java.util.Map.of("message", "Transaction updated successfully"));
    }

    @org.springframework.transaction.annotation.Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Transaction tx = transactionRepository.findById(id).orElse(null);
        if (tx == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                    .body(java.util.Map.of("message", "Transaction not found or already deleted"));
        }
        
        if (!tx.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(java.util.Map.of("message", "You do not have permission to delete this transaction"));
        }

        // Refund wallet
        if (tx.getWallet() != null) {
            Wallet wallet = walletRepository.findById(tx.getWallet().getId()).orElse(null);
            if (wallet != null) {
                BigDecimal curBal = wallet.getCurrentBalance() != null ? wallet.getCurrentBalance() : BigDecimal.ZERO;
                BigDecimal refundAmt = tx.getConvertedAmount() != null ? tx.getConvertedAmount() : BigDecimal.ZERO;
                wallet.setCurrentBalance(curBal.add(refundAmt));
                walletRepository.save(wallet);
            }
        }

        // Refund vault if applicable
        SavingsVault vault = tx.getVault();
        if (vault == null && tx.getTransactionType() == Transaction.TransactionType.VAULT_CONTRIBUTION) {
            String desc = tx.getDescription();
            if (desc != null) {
                List<SavingsVault> userVaults = vaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());
                for (SavingsVault v : userVaults) {
                    String vName = v.getName().trim().toLowerCase();
                    String descLower = desc.toLowerCase();
                    if (descLower.contains(vName) || descLower.equals(vName) || descLower.endsWith("to " + vName)) {
                        vault = v;
                        break;
                    }
                }
            }
        }
        if (vault != null) {
            BigDecimal init = vault.getInitialSavings() != null ? vault.getInitialSavings() : BigDecimal.ZERO;
            BigDecimal deductAmt = tx.getConvertedAmount() != null ? tx.getConvertedAmount() : BigDecimal.ZERO;
            BigDecimal newSavings = init.subtract(deductAmt);
            vault.setInitialSavings(newSavings.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newSavings);
            vaultRepository.save(vault);
        }

        transactionRepository.delete(tx);
        transactionRepository.flush();
        try {
            notificationService.broadcastNotifications(user.getId());
        } catch (Throwable e) {
            System.err.println("Warning: failed to broadcast notifications after deleting transaction: " + e.getMessage());
        }
        return ResponseEntity.ok(java.util.Map.of("message", "Transaction deleted successfully"));
    }
}
