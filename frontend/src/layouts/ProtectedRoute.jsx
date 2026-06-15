import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, hasCheckedSession, checkSession, isLoading } = useAuth();
  const location = useLocation();
  const [checkingSession, setCheckingSession] = useState(!isAuthenticated && !hasCheckedSession);

  useEffect(() => {
    const initSession = async () => {
      if (!isAuthenticated && !hasCheckedSession) {
        await checkSession();
      }
      setCheckingSession(false);
    };
    initSession();
  }, [isAuthenticated, hasCheckedSession, checkSession]);

  if (isLoading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle bg-pattern text-primary">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wide">Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
