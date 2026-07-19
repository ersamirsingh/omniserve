import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineExclamationTriangle } from 'react-icons/hi2';

export default function LoginPage() {
  const { login, loading, error, clearErr } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('omniserve_remember_me') === 'true';
  });

  const [form, setForm] = useState({
    email: localStorage.getItem('omniserve_remember_me') === 'true'
      ? localStorage.getItem('omniserve_remembered_email') || ''
      : '',
    password: ''
  });

  // Clear errors on page mount
  useEffect(() => {
    clearErr();
  }, [clearErr]);

  const handleChange = (e) => {
    clearErr();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem('omniserve_remembered_email');
      localStorage.setItem('omniserve_remember_me', 'false');
    } else {
      localStorage.setItem('omniserve_remember_me', 'true');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
    if (result.meta?.requestStatus === 'fulfilled') {
      if (rememberMe) {
        localStorage.setItem('omniserve_remembered_email', form.email);
        localStorage.setItem('omniserve_remember_me', 'true');
      } else {
        localStorage.removeItem('omniserve_remembered_email');
        localStorage.setItem('omniserve_remember_me', 'false');
      }
      navigate('/dashboard');
    }
  };

  const passwordLabel = (
    <div className="flex items-center justify-between w-full">
      <span>Password</span>
      <Link
        to="/forgot-password"
        className="font-label-sm text-label-sm text-primary dark:text-primary-fixed-dim hover:underline text-[12px] font-medium"
      >
        Forgot?
      </Link>
    </div>
  );

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
        <h2 className="font-hanken text-headline-md text-on-surface dark:text-zinc-100 font-bold text-[22px]">Sign In</h2>
        <p className="font-sans text-body-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[13px]">
          Access your operational dashboard.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container/40 border border-error/20 rounded-lg text-error text-[12px] font-medium flex items-center gap-2 animate-fade-in">
          <HiOutlineExclamationTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          id="login-email"
          label="Email Address"
          type="email"
          name="email"
          placeholder="admin@restaurant.com"
          value={form.email}
          onChange={handleChange}
          required
          icon={<HiOutlineEnvelope size={18} />}
          autoComplete="email"
        />

        <Input
          id="login-password"
          label={passwordLabel}
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
          icon={<HiOutlineLockClosed size={18} />}
          rightElement={togglePasswordButton}
          autoComplete="current-password"
        />

        <div className="flex items-center select-none">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={handleRememberMeChange}
            className="checkbox checkbox-primary h-4 w-4 text-primary focus:ring-primary/20 border-border-base dark:border-zinc-800 rounded bg-surface-subtle dark:bg-zinc-900 transition-colors cursor-pointer"
          />
          <label className="ml-2 block font-body-sm text-body-sm text-on-surface-variant dark:text-zinc-400 cursor-pointer text-[12px]" htmlFor="remember-me">
            Remember me for 30 days
          </label>
        </div>

        <Button type="submit" loading={loading === 'pending'} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      <div className="mt-6 border-t border-border-base/60 dark:border-zinc-800 pt-4 text-center">
        <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 mb-3">
          Don't have a platform account?
        </p>
        <Link
          to="/register"
          className="inline-flex justify-center w-full py-2 px-4 border border-border-base dark:border-zinc-800 rounded-lg font-label-md text-on-surface dark:text-zinc-300 bg-surface dark:bg-zinc-950 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 text-[12px] font-semibold"
        >
          Create Restaurant Tenant
        </Link>
      </div>
    </div>
  );
}
