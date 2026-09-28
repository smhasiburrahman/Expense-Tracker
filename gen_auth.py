import os

BASE_DIR = "backend/src/main/java/com/hisabnikash/api"
CONFIG_DIR = os.path.join(BASE_DIR, "config")
CONTROLLER_DIR = os.path.join(BASE_DIR, "controller")
SERVICE_DIR = os.path.join(BASE_DIR, "service")
DTO_DIR = os.path.join(BASE_DIR, "dto")
REPO_DIR = os.path.join(BASE_DIR, "repository")

os.makedirs(CONFIG_DIR, exist_ok=True)
os.makedirs(CONTROLLER_DIR, exist_ok=True)
os.makedirs(SERVICE_DIR, exist_ok=True)
os.makedirs(DTO_DIR, exist_ok=True)

# Update UserRepository
user_repo_path = os.path.join(REPO_DIR, "UserRepository.java")
with open(user_repo_path, "r") as f:
    repo_content = f.read()

if "findByEmail" not in repo_content:
    repo_content = repo_content.replace(
        "public interface UserRepository extends JpaRepository<User, Long> {",
        "import java.util.Optional;\n\npublic interface UserRepository extends JpaRepository<User, Long> {\n    Optional<User> findByEmail(String email);"
    )
    with open(user_repo_path, "w") as f:
        f.write(repo_content)

# JWT Util
jwt_util = """package com.hisabnikash.api.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {
    // Generate a secure key for HS256
    private static final Key SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(SECRET_KEY).build().parseClaimsJws(token).getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder().setClaims(claims).setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10)) // 10 hours
                .signWith(SECRET_KEY)
                .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
"""

# JWT Filter
jwt_filter = """package com.hisabnikash.api.config;

import com.hisabnikash.api.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        final String authorizationHeader = request.getHeader("Authorization");

        String username = null;
        String jwt = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                username = jwtUtil.extractUsername(jwt);
            } catch (Exception e) {
                // Invalid token
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            if (jwtUtil.validateToken(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
"""

# Security Config
sec_config = """package com.hisabnikash.api.config;

import com.hisabnikash.api.service.UserDetailsServiceImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(UserDetailsServiceImpl userDetailsService, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
"""

# UserDetailsServiceImpl
user_details = """package com.hisabnikash.api.service;

import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
        
        return new org.springframework.security.core.userdetails.User(user.getEmail(), user.getPasswordHash(), new ArrayList<>());
    }
}
"""

# DTOs
dto_auth_req = """package com.hisabnikash.api.dto;
import lombok.Data;
@Data
public class AuthRequest {
    private String email;
    private String password;
}
"""
dto_reg_req = """package com.hisabnikash.api.dto;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;
    private String baseCurrencyCode = "BDT";
    private BigDecimal monthlyIncome;
}
"""
dto_auth_resp = """package com.hisabnikash.api.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
}
"""

# AuthController
auth_ctrl = """package com.hisabnikash.api.controller;

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
"""

with open(os.path.join(CONFIG_DIR, "JwtUtil.java"), "w") as f: f.write(jwt_util)
with open(os.path.join(CONFIG_DIR, "JwtAuthenticationFilter.java"), "w") as f: f.write(jwt_filter)
with open(os.path.join(CONFIG_DIR, "SecurityConfig.java"), "w") as f: f.write(sec_config)
with open(os.path.join(SERVICE_DIR, "UserDetailsServiceImpl.java"), "w") as f: f.write(user_details)
with open(os.path.join(DTO_DIR, "AuthRequest.java"), "w") as f: f.write(dto_auth_req)
with open(os.path.join(DTO_DIR, "RegisterRequest.java"), "w") as f: f.write(dto_reg_req)
with open(os.path.join(DTO_DIR, "AuthResponse.java"), "w") as f: f.write(dto_auth_resp)
with open(os.path.join(CONTROLLER_DIR, "AuthController.java"), "w") as f: f.write(auth_ctrl)

print("Auth APIs successfully generated!")
