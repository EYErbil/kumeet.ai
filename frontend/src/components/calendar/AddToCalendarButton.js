import React, { useState, useEffect } from 'react';
import { FaCalendarPlus, FaGoogle, FaMicrosoft, FaCheck, FaTimes } from 'react-icons/fa';
import { isCalendarAvailable, addMeetingToCalendar, addActionItemToCalendar, getPreferredCalendarType } from '../../services/calendarIntegration';
import { getCalendarStatus } from '../../services/api/calendar';

/**
 * Add to Calendar Button Component
 * 
 * This component provides a button to add meetings or action items to the user's calendar
 * 
 * @param {Object} props
 * @param {Object} props.item - The meeting or action item to add to calendar
 * @param {string} props.type - The type of item ('meeting' or 'action-item')
 * @param {string} props.buttonText - Optional custom button text
 * @param {string} props.className - Optional additional CSS classes
 */
const AddToCalendarButton = ({ item, type, buttonText, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    google: false,
    outlook: false
  });
  const [result, setResult] = useState(null);
  const [authWindowOpen, setAuthWindowOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Function to check which calendars are available
  const checkCalendars = async () => {
    try {
      console.log('Checking calendar availability...');
      const status = await getCalendarStatus();
      console.log('Calendar status response:', status);
      
      // Get Google status directly as a backup
      let googleAvailable = status.googleCalendar.connected;
      let outlookAvailable = status.outlookCalendar.connected;
      
      // If Google is not connected according to the general status, check directly
      if (!googleAvailable) {
        try {
          const { checkGoogleConnection } = await import('../../services/api/calendar');
          const googleStatus = await checkGoogleConnection();
          console.log('Direct Google connection check:', googleStatus);
          
          // Update Google availability based on direct check
          googleAvailable = googleStatus.connected || false;
        } catch (googleError) {
          console.error('Error checking Google connection directly:', googleError);
        }
      }
      
      console.log('Final calendar status:', { google: googleAvailable, outlook: outlookAvailable });
      
      setCalendarStatus({
        google: googleAvailable,
        outlook: outlookAvailable
      });
      
      return { google: googleAvailable, outlook: outlookAvailable };
    } catch (error) {
      console.error('Error checking calendar availability:', error);
      return { google: false, outlook: false };
    }
  };

  // Check calendars on component mount and periodically
  useEffect(() => {
    // Initial check
    checkCalendars();
    
    // Set up periodic check every 30 seconds instead of 5 seconds
    // to reduce the number of API calls and logs
    const intervalId = setInterval(() => {
      checkCalendars();
    }, 30000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle adding to calendar
  const handleAddToCalendar = async (calendarType) => {
    setIsLoading(true);
    setShowDropdown(false);
    setResult(null);
    
    try {
      console.log(`Adding ${type} to ${calendarType} calendar:`, item);
      
      let response;
      
      if (type === 'meeting') {
        response = await addMeetingToCalendar(item, calendarType, false);
      } else if (type === 'action-item') {
        response = await addActionItemToCalendar(item, calendarType, false, retryCount);
      } else {
        throw new Error('Invalid item type');
      }
      
      console.log(`${type} added to calendar response:`, response);
      
      // Check if we need to authenticate
      if (!response.success && 
          (response.status === 'not_connected' || 
           response.status === 'token_expired' || 
           response.status === 'invalid_grant' || 
           response.error?.includes('invalid_grant') || 
           response.error?.includes('Token has been expired or revoked'))) {
        
        // Clear any stored credentials for this calendar type in localStorage
        try {
          const storedStatus = localStorage.getItem('calendarStatus');
          if (storedStatus) {
            const parsedStatus = JSON.parse(storedStatus);
            if (calendarType === 'google' && parsedStatus.googleCalendar) {
              parsedStatus.googleCalendar.connected = false;
              localStorage.setItem('calendarStatus', JSON.stringify(parsedStatus));
              console.log('Reset Google Calendar connection status in localStorage');
            } else if (calendarType === 'outlook' && parsedStatus.outlookCalendar) {
              parsedStatus.outlookCalendar.connected = false;
              localStorage.setItem('calendarStatus', JSON.stringify(parsedStatus));
              console.log('Reset Outlook Calendar connection status in localStorage');
            }
          }
        } catch (storageError) {
          console.error('Error updating localStorage:', storageError);
        }
        
        // If we have an authorization URL, open it
        if (response.authorization_url && !authWindowOpen) {
          setResult({
            success: false,
            message: 'Your calendar access has expired. Redirecting to reconnect...'
          });
          
          // Set flag that auth window is open
          setAuthWindowOpen(true);
          
          // Open the authorization URL in a new window
          const authWindow = window.open(response.authorization_url, '_blank', 'width=800,height=600');
          
          // Check if window was blocked
          if (!authWindow) {
            setResult({
              success: false,
              message: 'Pop-up blocked! Please allow pop-ups and try again.'
            });
            setAuthWindowOpen(false);
            setIsLoading(false);
            return;
          }
          
          // After a short delay, show a message to the user
          setTimeout(() => {
            setResult({
              success: false,
              message: 'Please complete the authentication in the new window and then try again.'
            });
            
            // Set up an interval to check if the auth window is closed
            const checkWindowClosed = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(checkWindowClosed);
                setAuthWindowOpen(false);
                
                // Update the message
                setResult({
                  success: false,
                  message: 'Authentication window closed. Checking if calendar is connected...'
                });
                
                // Refresh calendar status and retry if connected
                checkCalendars().then(status => {
                  if (status[calendarType]) {
                    // Calendar is now connected, retry the operation
                    setResult({
                      success: false,
                      message: 'Calendar connected! Retrying...'
                    });
                    
                    // Increment retry count
                    setRetryCount(prev => prev + 1);
                    
                    // Retry after a short delay
                    setTimeout(() => {
                      handleAddToCalendar(calendarType);
                    }, 1500);
                  } else {
                    // Calendar is still not connected
                    setResult({
                      success: false,
                      message: 'Calendar not connected. Please try again or check Settings > Integrations.'
                    });
                  }
                });
              }
            }, 1000);
            
          }, 2000);
          
          // Don't clear this message automatically
          setIsLoading(false);
          return;
        } else if (!response.authorization_url) {
          // No authorization URL provided
          setResult({
            success: false,
            message: 'Unable to connect to calendar. Please go to Settings > Integrations to reconnect.'
          });
        }
      } else if (!response.success && response.error) {
        // Handle other specific errors
        let errorMessage = response.message || response.error;
        
        if (response.error.includes('invalid_client')) {
          errorMessage = 'Invalid client credentials. Please contact support.';
        } else if (response.error.includes('access_denied')) {
          errorMessage = 'Access denied. You may have declined the permission request.';
        }
        
        setResult({
          success: false,
          message: errorMessage
        });
      } else {
        // If we get here, we either succeeded or failed for a reason other than authentication
        setResult({
          success: response.success,
          message: response.message
        });
        
        // Reset retry count on success
        if (response.success) {
          setRetryCount(0);
        }
      }
      
      // Clear result after 5 seconds for success, keep errors visible longer
      if (response.success) {
        setTimeout(() => setResult(null), 5000);
      } else {
        setTimeout(() => setResult(null), 10000);
      }
    } catch (error) {
      console.error(`Error adding ${type} to calendar:`, error);
      
      let errorMessage = error.message || 'Failed to add to calendar';
      
      // Check for network errors
      if (error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setResult({
        success: false,
        message: errorMessage
      });
      
      // Keep error visible longer
      setTimeout(() => setResult(null), 10000);
    } finally {
      setIsLoading(false);
    }
  };

  // If no calendars are connected, show a disabled button
  const noCalendarsConnected = !calendarStatus.google && !calendarStatus.outlook;
  
  // Default button text based on type
  const defaultButtonText = type === 'meeting' ? 'Add to Calendar' : 'Add Due Date to Calendar';
  
  return (
    <div className="relative">
      {/* Main Button */}
      <button
        type="button"
        onClick={() => noCalendarsConnected ? null : setShowDropdown(!showDropdown)}
        disabled={isLoading || noCalendarsConnected}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md 
          ${noCalendarsConnected 
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' 
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800'
          } ${className}`}
        title={noCalendarsConnected ? 'No calendars connected. Go to Settings > Integrations to connect a calendar.' : ''}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <FaCalendarPlus className="mr-2" />
        )}
        {buttonText || defaultButtonText}
      </button>
      
      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {calendarStatus.google && (
              <button
                onClick={() => handleAddToCalendar('google')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                role="menuitem"
              >
                <FaGoogle className="mr-2 text-blue-500" />
                Google Calendar
              </button>
            )}
            
            {calendarStatus.outlook && (
              <button
                onClick={() => handleAddToCalendar('outlook')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                role="menuitem"
              >
                <FaMicrosoft className="mr-2 text-blue-600" />
                Outlook Calendar
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Result Message */}
      {result && (
        <div className={`absolute z-10 mt-2 p-2 rounded-md shadow-lg text-sm ${
          result.success 
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }`}>
          <div className="flex items-center">
            {result.success ? (
              <FaCheck className="mr-2" />
            ) : (
              <FaTimes className="mr-2" />
            )}
            {result.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddToCalendarButton; 