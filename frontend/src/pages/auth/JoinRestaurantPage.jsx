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
    <div className="w-full animate-fade-in">
      {result ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold font-hanken text-on-surface dark:text-zinc-100 mb-2">Invite Accepted</h2>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mb-6">
            You joined as {ROLE_LABELS[result.user?.role] || result.user?.role || 'a team member'}.
          </p>
          <Link to="/login">
            <Button className="w-full font-bold">Sign In</Button>
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold font-hanken text-center text-on-surface dark:text-zinc-100 mb-1">Join Restaurant</h2>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 text-center mb-6">Complete your profile to accept the invite</p>

          {!token && <div className="px-4 py-2 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center mb-4 font-semibold">Invite token is missing</div>}
          {error && <div className="px-4 py-2 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center mb-4 font-semibold">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input id="join-first" label="First Name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
              <Input id="join-last" label="Last Name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
            </div>
            <Input id="join-phone" label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input id="join-password" label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <Button type="submit" loading={loading} disabled={!token} className="w-full font-bold">Accept Invite</Button>
          </form>

          <p className="text-center mt-5 text-sm text-on-surface-variant dark:text-zinc-400">
            Already accepted? <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}
