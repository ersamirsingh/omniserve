import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export default function RegisterPage() {
  const { register, loading, error, clearErr } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', tenantName: '' });

  const handleChange = (e) => { clearErr(); setForm({ ...form, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(form);
    if (result.meta?.requestStatus === 'fulfilled') { addToast('Account created! Please sign in.', 'success'); navigate('/login'); }
  };

  return (
    <div className="w-full max-w-[440px] bg-[rgba(26,29,46,0.65)] backdrop-blur-2xl border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-10 animate-fade-in">
      <div className="flex items-center gap-2 justify-center mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-extrabold text-lg text-white">F</div>
        <div className="font-bold text-lg text-slate-100"><span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Food</span>Mesh</div>
      </div>
      <h1 className="text-xl font-bold text-center text-slate-100 mb-1">Create account</h1>
      <p className="text-sm text-slate-500 text-center mb-8">Start managing your restaurant</p>

      {error && <div className="px-4 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-400 text-sm text-center mb-4">{error}</div>}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Input id="reg-first" label="First Name" name="firstName" placeholder="John" value={form.firstName} onChange={handleChange} required />
          <Input id="reg-last" label="Last Name" name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
        </div>
        <Input id="reg-email" label="Email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        <Input id="reg-tenant" label="Organization Name" name="tenantName" placeholder="My Restaurant" value={form.tenantName} onChange={handleChange} required />
        <Input id="reg-password" label="Password" type="password" name="password" placeholder="Min 8, upper, lower, number, special" value={form.password} onChange={handleChange} required />
        <Button type="submit" loading={loading === 'pending'} className="w-full">Create Account</Button>
      </form>

      <p className="text-center mt-6 text-sm text-slate-500">Already have an account? <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300">Sign in</Link></p>
    </div>
  );
}
