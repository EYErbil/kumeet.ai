import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';

const VerifyEmail = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResendEmail = async () => {
    try {
      if (user) {
        await sendEmailVerification(user);
        setResendSuccess(true);
        setError('');
      }
    } catch (error) {
      setError(error.message);
      setResendSuccess(false);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold text-purple-600">
            kumeet.ai
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
        </div>

        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Verification Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  A verification email has been sent to{' '}
                  <span className="font-medium">{user?.email}</span>.
                  Please check your inbox and spam folder.
                </p>
                <p className="mt-2">
                  After verifying your email, you can{' '}
                  <Link to="/login" className="font-medium text-yellow-800 underline">
                    log in here
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        {resendSuccess && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">
              Verification email sent successfully!
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Didn't receive the email?{' '}
            <button
              onClick={handleResendEmail}
              className="font-medium text-purple-600 hover:text-purple-500"
            >
              Resend verification email
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 