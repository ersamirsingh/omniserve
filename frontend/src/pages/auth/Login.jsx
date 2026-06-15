import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

export const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem("foodmesh_remembered_email") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("foodmesh_remember_me") === "true");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    const result = await login(email, password, rememberMe);
    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <AuthLayout>
      <div className="mb-stack-lg animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary text-[28px]">
            restaurant
          </span>
          <h1 className="text-headline-md font-bold text-primary tracking-tight text-[22px]">
            FoodMesh
          </h1>
        </div>
        <h2 className="font-headline-md text-headline-sm text-on-surface dark:text-zinc-200 text-[16px] font-bold">
          Sign In
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[13px]">
          Access your operational dashboard. "One Platform. Every Order."
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container/40 border border-error/20 rounded-lg text-error text-[12px] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <Input
          label="Email Address"
          id="email"
          type="email"
          placeholder="admin@restaurant.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon="mail"
          autoComplete="email"
        />

        {/* Password */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label
              className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px]"
              htmlFor="password"
            >
              Password <span className="text-error">*</span>
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Please contact your system administrator to request a password reset link.");
              }}
              className="font-label-sm text-label-sm text-primary hover:text-primary-container dark:text-primary-fixed-dim text-[11px] font-medium transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 dark:text-zinc-500 text-[18px] pointer-events-none">
              lock
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="block w-full py-2.5 pl-9 pr-10 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg font-body-md text-body-md text-on-surface dark:text-zinc-100 placeholder-on-surface-variant/40 dark:placeholder-zinc-600 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-colors duration-200 text-[14px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant/50 dark:text-zinc-500 hover:text-on-surface dark:hover:text-zinc-350 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center">
          <label className="flex items-center text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] cursor-pointer select-none">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-border-base dark:border-zinc-800 text-primary dark:text-primary-fixed-dim focus:ring-primary/20 focus:ring-2 cursor-pointer dark:bg-zinc-900"
            />
            Remember Me
          </label>
        </div>

        {/* Submit */}
        <Button type="submit" loading={isLoading} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      {/* Alternative actions */}
      <div className="mt-stack-lg border-t border-border-base/60 dark:border-zinc-800 pt-4 text-center">
        <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 mb-3">
          Don't have a platform account?
        </p>
        <Link
          to="/register"
          className="inline-flex justify-center w-full py-2 px-4 border border-border-base dark:border-zinc-800 rounded-lg font-label-md text-on-surface dark:text-zinc-300 bg-surface dark:bg-zinc-900 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 text-[12px]"
        >
          Create Restaurant Tenant
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
