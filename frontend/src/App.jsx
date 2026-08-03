import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectTheme } from "./store/slices/themeSlice";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import DashboardPage from "./pages/DashboardPage";
import PatientManagementPage from "./pages/PatientManagementPage";
import DocumentWorkspacePage from "./pages/DocumentWorkspacePage";
import ClinicalProtocolsPage from "./pages/ClinicalProtocolsPage";
import AuditTrailsPage from "./pages/AuditTrailsPage";
import RecordsPage from "./pages/RecordsPage";
import SettingsPage from "./pages/SettingsPage";
import DocumentUploadPage from "./features/documents/pages/DocumentUploadPage";
import HospitalPoliciesPage from "./features/settings/pages/HospitalPoliciesPage";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
import CodingWorkbenchPage from "./features/coding/pages/CodingWorkbenchPage";
import CoreWorkspacePage from "./features/clinical/pages/CoreWorkspacePage";
import EncounterWorkspacePage from "./features/encounters/pages/EncounterWorkspacePage";
import ChatPage from "./pages/ChatPage";
import BillingPage from "./pages/BillingPage";

function App() {
  const theme = useSelector(selectTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientManagementPage />} />
          <Route path="/documents" element={<DocumentWorkspacePage />} />
          <Route path="/protocols" element={<ClinicalProtocolsPage />} />
          <Route path="/audit" element={<AuditTrailsPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/documents" element={<DocumentUploadPage />} />
          <Route path="/settings/policies" element={<HospitalPoliciesPage />} />
          <Route path="/encounters/:patientId" element={<EncounterWorkspacePage />} />
          <Route path="/clinical/:patientId" element={<CoreWorkspacePage />} />
          <Route path="/coding" element={<CodingWorkbenchPage />} />
          <Route path="/coding/:patientId" element={<CodingWorkbenchPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
