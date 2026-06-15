import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const { login, loading, error, clearErr } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => { clearErr(); setForm({ ...form, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
    if (result.meta?.requestStatus === 'fulfilled') navigate('/dashboard');
  };

  return (
    <div className="w-full max-w-[440px] bg-[rgba(26,29,46,0.65)] backdrop-blur-2xl border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-10 animate-fade-in">
      <div className="flex items-center gap-2 justify-center mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-extrabold text-lg text-white">F</div>
        <div className="font-bold text-lg text-slate-100"><span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Food</span>Mesh</div>
      </div>
      <h1 className="text-xl font-bold text-center text-slate-100 mb-1">Welcome back</h1>
      <p className="text-sm text-slate-500 text-center mb-8">Sign in to your dashboard</p>

      {error && <div className="px-4 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-400 text-sm text-center mb-4">{error}</div>}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input id="login-email" label="Email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        <Input id="login-password" label="Password" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
        <Button type="submit" loading={loading === 'pending'} className="w-full">Sign In</Button>
      </form>

      <p className="text-center mt-6 text-sm text-slate-500">Don't have an account? <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300">Create one</Link></p>
    </div>
  );
}
