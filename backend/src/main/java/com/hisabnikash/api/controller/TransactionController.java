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
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final BudgetCategoryRepository categoryRepository;
    private final SavingsVaultRepository vaultRepository;
    private final CurrencyRepository currencyRepository;

    public TransactionController(TransactionRepository transactionRepository, UserRepository userRepository,
                                 WalletRepository walletRepository, BudgetCategoryRepository categoryRepository,
                                 SavingsVaultRepository vaultRepository, CurrencyRepository currencyRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.categoryRepository = categoryRepository;
        this.vaultRepository = vaultRepository;
        this.currencyRepository = currencyRepository;
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
        
        for (TransactionRequest req : requests) {
            Transaction tx = new Transaction();
            tx.setUser(user);
            tx.setTransactionType(Transaction.TransactionType.valueOf(req.getTransactionType()));
            tx.setTransactionDate(req.getTransactionDate());
            tx.setOriginalAmount(req.getAmount());
            tx.setConvertedAmount(req.getAmount());
            tx.setOriginalCurrency(currency);
            tx.setDescription(req.getDescription());
            
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
        
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(@PathVariable Long id, @RequestBody TransactionRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Transaction tx = transactionRepository.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found"));
        
        if (!tx.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Refund old amount to old wallet
        if (tx.getWallet() != null) {
            Wallet oldWallet = tx.getWallet();
            oldWallet.setCurrentBalance(oldWallet.getCurrentBalance().add(tx.getConvertedAmount()));
            walletRepository.save(oldWallet);
        }

        // Refund old amount to old vault (if applicable)
        if (tx.getVault() != null) {
            SavingsVault oldVault = tx.getVault();
            oldVault.setInitialSavings(oldVault.getInitialSavings().subtract(tx.getConvertedAmount()));
            vaultRepository.save(oldVault);
        }

        // Update fields
        tx.setTransactionDate(req.getTransactionDate());
        tx.setOriginalAmount(req.getAmount());
        tx.setConvertedAmount(req.getAmount());
        tx.setDescription(req.getDescription());

        // Deduct new amount from new wallet
        Wallet newWallet = walletRepository.findById(req.getWalletId()).orElseThrow(() -> new RuntimeException("Wallet not found"));
        newWallet.setCurrentBalance(newWallet.getCurrentBalance().subtract(req.getAmount()));
        walletRepository.save(newWallet);
        tx.setWallet(newWallet);

        if (req.getCategoryId() != null) {
            BudgetCategory category = categoryRepository.findById(req.getCategoryId()).orElse(null);
            tx.setCategory(category);
        } else {
            tx.setCategory(null);
        }
        
        if (req.getVaultId() != null) {
            SavingsVault newVault = vaultRepository.findById(req.getVaultId()).orElse(null);
            tx.setVault(newVault);
            if (newVault != null) {
                newVault.setInitialSavings(newVault.getInitialSavings().add(req.getAmount()));
                vaultRepository.save(newVault);
            }
        } else {
            tx.setVault(null);
        }

        transactionRepository.save(tx);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Transaction tx = transactionRepository.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found"));
        
        if (!tx.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Refund wallet
        if (tx.getWallet() != null) {
            Wallet wallet = tx.getWallet();
            wallet.setCurrentBalance(wallet.getCurrentBalance().add(tx.getConvertedAmount()));
            walletRepository.save(wallet);
        }

        // Refund vault if applicable
        if (tx.getVault() != null) {
            SavingsVault vault = tx.getVault();
            vault.setInitialSavings(vault.getInitialSavings().subtract(tx.getConvertedAmount()));
            vaultRepository.save(vault);
        }

        transactionRepository.delete(tx);
        return ResponseEntity.ok().build();
    }
}
