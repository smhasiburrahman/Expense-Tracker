package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.RecurringTransactionRequest;
import com.hisabnikash.api.entity.RecurringTransaction;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.entity.Wallet;
import com.hisabnikash.api.repository.RecurringTransactionRepository;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recurring")
public class RecurringTransactionController {

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;

    public RecurringTransactionController(RecurringTransactionRepository recurringTransactionRepository, UserRepository userRepository, WalletRepository walletRepository) {
        this.recurringTransactionRepository = recurringTransactionRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> getRecurringTransactions(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<RecurringTransaction> transactions = recurringTransactionRepository.findByUserId(user.getId());
        
        List<Map<String, Object>> response = transactions.stream().map(rt -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", rt.getId());
            map.put("name", rt.getName());
            map.put("icon", rt.getIcon());
            map.put("amount", rt.getAmount());
            map.put("freq", rt.getFrequency().name());
            map.put("freqClass", rt.getFrequency().name().equals("MONTHLY") ? "badge-blue" : "badge-purple");
            map.put("date", rt.getNextChargeDate() != null ? rt.getNextChargeDate().toString() : "N/A");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    public ResponseEntity<?> addRecurringTransaction(@RequestBody RecurringTransactionRequest req, Authentication authentication) {
        if (req.getWalletId() == null) {
            return ResponseEntity.badRequest().body("Wallet ID is required.");
        }
        User user = getAuthenticatedUser(authentication);
        Wallet wallet = walletRepository.findById(req.getWalletId())
                .orElseThrow(() -> new RuntimeException("Wallet not found"));

        RecurringTransaction rt = new RecurringTransaction();
        rt.setUser(user);
        rt.setWallet(wallet);
        rt.setName(req.getName());
        rt.setIcon(req.getIcon());
        rt.setAmount(req.getAmount());
        rt.setFrequency(RecurringTransaction.Frequency.valueOf(req.getFrequency().toUpperCase()));
        rt.setNextChargeDate(req.getNextChargeDate());
        
        recurringTransactionRepository.save(rt);
        return ResponseEntity.ok(rt);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRecurringTransaction(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        RecurringTransaction rt = recurringTransactionRepository.findById(id).orElse(null);
        if (rt != null && rt.getUser().getId().equals(user.getId())) {
            recurringTransactionRepository.delete(rt);
        }
        return ResponseEntity.ok("Recurring transaction deleted");
    }
}
