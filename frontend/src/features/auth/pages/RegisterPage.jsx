import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { User, Mail, Lock, Building, ArrowRight, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        hospital: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate registration request
        setTimeout(() => {
            setLoading(false);
            navigate("/login");
        }, 1500);
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-6 h-6 text-primary-500" />
                <h2 className="text-3xl font-bold text-neutral-900">Request Access</h2>
            </div>
            <p className="text-neutral-600 mb-8 leading-relaxed">
                Join Hexa MedPlus to streamline your clinical workflows with AI.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Full Name"
                    name="fullName"
                    placeholder="Dr. Elias Mercer"
                    value={formData.fullName}
                    onChange={handleChange}
                    leftIcon={User}
                    required
                />
                
                <Input
                    label="Work Email Address"
                    type="email"
                    name="email"
                    placeholder="dr.mercer@hospital.com"
                    value={formData.email}
                    onChange={handleChange}
                    leftIcon={Mail}
                    required
                />

                <Input
                    label="Hospital / Organization"
                    name="hospital"
                    placeholder="General Medical Center"
                    value={formData.hospital}
                    onChange={handleChange}
                    leftIcon={Building}
                    required
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        leftIcon={Lock}
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        leftIcon={Lock}
                        required
                    />
                </div>

                <div className="flex items-start gap-2 pt-2 pb-2">
                    <input type="checkbox" id="terms" required className="w-4 h-4 mt-0.5 rounded border-neutral-400 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="terms" className="text-xs text-neutral-600 leading-relaxed">
                        I agree to the <a href="#" className="font-semibold text-primary-600 hover:underline">Terms of Service</a> and <a href="#" className="font-semibold text-primary-600 hover:underline">Privacy Policy</a>, and consent to HIPAA data processing guidelines.
                    </label>
                </div>

                <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full mt-2" 
                    icon={loading ? undefined : ArrowRight}
                    disabled={loading}
                >
                    {loading ? "Submitting Request..." : "Request Account"}
                </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-neutral-200">
                <p className="text-center text-sm text-neutral-600">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-primary-600 hover:underline">
                        Sign in instead
                    </Link>
                </p>
            </div>
        </div>
    );
}
