import React, { useState } from 'react';
import { FaGoogle, FaMicrosoft, FaSlack, FaPlug, FaCheck, FaExclamationTriangle, FaLink, FaUnlink } from 'react-icons/fa';

const IntegrationSettings = () => {
  // Integration state
  const [integrations, setIntegrations] = useState({
    googleCalendar: {
      connected: true,
      email: 'john.doe@gmail.com',
      lastSync: '2 hours ago',
    },
    microsoftTeams: {
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

  // Connect integration
  const handleConnect = (integration) => {
    // Here you would initiate OAuth flow for the selected integration
    // For demo purposes, we'll just simulate a successful connection
    
    if (integration === 'googleCalendar') {
      setIntegrations({
        ...integrations,
        googleCalendar: {
          connected: true,
          email: 'john.doe@gmail.com',
          lastSync: 'Just now',
        },
      });
      showNotification('Connected to Google Calendar', 'success');
    } else if (integration === 'microsoftTeams') {
      setIntegrations({
        ...integrations,
        microsoftTeams: {
          connected: true,
          email: 'john.doe@outlook.com',
          lastSync: 'Just now',
        },
      });
      showNotification('Connected to Microsoft Teams', 'success');
    } else if (integration === 'slack') {
      setIntegrations({
        ...integrations,
        slack: {
          connected: true,
          workspace: 'acme-corp',
          lastSync: 'Just now',
        },
      });
      showNotification('Connected to Slack', 'success');
    }
  };

  // Disconnect integration
  const handleDisconnect = (integration) => {
    // Here you would revoke access for the selected integration
    // For demo purposes, we'll just simulate a successful disconnection
    
    if (integration === 'googleCalendar') {
      setIntegrations({
        ...integrations,
        googleCalendar: {
          connected: false,
          email: '',
          lastSync: '',
        },
      });
      showNotification('Disconnected from Google Calendar', 'success');
    } else if (integration === 'microsoftTeams') {
      setIntegrations({
        ...integrations,
        microsoftTeams: {
          connected: false,
          email: '',
          lastSync: '',
        },
      });
      showNotification('Disconnected from Microsoft Teams', 'success');
    } else if (integration === 'slack') {
      setIntegrations({
        ...integrations,
        slack: {
          connected: false,
          workspace: '',
          lastSync: '',
        },
      });
      showNotification('Disconnected from Slack', 'success');
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
        <div className="flex items-center mb-4">
          <FaPlug className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connected Accounts</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Connect your accounts to enhance your kumeet.ai experience. These integrations allow for seamless calendar syncing and meeting management.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            title="Google Calendar"
            description="Sync your meetings with Google Calendar"
            icon={<FaGoogle className="text-blue-500" />}
            connected={integrations.googleCalendar.connected}
            details={integrations.googleCalendar.email ? `Connected as ${integrations.googleCalendar.email}` : ''}
            lastSync={integrations.googleCalendar.lastSync}
            onConnect={() => handleConnect('googleCalendar')}
            onDisconnect={() => handleDisconnect('googleCalendar')}
          />
          
          <IntegrationCard
            title="Microsoft Teams"
            description="Connect with Microsoft Teams for meetings"
            icon={<FaMicrosoft className="text-blue-600" />}
            connected={integrations.microsoftTeams.connected}
            details={integrations.microsoftTeams.email ? `Connected as ${integrations.microsoftTeams.email}` : ''}
            lastSync={integrations.microsoftTeams.lastSync}
            onConnect={() => handleConnect('microsoftTeams')}
            onDisconnect={() => handleDisconnect('microsoftTeams')}
          />
          
          <IntegrationCard
            title="Slack"
            description="Share meeting summaries and action items to Slack"
            icon={<FaSlack className="text-yellow-500" />}
            connected={integrations.slack.connected}
            details={integrations.slack.workspace ? `Connected to workspace: ${integrations.slack.workspace}` : ''}
            lastSync={integrations.slack.lastSync}
            onConnect={() => handleConnect('slack')}
            onDisconnect={() => handleDisconnect('slack')}
          />
        </div>
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
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Google Calendar</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>View and edit calendar events</li>
              <li>Create new calendar events</li>
              <li>Access your primary calendar</li>
            </ul>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Microsoft Teams</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>Access your Teams meetings</li>
              <li>Create new Teams meetings</li>
              <li>Access your Teams profile</li>
            </ul>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Slack</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>Post messages to channels</li>
              <li>Access your workspace information</li>
              <li>Send direct messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings; 