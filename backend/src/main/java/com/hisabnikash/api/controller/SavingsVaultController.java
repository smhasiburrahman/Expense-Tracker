package com.hisabnikash.api.controller;

import com.hisabnikash.api.entity.SavingsVault;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.SavingsVaultRepository;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import com.hisabnikash.api.dto.SavingsVaultRequest;
import com.hisabnikash.api.dto.SavingsVaultDepositRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/savings")
public class SavingsVaultController {

    private final SavingsVaultRepository savingsVaultRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final com.hisabnikash.api.repository.TransactionRepository transactionRepository;
    private final com.hisabnikash.api.repository.CurrencyRepository currencyRepository;

    public SavingsVaultController(SavingsVaultRepository savingsVaultRepository, 
                                  UserRepository userRepository, 
                                  WalletRepository walletRepository,
                                  com.hisabnikash.api.repository.TransactionRepository transactionRepository,
                                  com.hisabnikash.api.repository.CurrencyRepository currencyRepository) {
        this.savingsVaultRepository = savingsVaultRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.currencyRepository = currencyRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> getVaults(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<SavingsVault> vaults = savingsVaultRepository.findByUserIdAndDeletedAtIsNull(user.getId());
        return ResponseEntity.ok(vaults);
    }

    @PostMapping
    public ResponseEntity<?> createVault(@RequestBody SavingsVaultRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        SavingsVault vault = new SavingsVault();
        vault.setUser(user);
        vault.setName(req.getName());
        vault.setEmoji(req.getEmoji());
        vault.setColorHex(req.getColorHex() != null ? req.getColorHex() : "#10b981");
        vault.setTargetAmount(req.getTargetAmount());
        vault.setInitialSavings(java.math.BigDecimal.ZERO);
        vault.setTargetDate(req.getTargetDate());
        
        savingsVaultRepository.save(vault);
        return ResponseEntity.ok(vault);
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<?> deposit(@PathVariable Long id, @RequestBody SavingsVaultDepositRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        SavingsVault vault = savingsVaultRepository.findById(id).orElse(null);
        if (vault == null || !vault.getUser().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        
        Wallet wallet = walletRepository.findById(req.getWalletId()).orElse(null);
        if (wallet == null || !wallet.getUser().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body("Invalid wallet");
        }
        
        // Deduct from wallet
        wallet.setCurrentBalance(wallet.getCurrentBalance().subtract(req.getAmount()));
        walletRepository.save(wallet);
        
        // Add to vault
        vault.setInitialSavings(vault.getInitialSavings().add(req.getAmount()));
        savingsVaultRepository.save(vault);
        
        // Log transaction
        com.hisabnikash.api.entity.Transaction tx = new com.hisabnikash.api.entity.Transaction();
        tx.setUser(user);
        tx.setWallet(wallet);
        tx.setVault(vault);
        tx.setTransactionType(com.hisabnikash.api.entity.Transaction.TransactionType.VAULT_CONTRIBUTION);
        tx.setOriginalAmount(req.getAmount());
        tx.setConvertedAmount(req.getAmount());
        tx.setTransactionDate(java.time.LocalDate.now());
        tx.setDescription("Deposit to " + vault.getName());
        
        String currencyCode = user.getBaseCurrency() != null ? user.getBaseCurrency().getCurrencyCode() : "BDT";
        com.hisabnikash.api.entity.Currency currency = currencyRepository.findById(currencyCode).orElseThrow(() -> new RuntimeException("Currency not found"));
        tx.setOriginalCurrency(currency);
        
        transactionRepository.save(tx);
        
        return ResponseEntity.ok(vault);
    }
}
