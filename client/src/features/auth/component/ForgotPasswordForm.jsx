import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // API Call
      // await forgotPasswordApi(data)

      console.log(data);

      setEmailSent(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2
            size={70}
            className="text-green-500"
          />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">
            Check Your Email
          </h2>

          <p className="mt-2 text-slate-400">
            We have sent a password reset link to
          </p>

          <p className="mt-1 font-medium text-indigo-400">
            {getValues("email")}
          </p>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
        <p className="text-sm text-slate-400">
          Enter the email address associated with
          your account and we'll send you a link to
          reset your password.
        </p>
      </div>

      {/* Email */}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Email Address
        </label>

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-4 top-4 text-slate-500"
          />

          <input
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-12 pr-4 text-white outline-none transition focus:border-indigo-500"
          />
        </div>

        {errors.email && (
          <p className="mt-1 text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
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
              size={18}
              className="animate-spin"
            />
            Sending Link...
          </>
        ) : (
          "Send Reset Link"
        )}
      </button>

      {/* Back to Login */}

      <div className="text-center">
        <Link
          to="/login"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}