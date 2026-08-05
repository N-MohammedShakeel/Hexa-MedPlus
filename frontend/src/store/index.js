import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import clinicalReducer from "./slices/clinicalSlice";
import patientReducer from "./slices/patientSlice";
import themeReducer from "./slices/themeSlice";
import notificationSlice from "./slices/notificationSlice";

// Combine any other slices here as the application grows
export const store = configureStore({
  reducer: {
    auth: authReducer,
    clinical: clinicalReducer,
    patients: patientReducer,
    theme: themeReducer,
    notification: notificationSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // For local dev/mocks, sometimes useful, can be removed in prod
    }),
});

export default store;
