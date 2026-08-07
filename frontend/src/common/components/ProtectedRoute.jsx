import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation, matchPath } from "react-router-dom";
import { hasPageAccess, PAGE_ACCESS } from "../constants/permissions";
import AccessDeniedPage from "../pages/AccessDeniedPage";

// Wraps every page under MainLayout. Previously there was no auth check on
// these routes at all (protection relied solely on the backend rejecting
// unauthenticated API calls) — this adds the missing client-side guard, plus
// the role-based page gating from common/constants/permissions.js.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const pattern = Object.keys(PAGE_ACCESS).find((p) => matchPath(p, location.pathname));

  if (pattern && !hasPageAccess(user?.role, pattern)) {
    return <AccessDeniedPage />;
  }

  return children;
}
