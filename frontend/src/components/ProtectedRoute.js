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
    ROUTES.AUTH.VERIFY_EMAIL
  ];
  
  const isPublicRoute = publicRoutes.includes(location.pathname);

  console.log('Route protection check:', {
    currentPath: location.pathname,
    isPublicRoute,
    publicRoutes,
    isAuthenticated: !!user
  });

  // If user is not authenticated and trying to access a protected route
  if (!user && !isPublicRoute) {
    console.log('Redirecting to login: User not authenticated and route is protected');
    // Redirect to login page with the return url
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  // If user is authenticated and trying to access auth pages
  if (user && isPublicRoute) {
    console.log('Redirecting to dashboard: User is authenticated and trying to access public route');
    // Redirect to dashboard page
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // Render the protected route
  return children;
};

export default ProtectedRoute; 