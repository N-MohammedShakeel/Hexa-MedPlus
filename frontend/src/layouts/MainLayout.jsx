import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./MainLayout/Sidebar";
import TopNavBar from "./MainLayout/TopNavBar";
import NotificationDrawer from "../features/notifications/components/NotificationDrawer";
import { ToastContainer } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { notificationActions } from "../store/slices/notificationSlice";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const dispatch = useDispatch();
  const isDrawerOpen = useSelector((state) => state.notification.isDrawerOpen);

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
      <ToastContainer
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
      <NotificationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => dispatch(notificationActions.closeDrawer())} 
      />
    </div>
  );
}
