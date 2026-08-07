package com.hexamedplus.api_gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

/**
 * Redis-backed per-user rate limiting (Spring Cloud Gateway's built-in
 * RequestRateLimiter, config in application-*.yml). Added specifically
 * because ai-service's calls out to NVIDIA NIM / AWS Bedrock are billed
 * per-request — an accidental retry loop or a bug on the client side could
 * otherwise run up a real bill with nothing today to stop it.
 *
 * Keys by the authenticated username (X-User-Name, set by
 * JwtAuthenticationFilter, which runs earlier in the chain — order -1 — so
 * the header is already present by the time route filters evaluate this
 * resolver). Falls back to client IP for unauthenticated/public requests
 * (e.g. failed-login spam on /api/auth/login) rather than leaving them
 * completely unthrottled.
 */
@Configuration
public class RateLimiterConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String user = exchange.getRequest().getHeaders().getFirst("X-User-Name");
            if (user != null && !user.isBlank()) {
                return Mono.just(user);
            }
            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            return Mono.just(ip);
        };
    }
}
