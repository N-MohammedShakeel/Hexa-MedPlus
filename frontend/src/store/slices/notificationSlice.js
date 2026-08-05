import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
  name: "notification",
  initialState: {
    notifications: [],
    isDrawerOpen: false,
  },
  reducers: {
    addNotification(state, action) {
      state.notifications.unshift({
        id: Date.now() + Math.random(),
        title: action.payload.title,
        message: action.payload.message,
        type: action.payload.type || "info",
        time: Date.now(),
        bg:
          action.payload.type === "success"
            ? "bg-green-100 dark:bg-green-900/30"
            : action.payload.type === "error"
              ? "bg-red-100 dark:bg-red-900/30"
              : "bg-blue-100 dark:bg-blue-900/30",
        color:
          action.payload.type === "success"
            ? "text-green-700 dark:text-green-400"
            : action.payload.type === "error"
              ? "text-red-700 dark:text-red-400"
              : "text-blue-700 dark:text-blue-400",
        icon:
          action.payload.type === "success"
            ? "CheckCircle"
            : action.payload.type === "error"
              ? "XCircle"
              : "Bell",
      });
    },
    clearAllNotifications(state) {
      state.notifications = [];
    },
    toggleDrawer(state) {
      state.isDrawerOpen = !state.isDrawerOpen;
    },
    closeDrawer(state) {
      state.isDrawerOpen = false;
    },
  },
});

export const notificationActions = notificationSlice.actions;
export default notificationSlice;