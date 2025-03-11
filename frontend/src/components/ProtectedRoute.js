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
  
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If user is not authenticated and trying to access any route
  if (!user) {
    // Allow access to public routes
    if (isPublicRoute) {
      return children;
    }
    // Redirect to login for all other routes
    console.log('Redirecting to login: User not authenticated');
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  // If user is authenticated
  if (user) {
    // Special case: Allow access to verify-email page if email is not verified
    if (location.pathname === ROUTES.AUTH.VERIFY_EMAIL && !user.emailVerified) {
      return children;
    }
    
    // Redirect away from public routes (login, register, etc.)
    if (isPublicRoute) {
      console.log('Redirecting to dashboard: User is authenticated and trying to access public route');
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
    
    // For root path, redirect to dashboard
    if (location.pathname === ROUTES.HOME) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
    
    // Check if email is verified for all other routes
    if (!user.emailVerified && location.pathname !== ROUTES.AUTH.VERIFY_EMAIL) {
      console.log('Redirecting to verify-email: Email not verified');
      return <Navigate to={ROUTES.AUTH.VERIFY_EMAIL} replace />;
    }
    
    // Allow access to all other routes when authenticated and email verified
    return children;
  }

  // This should never be reached, but just in case
  return children;
};

export default ProtectedRoute; 