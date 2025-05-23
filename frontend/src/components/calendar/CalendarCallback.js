import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getCurrentUser } from '../../services/api/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CalendarCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('Processing your request...');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the user ID from Firebase Auth
        const currentUser = getCurrentUser();
        console.log('CalendarCallback: Current user from Firebase:', 
          currentUser ? { uid: currentUser.uid, email: currentUser.email } : 'No user');
        
        // First try Firebase auth, then try state parameter
        if (!currentUser || !currentUser.uid) {
          if (stateUserId) {
            console.log('No Firebase user found, but found user ID in state parameter. Using state user ID:', stateUserId);
          } else {
            console.log('No authenticated user found and no user ID in state. Redirecting to login...');
            setStatus('Authentication required. Redirecting to login...');
            setTimeout(() => navigate('/login?redirect=/settings'), 3000);
            return;
          }
        }
        
        // Get the query parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        const state = params.get('state');
        
        console.log('CalendarCallback: Processing callback with params:', { 
          code: code ? code.substring(0, 10) + '...' : null,
          error,
          state,
          path: location.pathname
        });
        
        // Try to get user ID from state parameter if it exists
        let stateUserId = null;
        if (state) {
          try {
            const stateObj = JSON.parse(decodeURIComponent(state));
            if (stateObj && stateObj.userId) {
              stateUserId = stateObj.userId;
              console.log('Found user ID in state parameter:', stateUserId);
            }
          } catch (e) {
            console.error('Error parsing state parameter:', e);
          }
        }
        
        // Check if there's an error
        if (error) {
          setStatus(`Authentication failed: ${error}`);
          setError(error);
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        // Check if code is present
        if (!code) {
          setStatus('No authorization code found');
          setError('No authorization code was returned from Google');
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        // Check if we've already processed this code
        const processedCodes = JSON.parse(sessionStorage.getItem('processedAuthCodes') || '[]');
        if (processedCodes.includes(code)) {
          console.log('This authorization code has already been processed');
          setStatus('This authorization code has already been processed. Redirecting...');
          setTimeout(() => navigate('/settings?completeGoogleAuth=true'), 2000);
          return;
        }
        
        // Prevent duplicate processing
        if (isProcessing) {
          console.log('Already processing a request, skipping');
          return;
        }
        
        setIsProcessing(true);
        
        // Determine which calendar type based on the URL path
        const path = location.pathname;
        
        // Get the user ID from the current authenticated user or from state
        const userId = currentUser?.uid || stateUserId;
        
        if (!userId || userId.trim() === '') {
          throw new Error('User ID is empty. Authentication required.');
        }
        
        if (path.includes('/calendar/google/callback')) {
          setStatus('Processing Google Calendar authorization...');
          
          try {
            // Use the public endpoint that doesn't require authentication
            console.log('Calling public endpoint to save Google credentials with user ID:', userId);
            console.log('Full URL path:', location.pathname);
            console.log('Full code length:', code.length);
            console.log(`Making request to: ${API_URL}/calendar/public-save-google-credentials`);
            
            const response = await axios.get(
              `${API_URL}/calendar/public-save-google-credentials?code=${encodeURIComponent(code)}&user_id=${userId}`
            );
            
            console.log('Public save Google credentials response:', response.data);
            
            // Mark this code as processed
            processedCodes.push(code);
            sessionStorage.setItem('processedAuthCodes', JSON.stringify(processedCodes));
            
            if (response.data && response.data.status === 'success') {
              setStatus(`Success: ${response.data.message}`);
              
              // Store the connection status in localStorage
              const calendarStatus = {
                googleCalendar: {
                  connected: true,
                  email: response.data.email || '',
                  lastSync: new Date().toISOString()
                },
                outlookCalendar: {
                  connected: false,
                  email: '',
                  lastSync: ''
                }
              };
              
              localStorage.setItem('calendarStatus', JSON.stringify(calendarStatus));
              console.log('Stored calendar status in localStorage:', calendarStatus);
              
              // Immediately check status from server to confirm
              try {
                console.log('Verifying calendar status with server...');
                const statusResponse = await axios.get(`${API_URL}/calendar/status?user_id=${userId}`);
                console.log('Server calendar status response:', statusResponse.data);
                
                if (!statusResponse.data.google) {
                  console.error('WARNING: Server says Google Calendar is not connected!');
                }
              } catch (statusError) {
                console.error('Error checking calendar status:', statusError);
              }
              
              setStatus('Successfully connected to Google Calendar! Redirecting...');
              
              // Redirect to settings page with integrations tab active
              setTimeout(() => {
                setIsProcessing(false);
                navigate('/settings?tab=integrations#integrations');
              }, 3000);
            } else if (response.data && response.data.error) {
              console.error('Error from API:', response.data.error);
              console.error('Full error response:', response.data);
              
              // Format a more user-friendly error message
              let errorMessage = response.data.error || 'Unknown error';
              let errorDetails = response.data.error_details || '';
              
              if (errorMessage.includes('invalid_grant') || errorDetails.includes('invalid_grant')) {
                errorMessage = 'Authorization code has expired or already been used. Please try connecting again.';
              } else if (errorMessage.includes('invalid_client') || errorDetails.includes('invalid_client')) {
                errorMessage = 'Invalid client credentials. Please contact support.';
              } else if (errorMessage.includes('access_denied') || errorDetails.includes('access_denied')) {
                errorMessage = 'Access denied. You may have declined the permission request.';
              } else if (errorMessage.includes('User') && errorMessage.includes('does not exist')) {
                errorMessage = 'Your user account was not found in our database. Please try logging out and back in.';
              }
              
              setStatus(`${errorMessage}. Redirecting to settings...`);
              setError(errorDetails || errorMessage);
              
              // Clear any stored calendar status for Google
              try {
                const storedStatus = localStorage.getItem('calendarStatus');
                if (storedStatus) {
                  const parsedStatus = JSON.parse(storedStatus);
                  if (parsedStatus.googleCalendar) {
                    parsedStatus.googleCalendar.connected = false;
                    localStorage.setItem('calendarStatus', JSON.stringify(parsedStatus));
                    console.log('Reset Google Calendar connection status in localStorage due to error');
                  }
                }
              } catch (storageError) {
                console.error('Error updating localStorage:', storageError);
              }
              
              // Redirect to settings page
              setTimeout(() => {
                setIsProcessing(false);
                navigate('/settings?tab=integrations#integrations');
              }, 3000);
            } else {
              setStatus('Connected to Google Calendar, but no details returned.');
              setTimeout(() => {
                setIsProcessing(false);
                navigate('/settings?tab=integrations#integrations');
              }, 3000);
            }
          } catch (apiError) {
            console.error('Error calling public endpoint:', apiError);
            console.error('Full error object:', JSON.stringify({
              message: apiError.message,
              response: apiError.response ? {
                status: apiError.response.status,
                data: apiError.response.data
              } : 'No response',
              request: apiError.request ? 'Request made but no response' : 'No request'
            }));
            
            let errorMessage = 'Error connecting to Google Calendar';
            let errorDetails = '';
            
            if (apiError.response) {
              console.error('Response data:', apiError.response.data);
              console.error('Response status:', apiError.response.status);
              
              errorDetails = JSON.stringify(apiError.response.data);
              
              // Check for specific error types in the response
              const responseData = apiError.response.data;
              if (responseData && typeof responseData === 'object') {
                if (responseData.error && responseData.error.includes('invalid_grant')) {
                  errorMessage = 'Authorization code has expired or already been used. Please try connecting again.';
                } else if (responseData.error && responseData.error.includes('invalid_client')) {
                  errorMessage = 'Invalid client credentials. Please contact support.';
                } else if (responseData.error && responseData.error.includes('User') && responseData.error.includes('does not exist')) {
                  errorMessage = 'Your user account was not found in our database. Please try logging out and back in.';
                } else if (responseData.error) {
                  errorMessage = responseData.error;
                }
              }
            } else {
              errorDetails = apiError.message;
              
              if (apiError.message.includes('Network Error')) {
                errorMessage = 'Network error. Please check your internet connection.';
              }
            }
            
            setStatus(`${errorMessage}. Redirecting to settings...`);
            setError(errorDetails);
            
            // Redirect to settings page
            setTimeout(() => {
              setIsProcessing(false);
              navigate('/settings?tab=integrations#integrations');
            }, 3000);
          }
        } else if (path.includes('/calendar/outlook/callback')) {
          setStatus('Redirecting to complete Outlook Calendar authorization...');
          // Store the code for later use
          localStorage.setItem('pendingOutlookAuthCode', code);
          
          // Mark this code as processed
          processedCodes.push(code);
          sessionStorage.setItem('processedAuthCodes', JSON.stringify(processedCodes));
          
          // Redirect to settings page with integrations tab active
          setTimeout(() => {
            setIsProcessing(false);
            navigate('/settings?tab=integrations&completeOutlookAuth=true#integrations');
          }, 1000);
        } else {
          setStatus('Unknown calendar type');
          setError(`Unrecognized callback path: ${path}`);
          setIsProcessing(false);
          setTimeout(() => navigate('/settings'), 3000);
        }
      } catch (error) {
        console.error('Error processing callback:', error);
        setStatus('An error occurred while connecting your calendar');
        setError(error.message);
        setIsProcessing(false);
        setTimeout(() => navigate('/settings'), 3000);
      }
    };
    
    processCallback();
  }, [location, navigate, isProcessing]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Calendar Integration</h2>
        <p className="text-gray-600 dark:text-gray-400">{status}</p>
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-lg text-sm">
            <p className="font-semibold">Error Details:</p>
            <p className="break-words">{error}</p>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">Please wait while we process your request...</p>
      </div>
    </div>
  );
};

export default CalendarCallback; 