package com.hisabnikash.api.controller;

import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/wallets")
@Transactional
public class WalletController {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public WalletController(WalletRepository walletRepository, UserRepository userRepository) {
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> getWallets(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<Wallet> wallets = walletRepository.findByUserId(user.getId());
        return ResponseEntity.ok(wallets);
    }

    @PostMapping
    public ResponseEntity<?> addWallet(@RequestBody com.hisabnikash.api.dto.WalletRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Wallet wallet = new Wallet();
        wallet.setUser(user);
        wallet.setName(req.getName());
        wallet.setIcon(req.getIcon());
        wallet.setColorHex(req.getColorHex());
        wallet.setOpeningBalance(req.getOpeningBalance() != null ? req.getOpeningBalance() : java.math.BigDecimal.ZERO);
        wallet.setCurrentBalance(wallet.getOpeningBalance());
        wallet.setCurrency(user.getBaseCurrency());
        
        walletRepository.save(wallet);
        return ResponseEntity.ok(wallet);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateWallet(@PathVariable Long id, @RequestBody com.hisabnikash.api.dto.WalletRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Wallet wallet = walletRepository.findById(id).orElse(null);
        if (wallet == null || !wallet.getUser().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        
        wallet.setName(req.getName());
        wallet.setIcon(req.getIcon());
        wallet.setColorHex(req.getColorHex());
        if (req.getOpeningBalance() != null) {
            wallet.setCurrentBalance(req.getOpeningBalance()); // Simplified for now since we don't have transaction history to recompute
        }
        
        walletRepository.save(wallet);
        return ResponseEntity.ok(wallet);
    }
}
