import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export default function RegisterPage() {
  const { register, loading, error, clearErr } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', tenantName: '' });

  // Clear errors on mount
  useEffect(() => {
    clearErr();
  }, [clearErr]);

  const handleChange = (e) => {
    clearErr();
    setLocalError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleConfirmPasswordChange = (e) => {
    clearErr();
    setLocalError('');
    setConfirmPassword(e.target.value);
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { label: 'Weak', textColor: 'text-red-500' };
    if (score === 3) return { label: 'Medium', textColor: 'text-yellow-500' };
    return { label: 'Strong', textColor: 'text-emerald-500' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (form.password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }
    const result = await register(form);
    if (result.meta?.requestStatus === 'fulfilled') {
      addToast('Account created! Please sign in.', 'success');
      navigate('/login');
    }
  };

  const togglePasswordButton = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-on-surface-variant/50 hover:text-on-surface dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors flex items-center justify-center p-1 cursor-pointer"
    >
      <span className="material-symbols-outlined text-[20px]">
        {showPassword ? 'visibility_off' : 'visibility'}
      </span>
    </button>
  );

  const toggleConfirmPasswordButton = (
    <button
      type="button"
      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
      className="text-on-surface-variant/50 hover:text-on-surface dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors flex items-center justify-center p-1 cursor-pointer"
    >
      <span className="material-symbols-outlined text-[20px]">
        {showConfirmPassword ? 'visibility_off' : 'visibility'}
      </span>
    </button>
  );

  const strength = getPasswordStrength(form.password);
  const activeError = localError || error;

  return (
    <div className="animate-fade-in w-full">
      <div className="mb-6">
        <h2 className="font-hanken text-headline-md text-on-surface dark:text-zinc-100 font-bold text-[22px]">Create Account</h2>
        <p className="font-sans text-body-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[13px]">
          Start managing your restaurant.
        </p>
      </div>

      {activeError && (
        <div className="mb-4 p-3 bg-error-container/40 border border-error/20 rounded-lg text-error text-[12px] font-medium flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{activeError}</span>
        </div>
      )}

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            id="reg-first"
            label="First Name"
            name="firstName"
            placeholder="John"
            value={form.firstName}
            onChange={handleChange}
            required
            icon="person"
          />
          <Input
            id="reg-last"
            label="Last Name"
            name="lastName"
            placeholder="Doe"
            value={form.lastName}
            onChange={handleChange}
            required
            icon="person"
          />
        </div>

        <Input
          id="reg-email"
          label="Email Address"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
          icon="mail"
          autoComplete="email"
        />

        <Input
          id="reg-tenant"
          label="Organization Name"
          name="tenantName"
          placeholder="My Organization"
          value={form.tenantName}
          onChange={handleChange}
          required
          icon="store"
        />

        <div>
          <Input
            id="reg-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Min 8, upper, lower, number, special"
            value={form.password}
            onChange={handleChange}
            required
            icon="lock"
            rightElement={togglePasswordButton}
            autoComplete="new-password"
          />
          {strength && (
            <div className="mt-1.5 flex flex-col gap-1.5 animate-fade-in">
              <div className="flex justify-between items-center text-[11px] font-semibold text-on-surface-variant dark:text-zinc-400">
                <span>Password Strength:</span>
                <span className={strength.textColor}>{strength.label}</span>
              </div>
              <div className="flex gap-1 h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-350 ${
                  strength.label === 'Weak' ? 'w-1/3 bg-red-500' :
                  strength.label === 'Medium' ? 'w-2/3 bg-yellow-500' : 'w-full bg-emerald-500'
                }`} />
              </div>
            </div>
          )}
        </div>

        <Input
          id="reg-confirm"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          required
          icon="lock"
          rightElement={toggleConfirmPasswordButton}
          autoComplete="new-password"
        />

        <Button type="submit" loading={loading === 'pending'} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <div className="mt-6 border-t border-border-base/60 dark:border-zinc-800 pt-4 text-center">
        <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 mb-3">
          Already have an account?
        </p>
        <Link
          to="/login"
          className="inline-flex justify-center w-full py-2 px-4 border border-border-base dark:border-zinc-800 rounded-lg font-label-md text-on-surface dark:text-zinc-300 bg-surface dark:bg-zinc-950 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-150 text-[12px] font-semibold"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
