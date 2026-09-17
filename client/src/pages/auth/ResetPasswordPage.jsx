import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineExclamationTriangle, HiOutlineCheckCircle } from 'react-icons/hi2';
import { resetPasswordApi } from '../../api/models/auth.api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleChange = (e) => {
    setError(null);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Password reset token is missing.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPasswordApi({ token, password: form.password });
      setSuccessMessage('Password has been reset successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordButton = (
    <button
      type="button"
      className="text-on-surface-variant/50 hover:text-on-surface dark:text-zinc-500 dark:hover:text-zinc-300 focus:outline-none cursor-pointer transition-colors p-1"
      onClick={() => setShowPassword(!showPassword)}
      tabIndex={-1}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
    </button>
  );

  return (
    <div className="animate-fade-in w-full">
      <div className="mb-6">
        <h2 className="font-hanken text-headline-md text-on-surface dark:text-zinc-100 font-bold text-[22px]">Set New Password</h2>
        <p className="font-sans text-body-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[13px]">
          Enter your new password below.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container/40 border border-error/20 rounded-lg text-error text-[12px] font-medium flex items-center gap-2 animate-fade-in">
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

      {!token && (
        <div className="mb-4 p-3 bg-error-container/40 border border-error/20 rounded-lg text-error text-[12px] font-medium flex items-center gap-2">
          <HiOutlineExclamationTriangle size={16} />
          <span>Invalid or missing reset token. Please request a new link.</span>
        </div>
      )}

      {!successMessage && token && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="reset-password"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
            icon={<HiOutlineLockClosed size={18} />}
            rightElement={togglePasswordButton}
            autoComplete="new-password"
          />

          <Input
            id="reset-confirm"
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            icon={<HiOutlineLockClosed size={18} />}
            autoComplete="new-password"
          />

          <Button type="submit" loading={loading} className="w-full mt-2">
            Reset Password
          </Button>
        </form>
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
