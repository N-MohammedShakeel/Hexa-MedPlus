package com.hexamedplus.api_gateway.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import javax.crypto.SecretKey;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    @Value("${hexa.security.jwt.secret:defaultSecretKeyWithAtLeast32CharactersForHmacSha256}")
    private String secretKey;

    // Paths that don't require a Bearer token:
    // - /api/auth/** issues the token in the first place
    // - /actuator/** and /api/health are infra checks
    // - /api/documents/progress/** is an SSE stream; the browser EventSource API
    //   cannot attach an Authorization header, and the path is keyed by a
    //   random per-upload jobId, so it's low-risk to leave open.
    private static final String[] PUBLIC_PATHS = {
            "/api/auth/", "/actuator/", "/api/health", "/api/documents/progress/"
    };

    private boolean isPublicPath(String path) {
        for (String prefix : PUBLIC_PATHS) {
            if (path.startsWith(prefix)) return true;
        }
        return false;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        final String path = exchange.getRequest().getURI().getPath();
        final String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            if (isPublicPath(path)) {
                return chain.filter(exchange);
            }
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);
        try {
            SecretKey key = Keys.hmacShaKeyFor(secretKey.getBytes());

            // Validate token and extract username + role
            var claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            String username = claims.getSubject();
            String role = claims.get("role", String.class);

            // Pass identity downstream. Every internal service trusts these headers
            // outright rather than re-validating the JWT themselves — safe only
            // because this filter (running first, order=-1) is the sole path
            // through which requests reach clinical-service/document-service in
            // production. The per-service ports exposed in docker-compose are for
            // local dev convenience; a real deployment must firewall them off from
            // anything but the gateway.
            ServerHttpRequest.Builder requestBuilder = exchange.getRequest().mutate()
                    .header("X-User-Name", username);
            if (role != null) {
                requestBuilder.header("X-User-Role", role);
            }
            ServerHttpRequest modifiedRequest = requestBuilder.build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());

        } catch (Exception e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -1; // Run first
    }
}
