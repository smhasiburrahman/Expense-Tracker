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
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final BudgetCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final com.hisabnikash.api.repository.TransactionRepository transactionRepository;

    public CategoryController(BudgetCategoryRepository categoryRepository, UserRepository userRepository, com.hisabnikash.api.repository.TransactionRepository transactionRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
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
                progress = Math.min((spent.longValue() * 100) / cap.longValue(), 100);
            }
            map.put("progress", progress);
            map.put("status", progress > 85 ? "Warning" : "On Track");
            map.put("statusClass", progress > 85 ? "badge-warning" : "badge-on-track");
            
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
        
        categoryRepository.save(category);
        return ResponseEntity.ok(category);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        BudgetCategory category = categoryRepository.findById(id).orElse(null);
        if (category != null && category.getUser().getId().equals(user.getId())) {
            categoryRepository.delete(category);
        }
        return ResponseEntity.ok("Category deleted");
    }
}
