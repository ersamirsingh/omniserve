import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineShieldCheck, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { acceptInviteApi } from '../../api/models/systemAdmin.api';
import { fetchCurrentUser } from '../../store/authSlice';

export default function AcceptSystemAdminInvite() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setErrorMsg('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('No invitation token found in the URL. Please use the link sent in your email invitation.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (form.password.length < 12) {
      setErrorMsg('Password must be at least 12 characters long');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await acceptInviteApi({
        token,
        name: form.name,
        password: form.password,
      });

      const accessToken = response.data?.data?.accessToken;
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }

      setSuccess(true);
      
      // Auto-login by fetching current user into Redux store
      await dispatch(fetchCurrentUser(true)).unwrap();

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to accept invitation. The link may have expired or already been accepted.');
      setLoading(false);
    }
  };

  const togglePasswordButton = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-on-surface-variant/50 hover:text-on-surface dark:text-zinc-550 dark:hover:text-zinc-300 transition-colors flex items-center justify-center p-1 cursor-pointer"
    >
      {showPassword ? <HiOutlineEyeSlash className="text-lg" /> : <HiOutlineEye className="text-lg" />}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* Brand */}
        <div className="flex flex-col items-center gap-2">
          <img src="/omniserve_logo.png" alt="OmniServe Logo" className="w-12 h-12 object-contain rounded-xl" />
          <h1 className="font-hanken text-2xl font-black text-primary dark:text-primary-fixed-dim tracking-tight mt-1">
            OmniServe Operations OS
          </h1>
          <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
            Platform Setup
          </span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-on-surface dark:text-zinc-200">
            Activate System Administrator Account
          </h2>
          <p className="text-xs text-on-surface-variant">
            Complete your onboarding to gain access to the platform control cockpit.
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="alert alert-error text-xs rounded-lg py-2.5 flex items-start gap-2 shadow-xs bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-450">
            <HiOutlineExclamationTriangle className="text-lg shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {success ? (
          <div className="alert alert-success text-xs rounded-lg py-3 flex flex-col items-center justify-center text-center gap-2 shadow-xs bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-450 animate-pulse">
            <HiOutlineShieldCheck className="text-3xl text-emerald-500" />
            <div>
              <strong className="block">Account Activated Successfully</strong>
              Signing you in and redirecting to admin dashboard...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Full Name"
              type="text"
              name="name"
              placeholder="e.g. Alexis Martinez"
              value={form.name}
              onChange={handleChange}
              required
              disabled={loading}
              icon={<HiOutlineUser />}
            />

            <Input
              label="Choose Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
              icon={<HiOutlineLockClosed />}
              rightElement={togglePasswordButton}
              helperText="Must be at least 12 characters long and include numbers/symbols."
            />

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="••••••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
              icon={<HiOutlineLockClosed />}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              loading={loading}
              disabled={!form.name || !form.password || !form.confirmPassword}
            >
              Activate Admin Account
            </Button>
          </form>
        )}

        {!token && !success && (
          <div className="text-[11px] text-center text-zinc-500 mt-2 flex items-center justify-center gap-1.5 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
            <HiOutlineExclamationTriangle className="text-amber-500 text-sm shrink-0" />
            Please click the invitation link directly from your email.
          </div>
        )}
      </div>
    </div>
  );
}
