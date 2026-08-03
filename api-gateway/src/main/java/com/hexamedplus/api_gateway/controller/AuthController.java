package com.hexamedplus.api_gateway.controller;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${hexa.security.jwt.secret:defaultSecretKeyWithAtLeast32CharactersForHmacSha256}")
    private String jwtSecret;

    @Value("${hexa.security.jwt.expiration-ms:3600000}")
    private long jwtExpirationMs;

    // Predefined mock users for the prototype (Simulating Keycloak)
    private static final Map<String, UserDetails> MOCK_USERS = Map.of(
            "ms@hospital.com", new UserDetails(
                    "ms1234", "PHYSICIAN", "Dr. N. Mohammed Shakeel, MD", "Senior Oncologist",
                    "NMC-84729", "dr.shakeel@hpr.abdm", "Hexa MedPlus Central", "Oncology",
                    "Specializes in Medical Oncology and Thoracic Malignancies.", null),
            "coder@hospital.com", new UserDetails(
                    "password123", "CODER", "Rajesh Kumar, CPC", "Certified Professional Coder",
                    null, null, "Hexa MedPlus Central", "Medical Billing & Coding",
                    "10+ years experience in AAPC certified inpatient coding.", "EMP-90210"),
            "admin@hospital.com", new UserDetails(
                    "password123", "ADMIN", "Admin User", "System Administrator",
                    null, null, "Hexa MedPlus Central", "IT Support",
                    "System Administrator", "EMP-00001"));

    private static class UserDetails {
        String password;
        String role;
        String fullName;
        String title;
        String registrationNumber;
        String hprId;
        String facility;
        String department;
        String bio;
        String employeeId;

        UserDetails(String password, String role, String fullName, String title, String registrationNumber,
                String hprId, String facility, String department, String bio, String employeeId) {
            this.password = password;
            this.role = role;
            this.fullName = fullName;
            this.title = title;
            this.registrationNumber = registrationNumber;
            this.hprId = hprId;
            this.facility = facility;
            this.department = department;
            this.bio = bio;
            this.employeeId = employeeId;
        }
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<Map<String, String>>> authenticateUser(@RequestBody Map<String, Object> loginRequest) {
        String username = (String) loginRequest.get("username");
        String password = (String) loginRequest.get("password");

        boolean rememberMe = false;
        if (loginRequest.containsKey("rememberMe")) {
            Object rm = loginRequest.get("rememberMe");
            if (rm instanceof Boolean) {
                rememberMe = (Boolean) rm;
            } else if (rm instanceof String) {
                rememberMe = Boolean.parseBoolean((String) rm);
            }
        }

        if (username != null && MOCK_USERS.containsKey(username)) {
            UserDetails userDetails = MOCK_USERS.get(username);
            if (userDetails.password.equals(password)) {
                // 30 days or 1 day
                long expirationMs = rememberMe ? 30L * 24L * 60L * 60L * 1000L : 24L * 60L * 60L * 1000L;
                String token = generateJwtToken(username, expirationMs);
                Map<String, String> responsePayload = new HashMap<>();
                responsePayload.put("token", token);
                responsePayload.put("username", username);
                responsePayload.put("role", userDetails.role);
                responsePayload.put("fullName", userDetails.fullName != null ? userDetails.fullName : "");
                responsePayload.put("title", userDetails.title != null ? userDetails.title : "");
                responsePayload.put("registrationNumber", userDetails.registrationNumber != null ? userDetails.registrationNumber : "");
                responsePayload.put("hprId", userDetails.hprId != null ? userDetails.hprId : "");
                responsePayload.put("facility", userDetails.facility != null ? userDetails.facility : "");
                responsePayload.put("department", userDetails.department != null ? userDetails.department : "");
                responsePayload.put("bio", userDetails.bio != null ? userDetails.bio : "");
                responsePayload.put("employeeId", userDetails.employeeId != null ? userDetails.employeeId : "");
                
                return Mono.just(ResponseEntity.ok(responsePayload));
            }
        }

        return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    private String generateJwtToken(String username, long customExpirationMs) {
        Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + customExpirationMs))
                .signWith(key)
                .compact();
    }
}
