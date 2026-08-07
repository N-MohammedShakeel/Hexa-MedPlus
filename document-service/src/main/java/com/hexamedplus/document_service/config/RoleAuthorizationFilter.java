package com.hexamedplus.document_service.config;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Set;

/**
 * Enforces the role/permission matrix for document-service. Trusts the
 * X-User-Role header set by api-gateway's JwtAuthenticationFilter — see the
 * identical filter in clinical-service for the full rationale.
 *
 * IMPORTANT: two endpoints are deliberately left UNGUARDED even though they
 * mutate data — ai-service calls them directly, service-to-service, bypassing
 * the gateway entirely (see kafka_consumer.py's _update_document_status and
 * vision.py's _resolve_document_url), so they never carry an X-User-Role
 * header at all:
 *   - GET  /api/documents/download
 *   - GET  /api/documents/by-file-key/{fileKey}
 *   - PUT  /api/documents/by-file-key/{fileKey}/status
 * Restricting these would 403 the automated AI document-processing pipeline.
 * A future hardening pass could give ai-service its own service-account
 * credential through the gateway instead of calling document-service
 * directly; out of scope for this pass.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RoleAuthorizationFilter implements WebFilter {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private static final Set<String> PHYSICIAN = Set.of("PHYSICIAN");
    private static final Set<String> ADMIN = Set.of("ADMIN");
    private static final Set<String> PHYSICIAN_OR_ADMIN = Set.of("PHYSICIAN", "ADMIN");

    private static final String[] EXEMPT_PREFIXES = { "/actuator", "/api/documents/progress" };

    private record Rule(HttpMethod method, String pattern, Set<String> allowedRoles) {
        boolean matches(HttpMethod requestMethod, String path) {
            return method == requestMethod && MATCHER.match(pattern, path);
        }
    }

    private static final List<Rule> RULES = List.of(
            // Document/guideline upload, delete, and lifecycle management —
            // coders never touch document storage directly.
            new Rule(HttpMethod.POST, "/api/documents", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.DELETE, "/api/documents/*", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.PUT, "/api/documents/*/status", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.POST, "/api/documents/*/supersede", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.POST, "/api/documents/admin/retire-expired", ADMIN),
            // Deleting a document by file key is only ever triggered from the
            // Encounter Workspace's "delete this Vision-AI analysis" action —
            // a physician-only flow (unlike the by-id delete above, this one
            // isn't used by the admin-facing Protocols page).
            new Rule(HttpMethod.DELETE, "/api/documents/by-file-key/**", PHYSICIAN)

            // Deliberately NOT listed here (left open, see class javadoc):
            // GET  /api/documents/download
            // GET  /api/documents/by-file-key/{fileKey}
            // PUT  /api/documents/by-file-key/{fileKey}/status
            // GET  /api/documents, GET /api/documents/{id}/versions — read-only
    );

    private boolean isExempt(String path) {
        for (String prefix : EXEMPT_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }
        return false;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (isExempt(path)) {
            return chain.filter(exchange);
        }

        HttpMethod method = exchange.getRequest().getMethod();
        String role = exchange.getRequest().getHeaders().getFirst("X-User-Role");

        for (Rule rule : RULES) {
            if (rule.matches(method, path)) {
                if (role == null || !rule.allowedRoles().contains(role)) {
                    exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                    return exchange.getResponse().setComplete();
                }
                break;
            }
        }

        return chain.filter(exchange);
    }
}
