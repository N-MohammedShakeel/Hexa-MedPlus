import React from "react";
import { Bell, Moon, Sun, User, Menu, LogOut } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { notificationActions } from "../../store/slices/notificationSlice";
import { useNavigate } from "react-router-dom";
import { logout } from "../../store/slices/authSlice";
import { selectTheme, setTheme } from "../../store/slices/themeSlice";

export default function TopNavBar({ onMenuToggle }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const notificationCount = useSelector(state => state.notification.notifications.length);

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
        {/* Action Icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch(notificationActions.toggleDrawer())}
            className="p-2 relative rounded-full hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5 text-neutral-800 dark:text-slate-300" />
            {notificationCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-danger-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-800">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
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
