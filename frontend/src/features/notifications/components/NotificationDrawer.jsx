import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Bell, Info, AlertTriangle, CheckCircle, XCircle, Database, Trash2 } from "lucide-react";
import { notificationActions } from "../../../store/slices/notificationSlice";

export default function NotificationDrawer({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notification.notifications);
  const drawerRef = useRef(null);

  const handleClear = () => {
    dispatch(notificationActions.clearAllNotifications());
  };

  useEffect(() => {
    if (!isOpen) return;
    // Defer by one tick so the bell-click that opened the drawer
    // doesn't immediately retrigger onClose via the same event.
    let timerId;
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    };
    timerId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const formatRelativeTime = (time) => {
    if (!time) return "";
    const diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 60) return "Just now";
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    return new Date(time).toLocaleDateString();
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case "CheckCircle":
        return <CheckCircle className="w-5 h-5" />;
      case "XCircle":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm transition-opacity" />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-500" />
            Notifications
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-slate-800/50 border-b border-neutral-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400">
            {notifications.length} {notifications.length === 1 ? "Notification" : "Notifications"}
          </span>
          {notifications.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-slate-500 space-y-3">
              <Bell className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">No new notifications</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-lg border border-neutral-100 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/30 animate-fade-in"
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                  {getIcon(item.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900 dark:text-slate-100 truncate">{item.title}</p>
                  <p className="text-xs text-neutral-600 dark:text-slate-400 mt-0.5 line-clamp-2">{item.message}</p>
                  <p className="text-[10px] font-semibold text-neutral-400 dark:text-slate-500 mt-1.5 uppercase tracking-wider">
                    {formatRelativeTime(item.time)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}