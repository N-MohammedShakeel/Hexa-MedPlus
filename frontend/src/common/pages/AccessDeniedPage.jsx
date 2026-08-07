import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { ShieldAlert, Home } from "lucide-react";

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
          Access Restricted
        </h1>
        <p className="text-lg text-neutral-800 dark:text-neutral-400 mb-8 max-w-md mx-auto">
          Your role doesn't have access to this page.
        </p>
        <Button onClick={() => navigate("/dashboard")} icon={Home}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
