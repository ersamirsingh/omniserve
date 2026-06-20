import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

export const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSuccessMessage("");

    if (!email || !password || !firstName || !lastName || !tenantName) {
      setLocalError("All fields are required");
      return;
    }

    // Client side password regex validation matching backend
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setLocalError(
        "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
      );
      return;
    }

    const result = await register(email, password, firstName, lastName, tenantName);
    if (result.success) {
      setSuccessMessage("Tenant registered successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-stack-lg animate-fade-in">
        <h2 className="font-headline-md text-headline-md text-on-surface text-[20px] font-bold">
          Register Tenant
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-[13px]">
          Create a new FoodMesh restaurant instance.
        </p>
      </div>

      {(error || localError) && (
        <div className="mb-4 p-3 bg-error-container/40 border border-error/20 rounded-lg text-error text-[12px] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{localError || error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-success-green/10 border border-success-green/20 rounded-lg text-success-green text-[12px] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Restaurant/Tenant Name */}
        <Input
          label="Restaurant / Brand Name"
          id="tenantName"
          placeholder="e.g. Burger Bistro"
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          required
          icon="storefront"
        />

        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            id="firstName"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last Name"
            id="lastName"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <Input
          label="Email Address"
          id="email"
          type="email"
          placeholder="owner@restaurant.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon="mail"
        />

        {/* Password */}
        <Input
          label="Password"
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          icon="lock"
        />

        {/* Submit */}
        <Button type="submit" loading={isLoading} className="w-full mt-2">
          Register
        </Button>
      </form>

      {/* Alternative actions */}
      <div className="mt-stack-lg border-t border-border-base/60 pt-4 text-center">
        <p className="text-[12px] text-on-surface-variant mb-2">
          Already have an account?
        </p>
        <Link
          to="/login"
          className="text-[12px] text-primary hover:text-primary-container font-semibold transition-colors"
        >
          Sign In Here
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
