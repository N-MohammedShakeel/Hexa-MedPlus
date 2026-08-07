// Role/permission matrix for the frontend. Mirrors (at a page-granularity)
// the backend enforcement in clinical-service/document-service's
// RoleAuthorizationFilter — that filter is the real security boundary for
// individual write actions (it 403s anything a role isn't allowed to do,
// regardless of what the UI shows). This file only controls coarse,
// page-level navigation so a role isn't dropped onto a page where almost
// nothing they see is actually clickable for them.
//
// Roles come from api-gateway's AuthController.MOCK_USERS — there is no
// NURSE role in this system today, only these three.
export const ROLES = {
  PHYSICIAN: "PHYSICIAN",
  CODER: "CODER",
  ADMIN: "ADMIN",
};

const ALL_ROLES = [ROLES.PHYSICIAN, ROLES.CODER, ROLES.ADMIN];

// Keyed by the react-router path pattern (as declared in App.jsx). A path
// with no entry here is open to any authenticated role.
export const PAGE_ACCESS = {
  "/dashboard": ALL_ROLES,
  "/patients": ALL_ROLES,
  "/documents": ALL_ROLES,
  "/protocols": ALL_ROLES,
  "/records": ALL_ROLES,
  "/settings": ALL_ROLES,
  "/settings/documents": [ROLES.PHYSICIAN, ROLES.ADMIN],
  "/settings/policies": [ROLES.PHYSICIAN, ROLES.ADMIN],
  "/chat": ALL_ROLES,
  // Clinical documentation (notes, vitals, sign & lock, AI insights) is
  // physician-only work — coders get their patient/encounter context
  // through the Coding Workbench instead.
  "/encounters/:patientId": [ROLES.PHYSICIAN],
  "/clinical/:patientId": [ROLES.PHYSICIAN],
  // Coding Workbench: coders do the coding, physicians review/approve-billing
  // or request revision from the same screen.
  "/coding": [ROLES.PHYSICIAN, ROLES.CODER],
  "/coding/:patientId": [ROLES.PHYSICIAN, ROLES.CODER],
  // Billing: coders mark encounters billed (matches the mock coder's
  // department, "Medical Billing & Coding"); physicians can view for
  // oversight of what they approved.
  "/billing": [ROLES.PHYSICIAN, ROLES.CODER],
  // Audit trails are a compliance/security function — admin only.
  "/audit": [ROLES.ADMIN],
};

export function hasPageAccess(role, pattern) {
  const allowed = PAGE_ACCESS[pattern];
  if (!allowed) return true;
  return allowed.includes(role);
}
