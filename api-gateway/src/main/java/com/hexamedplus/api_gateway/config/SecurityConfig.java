package com.hexamedplus.api_gateway.config;

import com.hexamedplus.api_gateway.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
                .csrf(ServerHttpSecurity.CsrfSpec::disable) // Disable CSRF for REST APIs
                .authorizeExchange(exchange -> exchange
                        .pathMatchers("/actuator/**", "/api/health").permitAll()
                        .pathMatchers("/api/auth/**").permitAll()
                        .anyExchange().permitAll()
                )
                // Note: Spring Security's exchange matchers above are intentionally permissive.
                // Actual authentication is enforced by the custom JwtAuthenticationFilter (GlobalFilter,
                // order -1), which rejects any request without a valid Bearer token unless the path is
                // one of its own public-path exemptions (auth, actuator/health, SSE progress stream).
                // We don't need Spring Security's built-in oauth2 resource server since we manually parse
                // the token and set downstream headers.
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable);

        return http.build();
    }
}