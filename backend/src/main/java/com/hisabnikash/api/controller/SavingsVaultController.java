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

import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/savings")
@Transactional
public class SavingsVaultController {

    private final SavingsVaultRepository savingsVaultRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final com.hisabnikash.api.repository.TransactionRepository transactionRepository;
    private final com.hisabnikash.api.repository.CurrencyRepository currencyRepository;
    private final com.hisabnikash.api.service.NotificationService notificationService;

    public SavingsVaultController(SavingsVaultRepository savingsVaultRepository, 
                                  UserRepository userRepository, 
                                  WalletRepository walletRepository,
                                  com.hisabnikash.api.repository.TransactionRepository transactionRepository,
                                  com.hisabnikash.api.repository.CurrencyRepository currencyRepository,
                                  com.hisabnikash.api.service.NotificationService notificationService) {
        this.savingsVaultRepository = savingsVaultRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.currencyRepository = currencyRepository;
        this.notificationService = notificationService;
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
        notificationService.broadcastNotifications(user.getId());
        return ResponseEntity.ok(vault);
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<?> deposit(@PathVariable Long id, @RequestBody SavingsVaultDepositRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        SavingsVault vault = savingsVaultRepository.findById(id).orElse(null);
        if (vault == null || !vault.getUser().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Deposit amount must be greater than zero"));
        }

        Wallet wallet = walletRepository.findById(req.getWalletId()).orElse(null);
        if (wallet == null || !wallet.getUser().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Invalid wallet"));
        }

        BigDecimal walletBal = wallet.getCurrentBalance() != null ? wallet.getCurrentBalance() : BigDecimal.ZERO;
        if (walletBal.compareTo(req.getAmount()) < 0) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Insufficient funds in selected wallet"));
        }
        
        // Deduct from wallet
        wallet.setCurrentBalance(walletBal.subtract(req.getAmount()));
        walletRepository.save(wallet);
        
        // Add to vault
        BigDecimal currentVaultSavings = vault.getInitialSavings() != null ? vault.getInitialSavings() : BigDecimal.ZERO;
        vault.setInitialSavings(currentVaultSavings.add(req.getAmount()));
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
        com.hisabnikash.api.entity.Currency currency = currencyRepository.findById(currencyCode).orElse(null);
        if (currency == null) {
            currency = currencyRepository.findAll().stream().findFirst().orElse(null);
        }
        tx.setOriginalCurrency(currency);
        
        transactionRepository.save(tx);
        try {
            notificationService.broadcastNotifications(user.getId());
        } catch (Throwable e) {
            System.err.println("Warning: failed to broadcast notifications after deposit: " + e.getMessage());
        }
        return ResponseEntity.ok(vault);
    }
}
