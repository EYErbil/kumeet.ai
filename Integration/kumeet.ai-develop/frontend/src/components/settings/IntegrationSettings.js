import React, { useState, useEffect } from 'react';
import { FaGoogle, FaMicrosoft, FaPlug, FaCheck, FaExclamationTriangle, FaLink, FaUnlink } from 'react-icons/fa';
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
import { getCurrentUser } from '../../services/api/auth';
import axios from 'axios';
import { getApiHeaders } from '../../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const IntegrationSettings = () => {
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
    }
  });

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarStatus = async () => {
      try {
        setLoading(true);
        const storedStatus = localStorage.getItem('calendarStatus');
        if (storedStatus) {
          try {
            const parsedStatus = JSON.parse(storedStatus);
            setIntegrations(prevState => ({
              ...prevState,
              googleCalendar: parsedStatus.googleCalendar,
              outlookCalendar: parsedStatus.outlookCalendar
            }));
          } catch (parseError) {
            console.error('Error parsing stored calendar status:', parseError);
          }
        }

        const calendarStatus = await getCalendarStatus();
        const googleStatus = await checkGoogleConnection();
        const isGoogleConnected = googleStatus.connected || calendarStatus.googleCalendar.connected;
        const googleEmail = googleStatus.email || calendarStatus.googleCalendar.email || '';

        setIntegrations({
          googleCalendar: {
            connected: isGoogleConnected,
            email: googleEmail,
            lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
          },
          outlookCalendar: calendarStatus.outlookCalendar
        });

        localStorage.setItem('calendarStatus', JSON.stringify({
          googleCalendar: {
            connected: isGoogleConnected,
            email: googleEmail,
            lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
          },
          outlookCalendar: calendarStatus.outlookCalendar
        }));
      } catch (error) {
        console.error('Error fetching calendar status:', error);
        showNotification('Failed to load integration status', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarStatus();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const completeGoogleAuth = urlParams.get('completeGoogleAuth');
    const completeOutlookAuth = urlParams.get('completeOutlookAuth');
    const code = urlParams.get('code');

    const completePendingAuth = async () => {
      try {
        let shouldRefreshStatus = false;

        if (completeGoogleAuth === 'true' || (code && window.location.pathname.includes('/calendar/google/callback'))) {
          setLoading(true);
          const pendingCode = code || localStorage.getItem('pendingGoogleAuthCode');
          if (pendingCode) {
            localStorage.removeItem('pendingGoogleAuthCode');
            try {
              const googleResult = await handleGoogleCalendarCallback(pendingCode);
              const googleStatus = await checkGoogleConnection();

              setIntegrations(prevState => ({
                ...prevState,
                googleCalendar: {
                  connected: true,
                  email: googleStatus.email || googleResult.email || '',
                  lastSync: googleResult.lastSync || new Date().toISOString()
                }
              }));

              localStorage.setItem('calendarStatus', JSON.stringify({
                googleCalendar: {
                  connected: true,
                  email: googleStatus.email || googleResult.email || '',
                  lastSync: googleResult.lastSync || new Date().toISOString()
                },
                outlookCalendar: integrations.outlookCalendar
              }));

              shouldRefreshStatus = true;
              showNotification('Successfully connected to Google Calendar', 'success');
            } catch (callbackError) {
              console.error('Error handling Google Calendar callback:', callbackError);
              showNotification('Failed to connect to Google Calendar', 'error');
            }

            window.history.replaceState({}, document.title, '/settings');
          }
        }

        if (completeOutlookAuth === 'true') {
          const pendingCode = localStorage.getItem('pendingOutlookAuthCode');
          if (pendingCode) {
            setLoading(true);
            localStorage.removeItem('pendingOutlookAuthCode');
            await handleOutlookCalendarCallback(pendingCode);
            shouldRefreshStatus = true;
            showNotification('Successfully connected to Outlook Calendar', 'success');
            window.history.replaceState({}, document.title, '/settings');
          }
        }

        if (shouldRefreshStatus) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const calendarStatus = await getCalendarStatus();
          const googleStatus = await checkGoogleConnection();
          const isGoogleConnected = googleStatus.connected || calendarStatus.googleCalendar.connected;

          setIntegrations({
            googleCalendar: {
              connected: isGoogleConnected,
              email: googleStatus.email || calendarStatus.googleCalendar.email,
              lastSync: calendarStatus.googleCalendar.lastSync
            },
            outlookCalendar: calendarStatus.outlookCalendar
          });

          localStorage.setItem('calendarStatus', JSON.stringify({
            googleCalendar: {
              connected: isGoogleConnected,
              email: googleStatus.email || calendarStatus.googleCalendar.email,
              lastSync: calendarStatus.googleCalendar.lastSync
            },
            outlookCalendar: calendarStatus.outlookCalendar
          }));
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

  const handleConnectGoogle = async () => {
    try {
      setLoading(true);
      
      // Get the current user ID
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.uid) {
        showNotification('Please log in before connecting to Google Calendar', 'error');
        setLoading(false);
        return;
      }
      
      // Create a state parameter that includes the user ID
      const stateObj = { 
        userId: currentUser.uid,
        timestamp: Date.now() 
      };
      const stateParam = encodeURIComponent(JSON.stringify(stateObj));
      
      // Get the authorization URL with state parameter
      const headers = await getApiHeaders();
      const response = await axios.get(
        `${API_URL}/calendar/auth/google?state=${stateParam}`,
        headers
      );
      
      const authUrl = response.data.authorization_url;
      showNotification('Redirecting to Google for authorization...', 'success');
      setTimeout(() => { window.location.href = authUrl; }, 1000);
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      showNotification('Failed to connect to Google Calendar', 'error');
      setLoading(false);
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const authUrl = await getOutlookCalendarAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Outlook Calendar:', error);
      showNotification('Failed to connect to Outlook Calendar', 'error');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogleCalendar();
      setIntegrations(prev => ({
        ...prev,
        googleCalendar: { connected: false, email: '', lastSync: '' }
      }));
      showNotification('Disconnected from Google Calendar', 'success');
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      showNotification('Failed to disconnect from Google Calendar', 'error');
    }
  };

  const handleDisconnectOutlook = async () => {
    try {
      await disconnectOutlookCalendar();
      setIntegrations(prev => ({
        ...prev,
        outlookCalendar: { connected: false, email: '', lastSync: '' }
      }));
      showNotification('Disconnected from Outlook Calendar', 'success');
    } catch (error) {
      console.error('Error disconnecting from Outlook Calendar:', error);
      showNotification('Failed to disconnect from Outlook Calendar', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleForceRefresh = async () => {
    try {
      setLoading(true);
      showNotification('Refreshing calendar status...', 'success');
      const googleStatus = await checkGoogleConnection();
      const calendarStatus = await getCalendarStatus();
      const isGoogleConnected = googleStatus.connected || calendarStatus.googleCalendar.connected;
      const googleEmail = googleStatus.email || calendarStatus.googleCalendar.email || '';

      setIntegrations({
        googleCalendar: {
          connected: isGoogleConnected,
          email: googleEmail,
          lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
        },
        outlookCalendar: calendarStatus.outlookCalendar
      });

      localStorage.setItem('calendarStatus', JSON.stringify({
        googleCalendar: {
          connected: isGoogleConnected,
          email: googleEmail,
          lastSync: calendarStatus.googleCalendar.lastSync || new Date().toISOString()
        },
        outlookCalendar: calendarStatus.outlookCalendar
      }));
    } catch (error) {
      console.error('Error refreshing calendar status:', error);
      showNotification('Failed to refresh calendar status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const IntegrationCard = ({ title, description, icon, connected, details, lastSync, onConnect, onDisconnect }) => (
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
          {lastSync && <p className="text-gray-500 dark:text-gray-400 mt-1">Last synced: {lastSync}</p>}
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Integration Settings</h2>

      {notification && (
        <div className={`mb-4 p-3 rounded-lg ${
          notification.type === 'success'
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? <FaCheck className="mr-2" /> : <FaExclamationTriangle className="mr-2" />}
            {notification.message}
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaPlug className="text-gray-700 dark:text-gray-300 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connected Accounts</h3>
          </div>
          <button
            onClick={handleForceRefresh}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
            disabled={loading}
          >
            <FaCheck size={12} className="mr-2" /> Refresh Status
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">Loading integrations...</p>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationSettings;
