import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../config/axios";
import { notificationActions } from "./notificationSlice";
import { toast } from "react-toastify";

const savedUser = localStorage.getItem("user");
const savedToken = localStorage.getItem("jwt_token") || localStorage.getItem("token");

const initialState = {
  user: savedUser && savedUser !== "undefined" ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  isAuthenticated: !!savedToken,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearError } = authSlice.actions;

export const loginUser = (credentials, navigate) => {
  return async (dispatch) => {
    try {
      dispatch(loginStart());
      const response = await axiosInstance.post('/api/auth/login', credentials);
      
      const { token, username, role, fullName, title, registrationNumber, hprId, facility, department, bio, employeeId } = response.data;
      
      const userObj = { 
        name: username, 
        email: credentials.username, 
        role, 
        fullName, 
        title, 
        registrationNumber, 
        hprId, 
        facility, 
        department, 
        bio, 
        employeeId 
      };
      
      localStorage.setItem("jwt_token", token);
      localStorage.setItem("user", JSON.stringify(userObj));
      
      dispatch(loginSuccess({
        user: userObj,
        token: token
      }));
      
      toast.success("Login successful");
      if (navigate) navigate("/patients");
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Invalid credentials or server unavailable.";
      dispatch(loginFailure(errorMsg));
      toast.error(errorMsg);
      dispatch(notificationActions.addNotification({
        title: "Login Failed",
        message: errorMsg,
        type: "error"
      }));
    }
  };
};

export default authSlice.reducer;