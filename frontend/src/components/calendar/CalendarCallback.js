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
        // Check if user is authenticated
        const currentUser = getCurrentUser();
        if (!currentUser) {
          console.log('No authenticated user found. Redirecting to login...');
          setStatus('Authentication required. Redirecting to login...');
          setTimeout(() => navigate('/login?redirect=/settings'), 3000);
          return;
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
        
        // Get the user ID from Firebase Auth
        const userId = currentUser.uid;
        
        if (path.includes('/calendar/google/callback')) {
          setStatus('Processing Google Calendar authorization...');
          
          try {
            // Use the public endpoint that doesn't require authentication
            console.log('Calling public endpoint to save Google credentials with user ID:', userId);
            console.log('Full URL path:', location.pathname);
            console.log('Full code length:', code.length);
            
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
              
              setStatus('Successfully connected to Google Calendar! Redirecting...');
              
              // Redirect to settings page with integrations tab active
              setTimeout(() => {
                setIsProcessing(false);
                navigate('/settings?tab=integrations#integrations');
              }, 3000);
            } else if (response.data && response.data.error) {
              console.error('Error from API:', response.data.error);
              
              // Format a more user-friendly error message
              let errorMessage = response.data.error || 'Unknown error';
              let errorDetails = response.data.error_details || '';
              
              if (errorMessage.includes('invalid_grant') || errorDetails.includes('invalid_grant')) {
                errorMessage = 'Authorization code has expired or already been used. Please try connecting again.';
              } else if (errorMessage.includes('invalid_client') || errorDetails.includes('invalid_client')) {
                errorMessage = 'Invalid client credentials. Please contact support.';
              } else if (errorMessage.includes('access_denied') || errorDetails.includes('access_denied')) {
                errorMessage = 'Access denied. You may have declined the permission request.';
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
          // Handle Outlook callback here if needed
          setStatus('Processing Outlook Calendar authorization...');
          // Similar implementation as Google callback
          // ...
          
          setTimeout(() => {
            setIsProcessing(false);
            navigate('/settings?tab=integrations#integrations');
          }, 3000);
        } else {
          setStatus('Unknown calendar provider');
          setError('The URL path does not match any known calendar provider');
          setTimeout(() => navigate('/settings'), 3000);
        }
      } catch (e) {
        console.error('Error in calendar callback:', e);
        setStatus(`Error: ${e.message}. Redirecting to settings...`);
        setError(e.message);
        
        setTimeout(() => {
          setIsProcessing(false);
          navigate('/settings?tab=integrations#integrations');
        }, 3000);
      }
    };

    processCallback();
  }, [navigate, location, isProcessing]);

  return (
    <div className="container mx-auto p-4 text-center mt-20">
      <h1 className="text-2xl font-bold mb-4">Calendar Authorization</h1>
      <div className="mb-4">
        <p>{status}</p>
        {error && (
          <p className="text-red-500 mt-2">
            Error: {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default CalendarCallback; 