package com.hexamedplus.clinical_service.config;

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
 * Enforces the role/permission matrix for clinical-service. Trusts the
 * X-User-Role header set by api-gateway's JwtAuthenticationFilter — this
 * service is never meant to be reached directly except through the gateway
 * (the port exposed in docker-compose is for local dev convenience only; a
 * real deployment must firewall it off).
 *
 * Roles: PHYSICIAN, CODER, ADMIN (see AuthController.MOCK_USERS in api-gateway
 * for where these come from — there is no NURSE role in this system today).
 *
 * Reads (GET) are intentionally left broadly open to any authenticated role —
 * coders and admins both need situational visibility into patient/encounter
 * data. The security boundary here is on writes, matched below in order
 * (first match wins); anything not matched falls through to
 * "allow any authenticated role."
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RoleAuthorizationFilter implements WebFilter {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private static final Set<String> PHYSICIAN = Set.of("PHYSICIAN");
    private static final Set<String> CODER = Set.of("CODER");
    private static final Set<String> ADMIN = Set.of("ADMIN");
    private static final Set<String> PHYSICIAN_OR_ADMIN = Set.of("PHYSICIAN", "ADMIN");
    private static final Set<String> PHYSICIAN_OR_CODER = Set.of("PHYSICIAN", "CODER");

    private static final String[] EXEMPT_PREFIXES = { "/actuator" };

    private record Rule(HttpMethod method, String pattern, Set<String> allowedRoles) {
        boolean matches(HttpMethod requestMethod, String path) {
            return method == requestMethod && MATCHER.match(pattern, path);
        }
    }

    // Every mutating (and a couple of sensitive read) endpoints. See
    // PROJECT_INFO.md for the full rationale behind each assignment.
    private static final List<Rule> RULES = List.of(
            // --- User directory: admin-only system/staff management ---
            new Rule(HttpMethod.GET, "/api/clinical/users/**", ADMIN),
            new Rule(HttpMethod.POST, "/api/clinical/users", ADMIN),
            new Rule(HttpMethod.PUT, "/api/clinical/users/**", ADMIN),
            new Rule(HttpMethod.DELETE, "/api/clinical/users/**", ADMIN),

            // --- Patients: registration/demographics are physician-or-admin work ---
            new Rule(HttpMethod.POST, "/api/patients", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.PUT, "/api/patients/*", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.PUT, "/api/patients/*/archive", PHYSICIAN_OR_ADMIN),
            new Rule(HttpMethod.PUT, "/api/patients/*/unarchive", PHYSICIAN_OR_ADMIN),

            // --- Encounters: clinical documentation is physician-only ---
            new Rule(HttpMethod.POST, "/api/encounters", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/encounters/*/sign", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/encounters/*/ai-data", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/encounters/*/vitals", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/encounters/*/request-revision", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/encounters/*/approve-billing", PHYSICIAN),
            new Rule(HttpMethod.POST, "/api/encounters/validate-note", PHYSICIAN),
            // Coding-workbench writes are coder-only
            new Rule(HttpMethod.PUT, "/api/encounters/*/codes", CODER),
            new Rule(HttpMethod.PUT, "/api/encounters/*/coding-draft", CODER),
            // Generic status setter is shared: coders drive CODING_COMPLETE/BILLED,
            // physicians drive everything else that isn't covered by a dedicated
            // endpoint above. Which specific transitions are legal from which
            // current status is enforced separately by the encounter state machine
            // in EncounterService — this rule only answers "can this role touch
            // the endpoint at all."
            new Rule(HttpMethod.PUT, "/api/encounters/*/status", PHYSICIAN_OR_CODER),
            new Rule(HttpMethod.POST, "/api/encounters/*/coding-activity", PHYSICIAN_OR_CODER),

            // --- Plain notes system (/api/notes) — physician clinical documentation ---
            new Rule(HttpMethod.POST, "/api/notes", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/notes/*", PHYSICIAN),
            new Rule(HttpMethod.DELETE, "/api/notes/*", PHYSICIAN),

            // --- Tagged patient notes (/api/clinical/patients/{mrn}/notes) ---
            new Rule(HttpMethod.POST, "/api/clinical/patients/*/notes", PHYSICIAN),
            new Rule(HttpMethod.PUT, "/api/clinical/patients/*/notes/*", PHYSICIAN),
            new Rule(HttpMethod.DELETE, "/api/clinical/patients/*/notes/*", PHYSICIAN)
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
