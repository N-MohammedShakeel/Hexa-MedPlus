import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Home } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Home className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-neutral-800 dark:text-neutral-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate("/dashboard")} icon={Home}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
