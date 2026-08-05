import { createSlice } from "@reduxjs/toolkit";

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("app-theme");
  if (savedTheme) {
    return savedTheme;
  }
  // Default to system preference if no saved theme
  return "system";
};

const initialState = {
  theme: getInitialTheme(), // 'light', 'dark', 'system'
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem("app-theme", action.payload);
    },
  },
});

export const { setTheme } = themeSlice.actions;

export const selectTheme = (state) => state.theme.theme;

export default themeSlice.reducer;
