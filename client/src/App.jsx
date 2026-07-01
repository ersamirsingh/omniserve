import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import AppRouter from './app/router/AppRouter';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return <AppRouter />;
}
