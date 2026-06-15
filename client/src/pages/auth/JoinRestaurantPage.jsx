import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { acceptRestaurantJoinRequestApi } from '../../api/models/restaurantJoinRequest.api';
import { ROLE_LABELS } from '../../utils/constants';

export default function JoinRestaurantPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = Object.fromEntries(
        Object.entries(form)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value)
      );
      const response = await acceptRestaurantJoinRequestApi(token, payload);
      setResult(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] bg-[rgba(26,29,46,0.78)] backdrop-blur-2xl border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-8 animate-fade-in">
      <div className="flex items-center gap-2 justify-center mb-7">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-extrabold text-lg text-white">F</div>
        <div className="font-bold text-lg text-slate-100"><span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Food</span>Mesh</div>
      </div>

      {result ? (
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-100 mb-2">Invite accepted</h1>
          <p className="text-sm text-slate-500 mb-6">
            You joined as {ROLE_LABELS[result.user?.role] || result.user?.role || 'a team member'}.
          </p>
          <Link to="/login">
            <Button className="w-full">Sign In</Button>
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-bold text-center text-slate-100 mb-1">Join Restaurant</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Complete your profile to accept the invite</p>

          {!token && <div className="px-4 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-400 text-sm text-center mb-4">Invite token is missing</div>}
          {error && <div className="px-4 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-400 text-sm text-center mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input id="join-first" label="First Name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
              <Input id="join-last" label="Last Name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
            </div>
            <Input id="join-phone" label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input id="join-password" label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <Button type="submit" loading={loading} disabled={!token} className="w-full">Accept Invite</Button>
          </form>

          <p className="text-center mt-5 text-sm text-slate-500">
            Already accepted? <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300">Sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}
