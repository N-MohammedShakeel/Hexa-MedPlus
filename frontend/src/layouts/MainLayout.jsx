import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import TopNavBar from "./components/Header/TopNavBar";
import { Toaster } from "react-hot-toast";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-slate-900 transition-colors duration-200">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNavBar
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "8px",
            background: "#191C1E",
            color: "#FFFFFF",
            fontSize: "13px",
          },
        }}
      />
    </div>
  );
}
