import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, loading, authChecked, user } = useAuth();

  if (!authChecked || loading === 'pending') return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles?.length > 0 && !roles.includes(user?.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
