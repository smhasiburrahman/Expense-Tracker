package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.CategoryRequest;
import com.hisabnikash.api.entity.BudgetCategory;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.BudgetCategoryRepository;
import com.hisabnikash.api.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@Transactional
public class CategoryController {

    private final BudgetCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final com.hisabnikash.api.repository.TransactionRepository transactionRepository;
    private final com.hisabnikash.api.service.NotificationService notificationService;

    public CategoryController(BudgetCategoryRepository categoryRepository, UserRepository userRepository,
                              com.hisabnikash.api.repository.TransactionRepository transactionRepository,
                              com.hisabnikash.api.service.NotificationService notificationService) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.notificationService = notificationService;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<?> getCategories(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<BudgetCategory> categories = categoryRepository.findByUserId(user.getId());
        
        java.time.LocalDate startDate = java.time.LocalDate.now().withDayOfMonth(1);
        java.time.LocalDate endDate = java.time.LocalDate.now().withDayOfMonth(java.time.LocalDate.now().lengthOfMonth());

        List<Map<String, Object>> response = categories.stream().map(cat -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", cat.getId());
            map.put("name", cat.getName());
            map.put("icon", cat.getIcon());
            map.put("color", cat.getColorHex());
            map.put("cap", cat.getMonthlyBudgetCap());
            
            BigDecimal spent = transactionRepository.sumByCategoryAndTypeAndDateBetween(cat.getId(), com.hisabnikash.api.entity.Transaction.TransactionType.EXPENSE, startDate, endDate);
            map.put("spent", spent);
            
            BigDecimal cap = cat.getMonthlyBudgetCap() != null ? cat.getMonthlyBudgetCap() : BigDecimal.ZERO;
            long progress = 0;
            if (cap.compareTo(BigDecimal.ZERO) > 0) {
                progress = (spent.multiply(BigDecimal.valueOf(100)).divide(cap, 0, java.math.RoundingMode.HALF_UP)).longValue();
            }
            map.put("progress", progress);

            String status = "On Track";
            String statusClass = "badge-on-track";
            if (cap.compareTo(BigDecimal.ZERO) > 0 && spent.compareTo(cap) > 0) {
                status = "Over Budget";
                statusClass = "badge-danger";
            } else if (progress >= 80) {
                status = "Warning";
                statusClass = "badge-warning";
            }
            map.put("status", status);
            map.put("statusClass", statusClass);
            map.put("limitType", cat.getLimitType() != null ? cat.getLimitType().name() : "SOFT");
            
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> addCategory(@RequestBody CategoryRequest req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        BudgetCategory category = new BudgetCategory();
        category.setUser(user);
        category.setName(req.getName());
        category.setIcon(req.getIcon());
        category.setColorHex(req.getColorHex());
        category.setMonthlyBudgetCap(req.getMonthlyBudgetCap());
        if (req.getLimitType() != null && req.getLimitType().equalsIgnoreCase("HARD")) {
            category.setLimitType(BudgetCategory.LimitType.HARD);
        } else {
            category.setLimitType(BudgetCategory.LimitType.SOFT);
        }
        
        categoryRepository.save(category);
        notificationService.broadcastNotifications(user.getId());
        return ResponseEntity.ok(category);
    }

    @PutMapping("/{id}/limit-type")
    public ResponseEntity<?> updateLimitType(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        BudgetCategory category = categoryRepository.findById(id).orElse(null);
        if (category == null || !category.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Category not found"));
        }
        String limitTypeStr = body != null ? body.get("limitType") : null;
        if ("HARD".equalsIgnoreCase(limitTypeStr)) {
            category.setLimitType(BudgetCategory.LimitType.HARD);
        } else {
            category.setLimitType(BudgetCategory.LimitType.SOFT);
        }
        categoryRepository.save(category);
        notificationService.broadcastNotifications(user.getId());
        return ResponseEntity.ok(Map.of(
                "id", category.getId(),
                "name", category.getName(),
                "limitType", category.getLimitType().name()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        BudgetCategory category = categoryRepository.findById(id).orElse(null);
        if (category != null && category.getUser().getId().equals(user.getId())) {
            categoryRepository.delete(category);
            notificationService.broadcastNotifications(user.getId());
        }
        return ResponseEntity.ok("Category deleted");
    }
}
