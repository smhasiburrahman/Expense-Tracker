package com.hisabnikash.api.controller;

import com.hisabnikash.api.config.JwtUtil;
import com.hisabnikash.api.dto.AuthRequest;
import com.hisabnikash.api.dto.AuthResponse;
import com.hisabnikash.api.dto.RegisterRequest;
import com.hisabnikash.api.entity.Currency;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.CurrencyRepository;
import com.hisabnikash.api.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final CurrencyRepository currencyRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, UserDetailsService userDetailsService,
                          JwtUtil jwtUtil, UserRepository userRepository, 
                          CurrencyRepository currencyRepository, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.currencyRepository = currencyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@RequestBody AuthRequest authRequest) throws Exception {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getEmail(), authRequest.getPassword())
            );
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Invalid email or password");
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(authRequest.getEmail());
        final String jwt = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(new AuthResponse(jwt));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest registerRequest) {
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        // Setup base currency - create if doesn't exist just as fallback for now
        Currency currency = currencyRepository.findById(registerRequest.getBaseCurrencyCode())
                .orElseGet(() -> {
                    Currency newCur = new Currency();
                    newCur.setCurrencyCode(registerRequest.getBaseCurrencyCode());
                    newCur.setCurrencyName(registerRequest.getBaseCurrencyCode());
                    newCur.setSymbol(registerRequest.getBaseCurrencyCode());
                    return currencyRepository.save(newCur);
                });

        User user = new User();
        user.setFullName(registerRequest.getFullName());
        user.setEmail(registerRequest.getEmail());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setBaseCurrency(currency);
        user.setMonthlyIncome(registerRequest.getMonthlyIncome());
        
        userRepository.save(user);

        return ResponseEntity.ok("User registered successfully!");
    }
}
