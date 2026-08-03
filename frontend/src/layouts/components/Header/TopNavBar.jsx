import React, { useState } from "react";
import { Search, Bell, Moon, Sun, User, Menu, LogOut } from "lucide-react";
import { cn } from "../../../common/utils/cn";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../../store/slices/authSlice";
import { selectTheme, setTheme } from "../../../store/slices/themeSlice";

export default function TopNavBar({ onMenuToggle }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  const handleLogout = () => {
    localStorage.removeItem("token");
    dispatch(logout());
    navigate("/login");
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    dispatch(setTheme(nextTheme));
  };

  return (
    <header className="h-16 bg-neutral-50 dark:bg-slate-900 border-b border-neutral-500 dark:border-slate-800 flex items-center justify-between px-6 transition-colors duration-200">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-4 hover:bg-neutral-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5 text-neutral-800 dark:text-slate-300" />
        </button>
        {/* Removed redundant Hexa MedPlus title since it's already in the Sidebar */}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 w-4 h-4 text-neutral-600 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, protocols..."
            className={cn(
              "w-64 pl-10 pr-4 py-2 bg-neutral-200 dark:bg-slate-800 border border-neutral-500 dark:border-slate-700 rounded-12 text-sm text-neutral-900 dark:text-slate-200",
              "placeholder:text-neutral-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900",
              searchFocused && "bg-white dark:bg-slate-900",
            )}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-12 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors">
            <Bell className="w-5 h-5 text-neutral-800 dark:text-slate-300" />
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-12 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors">
            {theme === 'dark' ? (
               <Sun className="w-[18px] h-[18px] text-neutral-800 dark:text-slate-300" />
            ) : (
               <Moon className="w-[18px] h-[18px] text-neutral-800 dark:text-slate-300" />
            )}
          </button>
          <button
            className="p-2 rounded-12 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <User className="w-5 h-5 text-neutral-800 dark:text-slate-300" />
          </button>
          <button
            className="p-2 rounded-12 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors group"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 text-neutral-800 dark:text-slate-300 group-hover:text-danger-600 dark:group-hover:text-danger-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
