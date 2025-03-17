import React, { useState, useEffect } from 'react';
import { FaGoogle, FaMicrosoft, FaSlack, FaPlug, FaCheck, FaExclamationTriangle, FaLink, FaUnlink } from 'react-icons/fa';
import { 
  getCalendarStatus, 
  getGoogleCalendarAuthUrl, 
  getOutlookCalendarAuthUrl,
  disconnectGoogleCalendar,
  disconnectOutlookCalendar,
  handleGoogleCalendarCallback,
  handleOutlookCalendarCallback,
  checkGoogleConnection
} from '../../services/api/calendar';
import axios from 'axios';

// API URL for direct axios calls
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const IntegrationSettings = () => {
  // Integration state
  const [integrations, setIntegrations] = useState({
    googleCalendar: {
      connected: false,
      email: '',
      lastSync: '',
    },
    outlookCalendar: {
      connected: false,
      email: '',
      lastSync: '',
    },
    slack: {
      connected: false,
      workspace: '',
      lastSync: '',
    },
  });

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch integration status on component mount
  useEffect(() => {
    const fetchCalendarStatus = async () => {
      try {
        setLoading(true);
        
        // First, check if we have a stored status in localStorage
        const storedStatus = localStorage.getItem('calendarStatus');
        if (storedStatus) {
          try {
            const parsedStatus = JSON.parse(storedStatus);
            console.log('Retrieved calendar status from localStorage:', parsedStatus);
            
            // Update the state with the stored status
            setIntegrations(prevState => ({
              ...prevState,
              googleCalendar: parsedStatus.googleCalendar,
              outlookCalendar: parsedStatus.outlookCalendar
            }));
          } catch (parseError) {
            console.error('Error parsing stored calendar status:', parseError);
          }
        }
        
        // Then fetch the latest status from the API
        const calendarStatus = await getCalendarStatus();
        console.log('API calendar status:', calendarStatus);
        
        // Also directly check Google connection status
        const googleStatus = await checkGoogleConnection();
        console.log('Direct Google connection check:', googleStatus);
        
        // Use the most accurate connection status
        const isGoogleConnected = googleStatus.connected || calendarStatus.googleCalendar.connected;
        const googleEmail = googleStatus.email || calendarStatus.googleCalendar.email || '';
        
        setIntegrations(prevState => ({
          ...prevState,
          googleCalendar: {
            connected: isGoogleConnected,
            email: googleEmail,
            lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
          },
          outlookCalendar: calendarStatus.outlookCalendar
        }));
        
        // Update localStorage with the latest status
        const updatedStatus = {
          googleCalendar: {
            connected: isGoogleConnected,
            email: googleEmail,
            lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
          },
          outlookCalendar: calendarStatus.outlookCalendar
        };
        
        localStorage.setItem('calendarStatus', JSON.stringify(updatedStatus));
        console.log('Updated calendar status in localStorage:', updatedStatus);
      } catch (error) {
        console.error('Error fetching calendar status:', error);
        showNotification('Failed to load integration status', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarStatus();
  }, []);

  // Add this code after the fetchCalendarStatus function call in the useEffect hook
  useEffect(() => {
    // Check for pending Google auth code
    const urlParams = new URLSearchParams(window.location.search);
    const completeGoogleAuth = urlParams.get('completeGoogleAuth');
    const completeOutlookAuth = urlParams.get('completeOutlookAuth');
    const code = urlParams.get('code');
    
    const completePendingAuth = async () => {
      try {
        let shouldRefreshStatus = false;
        
        // Handle Google auth completion
        if (completeGoogleAuth === 'true' || (code && window.location.pathname.includes('/calendar/google/callback'))) {
          setLoading(true);
          
          // Check if we have a stored status in localStorage
          const storedStatus = localStorage.getItem('calendarStatus');
          if (storedStatus) {
            try {
              const parsedStatus = JSON.parse(storedStatus);
              console.log('Retrieved calendar status from localStorage after Google auth:', parsedStatus);
              
              if (parsedStatus.googleCalendar && parsedStatus.googleCalendar.connected) {
                // Update the state with the stored status
                setIntegrations(prevState => ({
                  ...prevState,
                  googleCalendar: parsedStatus.googleCalendar
                }));
                
                showNotification('Successfully connected to Google Calendar', 'success');
                
                // Clean up URL
                window.history.replaceState({}, document.title, '/settings');
                setLoading(false);
                return;
              }
            } catch (parseError) {
              console.error('Error parsing stored calendar status:', parseError);
            }
          }
          
          // If we don't have a valid stored status, try to get the code and handle the callback
          const pendingCode = code || localStorage.getItem('pendingGoogleAuthCode');
          
          if (pendingCode) {
            // Clear the code from localStorage if it exists
            localStorage.removeItem('pendingGoogleAuthCode');
            
            console.log('Processing Google Calendar callback with code:', pendingCode.substring(0, 10) + '...');
            
            try {
              // Handle Google auth callback
              const googleResult = await handleGoogleCalendarCallback(pendingCode);
              console.log('Google Calendar callback result:', googleResult);
              
              // Directly update the integrations state with the result
              setIntegrations(prevState => ({
                ...prevState,
                googleCalendar: {
                  connected: true,
                  email: googleResult.email || '',
                  lastSync: googleResult.lastSync || new Date().toISOString()
                }
              }));
              
              // Also directly check Google connection status
              const googleStatus = await checkGoogleConnection();
              console.log('Direct Google connection check after callback:', googleStatus);
              
              if (googleStatus.connected) {
                setIntegrations(prevState => ({
                  ...prevState,
                  googleCalendar: {
                    connected: true,
                    email: googleStatus.email || googleResult.email || '',
                    lastSync: googleResult.lastSync || new Date().toISOString()
                  }
                }));
                
                // Update localStorage with the latest status
                const updatedStatus = {
                  googleCalendar: {
                    connected: true,
                    email: googleStatus.email || googleResult.email || '',
                    lastSync: googleResult.lastSync || new Date().toISOString()
                  },
                  outlookCalendar: integrations.outlookCalendar
                };
                
                localStorage.setItem('calendarStatus', JSON.stringify(updatedStatus));
              }
              
              shouldRefreshStatus = true;
              showNotification('Successfully connected to Google Calendar', 'success');
            } catch (callbackError) {
              console.error('Error handling Google Calendar callback:', callbackError);
              
              // Check if we have a stored status in localStorage as a fallback
              const storedStatus = localStorage.getItem('calendarStatus');
              if (storedStatus) {
                try {
                  const parsedStatus = JSON.parse(storedStatus);
                  if (parsedStatus.googleCalendar && parsedStatus.googleCalendar.connected) {
                    // Update the state with the stored status
                    setIntegrations(prevState => ({
                      ...prevState,
                      googleCalendar: parsedStatus.googleCalendar
                    }));
                    showNotification('Connected to Google Calendar', 'success');
                  } else {
                    // Try a direct check as a last resort
                    const googleStatus = await checkGoogleConnection();
                    if (googleStatus.connected) {
                      setIntegrations(prevState => ({
                        ...prevState,
                        googleCalendar: {
                          connected: true,
                          email: googleStatus.email || '',
                          lastSync: new Date().toISOString()
                        }
                      }));
                      showNotification('Connected to Google Calendar', 'success');
                    } else {
                      showNotification('Failed to connect to Google Calendar', 'error');
                    }
                  }
                } catch (parseError) {
                  console.error('Error parsing stored calendar status:', parseError);
                  showNotification('Failed to connect to Google Calendar', 'error');
                }
              } else {
                // Try a direct check as a last resort
                const googleStatus = await checkGoogleConnection();
                if (googleStatus.connected) {
                  setIntegrations(prevState => ({
                    ...prevState,
                    googleCalendar: {
                      connected: true,
                      email: googleStatus.email || '',
                      lastSync: new Date().toISOString()
                    }
                  }));
                  showNotification('Connected to Google Calendar', 'success');
                } else {
                  showNotification('Failed to connect to Google Calendar', 'error');
                }
              }
            }
            
            // Clean up URL
            window.history.replaceState({}, document.title, '/settings');
          }
        }
        
        // Handle Outlook auth completion
        if (completeOutlookAuth === 'true') {
          const pendingCode = localStorage.getItem('pendingOutlookAuthCode');
          if (pendingCode) {
            setLoading(true);
            // Clear the code from localStorage
            localStorage.removeItem('pendingOutlookAuthCode');
            
            // Handle Outlook auth callback
            await handleOutlookCalendarCallback(pendingCode);
            shouldRefreshStatus = true;
            showNotification('Successfully connected to Outlook Calendar', 'success');
            
            // Clean up URL
            window.history.replaceState({}, document.title, '/settings');
          }
        }
        
        // Refresh calendar status if needed
        if (shouldRefreshStatus) {
          try {
            // Wait a moment to ensure backend has processed everything
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const calendarStatus = await getCalendarStatus();
            console.log('Refreshed calendar status:', calendarStatus);
            
            // Also directly check Google connection status
            const googleStatus = await checkGoogleConnection();
            console.log('Direct Google connection check after refresh:', googleStatus);
            
            // Use the most accurate connection status
            const isGoogleConnected = googleStatus.connected || calendarStatus.googleCalendar.connected;
            
            setIntegrations(prevState => ({
              ...prevState,
              googleCalendar: {
                connected: isGoogleConnected,
                email: googleStatus.email || calendarStatus.googleCalendar.email || prevState.googleCalendar.email,
                lastSync: calendarStatus.googleCalendar.lastSync || prevState.googleCalendar.lastSync
              },
              outlookCalendar: calendarStatus.outlookCalendar
            }));
            
            // Update localStorage with the latest status
            const updatedStatus = {
              googleCalendar: {
                connected: isGoogleConnected,
                email: googleStatus.email || calendarStatus.googleCalendar.email || '',
                lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
              },
              outlookCalendar: calendarStatus.outlookCalendar
            };
            
            localStorage.setItem('calendarStatus', JSON.stringify(updatedStatus));
          } catch (refreshError) {
            console.error('Error refreshing calendar status:', refreshError);
          }
        }
      } catch (error) {
        console.error('Error completing OAuth:', error);
        showNotification('Failed to complete calendar authorization', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    if (completeGoogleAuth === 'true' || completeOutlookAuth === 'true' || code) {
      completePendingAuth();
    }
  }, []);

  // Connect Google Calendar
  const handleConnectGoogle = async () => {
    try {
      if (loading) {
        console.log('Already processing a request, please wait...');
        return;
      }
      
      setLoading(true);
      console.log('Initiating Google Calendar connection...');
      
      // Clear any previously processed auth codes to ensure a fresh connection
      sessionStorage.removeItem('processedAuthCodes');
      
      // Clear any previous errors
      localStorage.removeItem('calendarError');
      
      const authUrl = await getGoogleCalendarAuthUrl();
      console.log('Google Calendar auth URL:', authUrl);
      
      // DO NOT modify the authUrl in any way - it must match what's configured in Google Cloud Console
      
      // Show a notification to the user
      showNotification('Redirecting to Google for authorization...', 'success');
      
      // Wait a moment for the notification to be visible
      setTimeout(() => {
        // Redirect to the auth URL for real OAuth flow
        window.location.href = authUrl;
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      showNotification('Failed to connect to Google Calendar', 'error');
      setLoading(false);
    }
  };

  // Connect Outlook Calendar
  const handleConnectOutlook = async () => {
    try {
      const authUrl = await getOutlookCalendarAuthUrl();
      
      // Redirect to the auth URL for real OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Outlook Calendar:', error);
      showNotification('Failed to connect to Outlook Calendar', 'error');
    }
  };

  // Disconnect Google Calendar
  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogleCalendar();
      
      setIntegrations({
        ...integrations,
        googleCalendar: {
          connected: false,
          email: '',
          lastSync: '',
        },
      });
      
      showNotification('Disconnected from Google Calendar', 'success');
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      showNotification('Failed to disconnect from Google Calendar', 'error');
    }
  };

  // Disconnect Outlook Calendar
  const handleDisconnectOutlook = async () => {
    try {
      await disconnectOutlookCalendar();
      
      setIntegrations({
        ...integrations,
        outlookCalendar: {
          connected: false,
          email: '',
          lastSync: '',
        },
      });
      
      showNotification('Disconnected from Outlook Calendar', 'success');
    } catch (error) {
      console.error('Error disconnecting from Outlook Calendar:', error);
      showNotification('Failed to disconnect from Outlook Calendar', 'error');
    }
  };

  // Connect Slack (keeping the original implementation for now)
  const handleConnectSlack = () => {
    setIntegrations({
      ...integrations,
      slack: {
        connected: true,
        workspace: 'acme-corp',
        lastSync: 'Just now',
      },
    });
    showNotification('Connected to Slack', 'success');
  };

  // Disconnect Slack (keeping the original implementation for now)
  const handleDisconnectSlack = () => {
    setIntegrations({
      ...integrations,
      slack: {
        connected: false,
        workspace: '',
        lastSync: '',
      },
    });
    showNotification('Disconnected from Slack', 'success');
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Force refresh calendar status
  const handleForceRefresh = async () => {
    try {
      setLoading(true);
      showNotification('Refreshing calendar status...', 'success');
      
      // Directly check Google connection status
      const googleStatus = await checkGoogleConnection();
      console.log('Force refresh - Direct Google connection check:', googleStatus);
      
      // Then fetch the latest status from the API
      const calendarStatus = await getCalendarStatus();
      console.log('Force refresh - API calendar status:', calendarStatus);
      
      // Use the most accurate connection status
      const isGoogleConnected = googleStatus.connected || calendarStatus.googleCalendar.connected;
      const googleEmail = googleStatus.email || calendarStatus.googleCalendar.email || '';
      
      setIntegrations(prevState => ({
        ...prevState,
        googleCalendar: {
          connected: isGoogleConnected,
          email: googleEmail,
          lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
        },
        outlookCalendar: calendarStatus.outlookCalendar
      }));
      
      // Update localStorage with the latest status
      const updatedStatus = {
        googleCalendar: {
          connected: isGoogleConnected,
          email: googleEmail,
          lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
        },
        outlookCalendar: calendarStatus.outlookCalendar
      };
      
      localStorage.setItem('calendarStatus', JSON.stringify(updatedStatus));
      console.log('Updated calendar status in localStorage:', updatedStatus);
      
      showNotification('Calendar status refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing calendar status:', error);
      showNotification('Failed to refresh calendar status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Integration card component
  const IntegrationCard = ({ 
    title, 
    description, 
    icon, 
    connected, 
    details, 
    lastSync, 
    onConnect, 
    onDisconnect
  }) => {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">{icon}</div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
          </div>
          <div>
            {connected ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-xs flex items-center">
                <FaCheck size={10} className="mr-1" /> Connected
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs flex items-center">
                <FaUnlink size={10} className="mr-1" /> Not Connected
              </span>
            )}
          </div>
        </div>
        
        {connected && details && (
          <div className="mb-4 text-sm">
            <p className="text-gray-700 dark:text-gray-300">{details}</p>
            {lastSync && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">Last synced: {lastSync}</p>
            )}
          </div>
        )}
        
        <div className="flex justify-end">
          {connected ? (
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
            >
              <FaUnlink size={12} className="mr-2" /> Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center text-sm"
            >
              <FaLink size={12} className="mr-2" /> Connect
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Integration Settings</h2>
      
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <FaCheck className="mr-2" />
            ) : (
              <FaExclamationTriangle className="mr-2" />
            )}
            {notification.message}
          </div>
        </div>
      )}
      
      {/* Connected Accounts */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaPlug className="text-gray-700 dark:text-gray-300 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connected Accounts</h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleForceRefresh}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
              disabled={loading}
            >
              <FaCheck size={12} className="mr-2" /> Refresh Status
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Connect your accounts to enhance your kumeet.ai experience. These integrations allow for seamless calendar syncing and meeting management.
        </p>
        
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-600 dark:text-gray-400">Loading integrations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IntegrationCard
              title="Google Calendar"
              description="Sync your meetings with Google Calendar"
              icon={<FaGoogle className="text-blue-500" />}
              connected={integrations.googleCalendar.connected}
              details={integrations.googleCalendar.email ? `Connected as ${integrations.googleCalendar.email}` : ''}
              lastSync={integrations.googleCalendar.lastSync}
              onConnect={handleConnectGoogle}
              onDisconnect={handleDisconnectGoogle}
            />
            
            <IntegrationCard
              title="Outlook Calendar"
              description="Connect with Microsoft Outlook for calendar syncing"
              icon={<FaMicrosoft className="text-blue-600" />}
              connected={integrations.outlookCalendar.connected}
              details={integrations.outlookCalendar.email ? `Connected as ${integrations.outlookCalendar.email}` : ''}
              lastSync={integrations.outlookCalendar.lastSync}
              onConnect={handleConnectOutlook}
              onDisconnect={handleDisconnectOutlook}
            />
            
            <IntegrationCard
              title="Slack"
              description="Share meeting summaries and action items to Slack"
              icon={<FaSlack className="text-yellow-500" />}
              connected={integrations.slack.connected}
              details={integrations.slack.workspace ? `Connected to workspace: ${integrations.slack.workspace}` : ''}
              lastSync={integrations.slack.lastSync}
              onConnect={handleConnectSlack}
              onDisconnect={handleDisconnectSlack}
            />
          </div>
        )}
      </div>
      
      {/* Integration Permissions */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaPlug className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Integration Permissions</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Review and manage the permissions granted to each integration.
        </p>
        
        <div className="space-y-4">
          {integrations.googleCalendar.connected && (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Google Calendar</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Access to view and edit your Google Calendar</li>
                <li>Create and modify events on your behalf</li>
                <li>Read your calendar data</li>
              </ul>
            </div>
          )}
          
          {integrations.outlookCalendar.connected && (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Outlook Calendar</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Access to view and edit your Outlook Calendar</li>
                <li>Create and modify events on your behalf</li>
                <li>Read your calendar data</li>
              </ul>
            </div>
          )}
          
          {integrations.slack.connected && (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Slack</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Post messages to your channels</li>
                <li>Access your workspace information</li>
                <li>Send direct messages on your behalf</li>
              </ul>
            </div>
          )}
          
          {!integrations.googleCalendar.connected && !integrations.outlookCalendar.connected && !integrations.slack.connected && (
            <p className="text-gray-600 dark:text-gray-400 italic">No active integrations to display permissions for.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings; 