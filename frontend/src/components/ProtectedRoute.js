import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChangedListener } from '../services/api/auth';
import ROUTES from '../constants/routes';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if the route is public
  const publicRoutes = [
    ROUTES.AUTH.LOGIN,
    ROUTES.AUTH.REGISTER,
    ROUTES.AUTH.VERIFY_EMAIL,
    ROUTES.AUTH.FORGOT_PASSWORD,
    ROUTES.AUTH.RESET_PASSWORD
  ];
  
  const isPublicRoute = publicRoutes.some(route => location.pathname === route);

  // Not logged in: can access public routes, redirected to login for protected routes
  if (!user) {
    if (isPublicRoute) {
      return children;
    }
    console.log('Redirecting to login: User not authenticated');
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  // If user is logged in but email not verified, only allow verify-email page
  if (user && !user.emailVerified && location.pathname !== ROUTES.AUTH.VERIFY_EMAIL) {
    console.log('Redirecting to verify-email: Email not verified');
    return <Navigate to={ROUTES.AUTH.VERIFY_EMAIL} replace />;
  }

  // Logged in and email verified: can access protected routes, redirected to dashboard for public routes
  if (user && user.emailVerified && isPublicRoute) {
    console.log('Redirecting to dashboard: User is authenticated and trying to access public route');
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
};

export default ProtectedRoute; 