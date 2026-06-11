import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { registerApi } from "../api/registeApi";

const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters"),

    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters"),

    tenantName: z
      .string()
      .trim()
      .min(3, "Restaurant or business name must be at least 3 characters"),

    email: z
      .string()
      .trim()
      .email("Invalid email address"),

    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 digits"),

    password: z
      .string()
      .min(
        8,
        "Password must be at least 8 characters"
      )
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        "Password must contain uppercase, lowercase, number and special character"
      ),

    confirmPassword: z.string(),

    terms: z.boolean().refine(
      (value) => value === true,
      {
        message:
          "You must accept Terms & Conditions",
      }
    ),
  })
  .refine(
    (data) =>
      data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );

export default function RegisterForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const {register, handleSubmit, reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      firstName: "",
      lastName: "",
      tenantName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const onSubmit = async (formData) => {
    try {
      setLoading(true);
      setServerError("");
      setSuccessMessage("");

      const payload = {
        firstName:
          formData.firstName.trim(),

        lastName:
          formData.lastName.trim(),

        email:
          formData.email.toLowerCase().trim(),

        password: formData.password,

        tenantName:
          formData.tenantName.trim(),

        role: "SUPER_ADMIN",
      };

      const response =
        await registerApi(payload);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Registration failed"
        );
      }

      setSuccessMessage(
        "Account created successfully."
      );

      reset();

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      setServerError(
        error?.response?.data?.message || error?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      {/* Names */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            First Name
          </label>

          <input
            type="text"
            {...register("firstName")}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

          {errors.firstName && (
            <p className="mt-1 text-sm text-red-500">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Last Name
          </label>

          <input
            type="text"
            {...register("lastName")}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

          {errors.lastName && (
            <p className="mt-1 text-sm text-red-500">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Restaurant / Business Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Restaurant / Business Name
        </label>

        <input
          type="text"
          placeholder="e.g. Ajay's Kitchen"
          {...register("tenantName")}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
        />

        {errors.tenantName && (
          <p className="mt-1 text-sm text-red-500">
            {errors.tenantName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Email Address
        </label>

        <input
          type="email"
          {...register("email")}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
        />

        {errors.email && (
          <p className="mt-1 text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Phone Number
        </label>

        <input
          type="tel"
          {...register("phone")}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
        />

        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Password
        </label>

        <div className="relative">
          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            {...register("password")}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
            className="absolute right-3 top-3 text-slate-400"
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>

        {errors.password && (
          <p className="mt-1 text-sm text-red-500">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Confirm Password
        </label>

        <input
          type={
            showPassword
              ? "text"
              : "password"
          }
          {...register("confirmPassword")}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
        />

        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-500">
            {
              errors.confirmPassword
                .message
            }
          </p>
        )}
      </div>

      {/* Terms */}
      <div>
        <label className="flex items-start gap-3 text-sm text-slate-400">
          <input
            type="checkbox"
            {...register("terms")}
            className="mt-1"
          />

          <span>
            I agree to the Terms of Service
            and Privacy Policy
          </span>
        </label>

        {errors.terms && (
          <p className="mt-1 text-sm text-red-500">
            {errors.terms.message}
          </p>
        )}
      </div>

      {/* Server Messages */}
      {serverError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2
              className="animate-spin"
              size={18}
            />
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </button>

      <div className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-indigo-400"
        >
          Sign In
        </Link>
      </div>
    </form>
  );
}