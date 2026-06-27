import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { DINEIN_SCOPE_STORAGE_KEY } from './dinein.constants';

const readScope = () => {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(localStorage.getItem(DINEIN_SCOPE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const deriveFromUser = (user) => ({
  tenantId: user?.tenantId || user?.tenant?._id || user?.tenant?.id || '',
  outletId:
    user?.outletId ||
    user?.outlet?._id ||
    user?.outlet?.id ||
    user?.outletIds?.[0] ||
    '',
  userId: user?.id || user?._id || '',
  userRole: user?.role || '',
  userEmail: user?.email || '',
});

export function useDineInScope() {
  const { user } = useAuth();
  const [scope, setScope] = useState(() => ({
    ...deriveFromUser(user),
    ...readScope(),
  }));

  useEffect(() => {
    const nextDefaults = deriveFromUser(user);
    setScope((current) => ({
      tenantId: current.tenantId || nextDefaults.tenantId,
      outletId: current.outletId || nextDefaults.outletId,
      userId: current.userId || nextDefaults.userId,
      userRole: current.userRole || nextDefaults.userRole,
      userEmail: current.userEmail || nextDefaults.userEmail,
    }));
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DINEIN_SCOPE_STORAGE_KEY, JSON.stringify(scope));
    }
  }, [scope]);

  const updateScopeField = (field, value) => {
    setScope((current) => ({ ...current, [field]: value }));
  };

  const resetScope = () => {
    const nextScope = deriveFromUser(user);
    setScope(nextScope);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DINEIN_SCOPE_STORAGE_KEY, JSON.stringify(nextScope));
    }
  };

  const isReady = Boolean(scope.tenantId && scope.outletId);

  return useMemo(
    () => ({ scope, isReady, updateScopeField, resetScope }),
    [scope, isReady]
  );
}
