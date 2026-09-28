package com.hisabnikash.api.controller;

import com.hisabnikash.api.config.JwtUtil;
import com.hisabnikash.api.entity.Currency;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.CurrencyRepository;
import com.hisabnikash.api.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/users")
@org.springframework.transaction.annotation.Transactional
public class UserController {

    private final UserRepository userRepository;
    private final CurrencyRepository currencyRepository;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final com.hisabnikash.api.service.NotificationService notificationService;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    public UserController(UserRepository userRepository, 
                          CurrencyRepository currencyRepository, 
                          JwtUtil jwtUtil, 
                          UserDetailsService userDetailsService,
                          com.hisabnikash.api.service.NotificationService notificationService) {
        this.userRepository = userRepository;
        this.currencyRepository = currencyRepository;
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        this.notificationService = notificationService;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("monthlyIncome", user.getMonthlyIncome() != null ? user.getMonthlyIncome() : BigDecimal.ZERO);
        
        String currencyCode = user.getBaseCurrency() != null ? user.getBaseCurrency().getCurrencyCode() : "BDT";
        String currencySymbol = resolveSymbol(user.getBaseCurrency());
        String currencyName = user.getBaseCurrency() != null ? user.getBaseCurrency().getCurrencyName() : "Bangladeshi Taka";
        
        response.put("currencyCode", currencyCode);
        response.put("currencySymbol", currencySymbol);
        response.put("currencyName", currencyName);
        response.put("region", user.getRegion() != null ? user.getRegion() : "Bangladesh (Asia/Dhaka)");
        
        response.put("notifyBudgetAlerts", user.getNotifyBudgetAlerts() != null ? user.getNotifyBudgetAlerts() : true);
        response.put("notifyDailySummary", user.getNotifyDailySummary() != null ? user.getNotifyDailySummary() : true);
        response.put("notifyWeeklyReport", user.getNotifyWeeklyReport() != null ? user.getNotifyWeeklyReport() : true);
        response.put("notifySavingsGoals", user.getNotifySavingsGoals() != null ? user.getNotifySavingsGoals() : true);

        String avatar = "U";
        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            avatar = user.getFullName().trim().substring(0, 1).toUpperCase();
        }
        response.put("avatar", avatar);
        response.put("charityTarget", user.getSadaqaMonthlyTarget());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/currencies")
    public ResponseEntity<?> getCurrencies() {
        List<Currency> currencies = currencyRepository.findAll();
        currencies.forEach(c -> {
            if (c.getSymbol() == null || c.getSymbol().contains("?")) {
                c.setSymbol(resolveSymbol(c));
            }
        });
        currencies.sort(Comparator.comparing(Currency::getCurrencyCode));
        return ResponseEntity.ok(currencies);
    }

    private String resolveSymbol(Currency currency) {
        if (currency == null) return "৳";
        String code = currency.getCurrencyCode();
        if (code == null) return "৳";
        switch (code.toUpperCase()) {
            case "USD": return "$";
            case "EUR": return "€";
            case "GBP": return "£";
            case "CAD": return "C$";
            case "AUD": return "A$";
            case "INR": return "₹";
            case "SAR": return "﷼";
            case "AED": return "د.إ";
            case "JPY": return "¥";
            case "SGD": return "S$";
            case "MYR": return "RM";
            case "BDT":
            default: return "৳";
        }
    }

    @PutMapping("/me/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);

        String fullName = req.get("fullName") != null ? req.get("fullName").toString().trim() : "";
        String email = req.get("email") != null ? req.get("email").toString().trim() : "";
        Object incomeObj = req.get("monthlyIncome");
        String currencyCode = req.get("currencyCode") != null ? req.get("currencyCode").toString().trim() : null;
        String region = req.get("region") != null ? req.get("region").toString().trim() : null;

        // Validation 1: Required Full Name
        if (fullName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Full Name is required and cannot be empty."));
        }

        // Validation 2: Required Email
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email address is required and cannot be empty."));
        }

        // Validation 3: Valid Email Format
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please enter a valid email address (e.g. name@domain.com)."));
        }

        // Validation 4: Email Uniqueness
        if (!email.equalsIgnoreCase(user.getEmail())) {
            Optional<User> existingUser = userRepository.findByEmail(email);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "This email address is already in use by another account."));
            }
        }

        // Validation 5: Required Monthly Income
        BigDecimal monthlyIncome;
        if (incomeObj == null || incomeObj.toString().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Monthly Income is required and cannot be empty."));
        }
        try {
            monthlyIncome = new BigDecimal(incomeObj.toString().trim());
            if (monthlyIncome.compareTo(BigDecimal.ZERO) < 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Monthly Income cannot be negative."));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Monthly Income must be a valid number."));
        }

        // Update fields
        user.setFullName(fullName);
        boolean emailChanged = !email.equalsIgnoreCase(user.getEmail());
        user.setEmail(email);
        user.setMonthlyIncome(monthlyIncome);

        if (currencyCode != null && !currencyCode.isEmpty()) {
            Currency currency = currencyRepository.findById(currencyCode).orElse(null);
            if (currency != null) {
                user.setBaseCurrency(currency);
            }
        }

        if (region != null && !region.isEmpty()) {
            user.setRegion(region);
        }

        userRepository.save(user);

        // If email changed, generate a new token
        String newToken = null;
        if (emailChanged) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
            newToken = jwtUtil.generateToken(userDetails);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Account settings and localization updated successfully.");
        resp.put("fullName", user.getFullName());
        resp.put("email", user.getEmail());
        resp.put("monthlyIncome", user.getMonthlyIncome());
        resp.put("currencyCode", user.getBaseCurrency() != null ? user.getBaseCurrency().getCurrencyCode() : "BDT");
        resp.put("currencySymbol", resolveSymbol(user.getBaseCurrency()));
        resp.put("region", user.getRegion());
        if (newToken != null) {
            resp.put("token", newToken);
        }

        return ResponseEntity.ok(resp);
    }

    @PutMapping("/me/notifications")
    public ResponseEntity<?> updateNotifications(@RequestBody Map<String, Boolean> req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);

        if (req.containsKey("notifyBudgetAlerts")) {
            user.setNotifyBudgetAlerts(Boolean.TRUE.equals(req.get("notifyBudgetAlerts")));
        }
        if (req.containsKey("notifyDailySummary")) {
            user.setNotifyDailySummary(Boolean.TRUE.equals(req.get("notifyDailySummary")));
        }
        if (req.containsKey("notifyWeeklyReport")) {
            user.setNotifyWeeklyReport(Boolean.TRUE.equals(req.get("notifyWeeklyReport")));
        }
        if (req.containsKey("notifySavingsGoals")) {
            user.setNotifySavingsGoals(Boolean.TRUE.equals(req.get("notifySavingsGoals")));
        }

        userRepository.save(user);
        notificationService.broadcastNotifications(user.getId());

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Notification preferences saved.");
        resp.put("notifyBudgetAlerts", user.getNotifyBudgetAlerts());
        resp.put("notifyDailySummary", user.getNotifyDailySummary());
        resp.put("notifyWeeklyReport", user.getNotifyWeeklyReport());
        resp.put("notifySavingsGoals", user.getNotifySavingsGoals());

        return ResponseEntity.ok(resp);
    }

    @PutMapping("/me/charity-target")
    public ResponseEntity<?> updateCharityTarget(@RequestBody Map<String, BigDecimal> req, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        
        BigDecimal target = req.get("target");
        if (target != null) {
            user.setSadaqaMonthlyTarget(target);
            userRepository.save(user);
        }
        
        return ResponseEntity.ok(Collections.singletonMap("success", true));
    }
}
