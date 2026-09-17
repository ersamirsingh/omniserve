import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { HiOutlineEnvelope, HiOutlineExclamationTriangle, HiOutlineCheckCircle } from 'react-icons/hi2';
import { forgotPasswordApi } from '../../api/models/auth.api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setIsGoogleAccount(false);

    try {
      const res = await forgotPasswordApi({ email });
      setSuccessMessage(res.data?.message || 'Password reset email sent.');
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === 'GOOGLE_AUTH_ACCOUNT') {
        setIsGoogleAccount(true);
      }
      setError(resp?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in w-full">
      <div className="mb-6">
        <h2 className="font-hanken text-headline-md text-on-surface dark:text-zinc-100 font-bold text-[22px]">Reset Password</h2>
        <p className="font-sans text-body-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[13px]">
          Enter your email to receive a password reset link.
        </p>
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded-lg text-[12px] font-medium flex items-center gap-2 animate-fade-in ${
          isGoogleAccount 
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400' 
            : 'bg-error-container/40 border border-error/20 text-error'
        }`}>
          <HiOutlineExclamationTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-550/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-[12px] font-medium flex items-center gap-2 animate-fade-in">
          <HiOutlineCheckCircle size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {!successMessage && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="forgot-email"
            label="Email Address"
            type="email"
            placeholder="admin@restaurant.com"
            value={email}
            onChange={(e) => {
              setError(null);
              setEmail(e.target.value);
            }}
            required
            icon={<HiOutlineEnvelope size={18} />}
            autoComplete="email"
          />

          <Button type="submit" loading={loading} className="w-full mt-2">
            Send Reset Link
          </Button>
        </form>
      )}

      {isGoogleAccount && (
        <div className="mt-4">
          <Link
            to="/login"
            className="inline-flex justify-center w-full py-2 px-4 border border-border-base dark:border-zinc-800 rounded-lg font-label-md text-on-surface dark:text-zinc-300 bg-surface dark:bg-zinc-950 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 text-[12px] font-semibold"
          >
            Sign In with Google
          </Link>
        </div>
      )}

      <div className="mt-6 border-t border-border-base/60 dark:border-zinc-800 pt-4 text-center">
        <Link
          to="/login"
          className="text-[12px] font-medium text-primary dark:text-primary-fixed-dim hover:underline"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
