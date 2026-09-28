package com.hisabnikash.api.controller;

import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        
        Map<String, Object> response = new HashMap<>();
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        
        String avatar = "U";
        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            avatar = user.getFullName().trim().substring(0, 1).toUpperCase();
        }
        response.put("avatar", avatar);
        response.put("charityTarget", user.getSadaqaMonthlyTarget());

        return ResponseEntity.ok(response);
    }

    @org.springframework.web.bind.annotation.PutMapping("/me/charity-target")
    public ResponseEntity<?> updateCharityTarget(@org.springframework.web.bind.annotation.RequestBody java.util.Map<String, java.math.BigDecimal> req, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        
        java.math.BigDecimal target = req.get("target");
        if (target != null) {
            user.setSadaqaMonthlyTarget(target);
            userRepository.save(user);
        }
        
        return ResponseEntity.ok(java.util.Collections.singletonMap("success", true));
    }
}
