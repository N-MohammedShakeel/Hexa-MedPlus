import React, { useState } from "react";
import { useSelector } from "react-redux";
import { cn } from "../../../common/utils/cn";
import {
  LayoutDashboard,
  Users,
  FileText,
  Stethoscope,
  FolderOpen,
  BookOpen,
  Code2,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Heart,
  MessageSquare,
  CreditCard,
  Archive,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { ROUTES } from "../../../common/constants/routes";

const sidebarItems = [
  {
    label: "Dashboard",
    path: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: "Patients",
    path: ROUTES.PATIENTS,
    icon: Users,
  },
  {
    label: "Documents",
    path: ROUTES.DOCUMENTS,
    icon: FolderOpen,
  },
  {
    label: "Clinical Protocols",
    path: ROUTES.PROTOCOLS,
    icon: BookOpen,
  },
  {
    label: "Coding",
    path: ROUTES.CODING,
    icon: Code2,
  },
  {
    label: "Billing",
    path: ROUTES.BILLING,
    icon: CreditCard,
  },
  {
    label: "AI Chat",
    path: ROUTES.CHAT,
    icon: MessageSquare,
  },
  {
    label: "Audit Trails",
    path: ROUTES.AUDIT,
    icon: ClipboardList,
  },
  {
    label: "Records",
    path: ROUTES.RECORDS,
    icon: Archive,
  },
  {
    label: "Settings",
    path: ROUTES.SETTINGS,
    icon: Settings,
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "h-screen bg-white dark:bg-slate-900 border-r border-neutral-500 dark:border-slate-800 flex flex-col justify-between",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[280px]",
      )}
    >
      {/* Logo Section */}
      <div className="p-4 pb-8">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center",
          )}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-12 flex items-center justify-center shrink-0 shadow-inner border-t border-primary-300">
            <div className="flex items-start">
              <span className="text-white text-xl font-black font-sans leading-none tracking-tighter">H</span>
              <span className="text-primary-100 text-[12px] font-bold ml-0.5 mt-0.5 leading-none">+</span>
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400 leading-tight">
                Hexa MedPlus
              </span>
              <span className="text-xs font-semibold text-neutral-800 dark:text-slate-400">
                Clinical Assistant
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-4 text-xs font-semibold",
                "transition-colors duration-150",
                isActive
                  ? "bg-info-50 text-info-500 dark:bg-info-900/30 dark:text-info-400"
                  : "text-neutral-800 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-800",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile Section */}
      <div className="p-4 pt-8 border-t border-neutral-500 dark:border-slate-800">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center",
          )}
        >
          <div className="w-10 h-10 rounded-12 bg-info-100 dark:bg-info-900 flex items-center justify-center text-sm font-bold text-info-500 dark:text-info-400 shrink-0">
            {user?.fullName ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "US"}
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate ml-2">
              <span className="text-xs font-semibold text-neutral-900 dark:text-slate-200 truncate">
                {user?.fullName || "Unknown User"}
              </span>
              <span className="text-xs text-neutral-800 dark:text-slate-400 truncate">{user?.title || user?.role || "Staff"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-neutral-500 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-neutral-50 dark:hover:bg-slate-700"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-neutral-600 dark:text-slate-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-neutral-600 dark:text-slate-400" />
        )}
      </button>
    </aside>
  );
}
