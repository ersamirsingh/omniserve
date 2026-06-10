import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name is required"),

    lastName: z
      .string()
      .min(2, "Last name is required"),

    email: z
      .string()
      .email("Invalid email address"),

    phone: z
      .string()
      .min(10, "Phone number is required"),

    password: z
      .string()
      .min(
        8,
        "Password must be at least 8 characters"
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
  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms: false,
    },
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      console.log(data);

      // API Call
      // const response = await registerApi(data)

      // navigate("/verify-email")

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
      {/* First + Last Name */}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            First Name
          </label>

          <input
            type="text"
            placeholder="Nitish"
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
            placeholder="Kumar"
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

      {/* Email */}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
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

      {/* Phone */}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Phone Number
        </label>

        <input
          type="tel"
          placeholder="+91 9876543210"
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
            placeholder="Create password"
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

        <div className="relative">
          <input
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirm password"
            {...register(
              "confirmPassword"
            )}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                !showConfirmPassword
              )
            }
            className="absolute right-3 top-3 text-slate-400"
          >
            {showConfirmPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>

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
            I agree to the{" "}
            <Link
              to="/terms"
              className="text-indigo-400"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="text-indigo-400"
            >
              Privacy Policy
            </Link>
          </span>
        </label>

        {errors.terms && (
          <p className="mt-1 text-sm text-red-500">
            {errors.terms.message}
          </p>
        )}
      </div>

      {/* Register Button */}

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
            Creating Account...
          </>
        ) : (
          "Create Account"
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

      {/* Google Register */}

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

      {/* Login Link */}

      <div className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-indigo-400 hover:text-indigo-300"
        >
          Sign In
        </Link>
      </div>
    </form>
  );
}