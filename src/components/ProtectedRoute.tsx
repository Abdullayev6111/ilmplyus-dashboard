import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { API } from '../api/api';
import { useEffect } from 'react';
import Loading from './Loading';

const ProtectedRoute = () => {
  const isAuth = useAuthStore((state) => state.isAuth);
  const setUser = useAuthStore((state) => state.setUser);

  const { data: userData, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await API.get('/me');
      return data;
    },
    enabled: isAuth,
  });

  useEffect(() => {
    if (userData?.data) {
      setUser(userData.data);
    } else if (userData) {
      setUser(userData);
    }
  }, [userData, setUser]);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
