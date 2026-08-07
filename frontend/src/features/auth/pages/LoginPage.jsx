import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginStart, loginSuccess, loginFailure } from "../../../store/slices/authSlice";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { logLoginSuccess, logLoginFailed } from "../../../services/api/auditService";
import { notifyError } from "../../../common/utils/toast";

export default function LoginPage() {
    const dispatch = useDispatch();
    const { loading } = useSelector((state) => state.auth);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [localError, setLocalError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(loginStart());
        setLocalError(null);
        
        try {
            const { default: axiosInstance } = await import('../../../config/axios');
            const response = await axiosInstance.post('/api/auth/login', {
                username: email, // AuthController expects username
                password: password,
                rememberMe: rememberMe
            });

            const { token, username, role, fullName, title, registrationNumber, hprId, facility, department, bio, employeeId } = response.data;
            
            const userObj = { 
                name: username, 
                email: email, 
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

            // AUDIT: Log successful login
            logLoginSuccess(username || email);
            
            navigate("/patients");
        } catch (error) {
            console.error("Login failed", error);
            // AUDIT: Log failed login attempt
            logLoginFailed(email);
            const errorMsg = error.response?.data?.message || "Invalid credentials or server unavailable.";
            setLocalError(errorMsg);
            notifyError(errorMsg);
            dispatch(loginFailure(errorMsg));
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Welcome Back</h2>
            <p className="text-neutral-600 mb-8 leading-relaxed">
                Enter your credentials to access the Hexa MedPlus clinical workspace.
            </p>

            {localError && (
                <div className="mb-5 rounded-6 border border-danger-200 dark:border-danger-500/40 bg-danger-50 dark:bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-200">
                    {localError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                    label="Email Address"
                    type="email"
                    placeholder="doctor@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={Mail}
                    required
                />

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-neutral-800">Password</label>
                        <a href="#" className="text-xs font-semibold text-primary-600 hover:underline">
                            Forgot password?
                        </a>
                    </div>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        leftIcon={Lock}
                        required
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="remember" 
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="remember" className="text-sm font-medium text-neutral-700">Remember me for 30 days</label>
                    </div>
                </div>

                <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full mt-2" 
                    icon={loading ? undefined : ArrowRight}
                    disabled={loading}
                >
                    {loading ? "Authenticating..." : "Sign in to Workspace"}
                </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-neutral-200">
                <p className="text-center text-sm text-neutral-600">
                    Don't have an account?{" "}
                    <Link to="/register" className="font-semibold text-primary-600 hover:underline">
                        Request access
                    </Link>
                </p>
            </div>
        </div>
    );
}