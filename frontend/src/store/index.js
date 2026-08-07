import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import clinicalReducer from "./slices/clinicalSlice";
import patientReducer from "./slices/patientSlice";
import themeReducer from "./slices/themeSlice";
import notificationSlice from "./slices/notificationSlice";
import uploadReducer from "./slices/uploadSlice";
import encounterReducer from "./slices/encounterSlice";

// Combine any other slices here as the application grows
export const store = configureStore({
  reducer: {
    auth: authReducer,
    clinical: clinicalReducer,
    patients: patientReducer,
    theme: themeReducer,
    notification: notificationSlice.reducer,
    upload: uploadReducer,
    encounter: encounterReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // For local dev/mocks, sometimes useful, can be removed in prod
    }),
});

export default store;
