import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      console.log("Login Data:", data);

      // API Call Here
      // const response = await loginApi(data)

      // dispatch(setUser(response.user))

      // navigate("/app/dashboard")
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Email Address
        </label>

        <input
          type="email"
          placeholder="john@example.com"
          {...register("email")}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
        />

        {errors.email && (
          <p className="mt-1 text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">
            Password
          </label>

          <Link
            to="/forgot-password"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Forgot Password?
          </Link>
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            {...register("password")}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
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

      {/* Remember Me */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-700 bg-slate-800"
          />
          Remember me
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2
              className="animate-spin"
              size={18}
            />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </button>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>

        <div className="relative flex justify-center">
          <span className="bg-slate-900 px-4 text-sm text-slate-500">
            OR
          </span>
        </div>
      </div>

      {/* Google Login */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white hover:bg-slate-700"
      >
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="google"
          className="h-5 w-5"
        />

        Continue with Google
      </button>

      {/* Signup */}
      <div className="text-center text-sm text-slate-400">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-indigo-400 hover:text-indigo-300"
        >
          Create Account
        </Link>
      </div>
    </form>
  );
}