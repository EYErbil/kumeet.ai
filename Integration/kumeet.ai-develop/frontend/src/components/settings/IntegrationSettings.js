import React, { useState } from 'react';
import { FaGoogle, FaMicrosoft, FaSlack, FaPlug, FaCheck, FaExclamationTriangle, FaLink, FaUnlink } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const IntegrationSettings = () => {
  const { t } = useTranslation();
  
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
          lastSync: t('settings.integrations.justNow'),
        },
      });
      showNotification(t('settings.integrations.connectedToService', { service: 'Google Calendar' }), 'success');
    } else if (integration === 'microsoftTeams') {
      setIntegrations({
        ...integrations,
        microsoftTeams: {
          connected: true,
          email: 'john.doe@outlook.com',
          lastSync: t('settings.integrations.justNow'),
        },
      });
      showNotification(t('settings.integrations.connectedToService', { service: 'Microsoft Teams' }), 'success');
    } else if (integration === 'slack') {
      setIntegrations({
        ...integrations,
        slack: {
          connected: true,
          workspace: 'acme-corp',
          lastSync: t('settings.integrations.justNow'),
        },
      });
      showNotification(t('settings.integrations.connectedToService', { service: 'Slack' }), 'success');
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
      showNotification(t('settings.integrations.disconnectedFromService', { service: 'Google Calendar' }), 'success');
    } else if (integration === 'microsoftTeams') {
      setIntegrations({
        ...integrations,
        microsoftTeams: {
          connected: false,
          email: '',
          lastSync: '',
        },
      });
      showNotification(t('settings.integrations.disconnectedFromService', { service: 'Microsoft Teams' }), 'success');
    } else if (integration === 'slack') {
      setIntegrations({
        ...integrations,
        slack: {
          connected: false,
          workspace: '',
          lastSync: '',
        },
      });
      showNotification(t('settings.integrations.disconnectedFromService', { service: 'Slack' }), 'success');
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-start mb-4 md:mb-0">
          <div className="text-2xl mr-3 mt-1">{icon}</div>
          <div>
            <div className="flex items-center mb-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mr-3">{title}</h4>
              {connected ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-xs flex items-center">
                  <FaCheck size={10} className="mr-1" /> {t('settings.integrations.connected')}
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs flex items-center">
                  <FaUnlink size={10} className="mr-1" /> {t('settings.integrations.notConnected')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            
            {connected && details && (
              <div className="mt-2 text-sm">
                <p className="text-gray-700 dark:text-gray-300">{details}</p>
                {lastSync && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{t('settings.integrations.lastSynced')}: {lastSync}</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div>
          {connected ? (
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
            >
              <FaUnlink size={12} className="mr-2" /> {t('settings.integrations.disconnect')}
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center text-sm"
            >
              <FaLink size={12} className="mr-2" /> {t('settings.integrations.connect')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.integrations.title')}</h2>
      
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.integrations.title')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('settings.integrations.description')}
        </p>
        
        <div className="space-y-4">
          <IntegrationCard
            title="Google Calendar"
            description={t('settings.integrations.googleCalendarDescription')}
            icon={<FaGoogle className="text-blue-500" />}
            connected={integrations.googleCalendar.connected}
            details={integrations.googleCalendar.email ? t('settings.integrations.connectedAs') + ` ${integrations.googleCalendar.email}` : ''}
            lastSync={integrations.googleCalendar.lastSync}
            onConnect={() => handleConnect('googleCalendar')}
            onDisconnect={() => handleDisconnect('googleCalendar')}
          />
          
          <IntegrationCard
            title="Microsoft Teams"
            description={t('settings.integrations.microsoftTeamsDescription')}
            icon={<FaMicrosoft className="text-blue-600" />}
            connected={integrations.microsoftTeams.connected}
            details={integrations.microsoftTeams.email ? t('settings.integrations.connectedAs') + ` ${integrations.microsoftTeams.email}` : ''}
            lastSync={integrations.microsoftTeams.lastSync}
            onConnect={() => handleConnect('microsoftTeams')}
            onDisconnect={() => handleDisconnect('microsoftTeams')}
          />
          
          <IntegrationCard
            title="Slack"
            description={t('settings.integrations.slackDescription')}
            icon={<FaSlack className="text-yellow-500" />}
            connected={integrations.slack.connected}
            details={integrations.slack.workspace ? t('settings.integrations.connectedToWorkspace') + `: ${integrations.slack.workspace}` : ''}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.integrations.permissionsTitle')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.integrations.permissionsDescription')}
        </p>
        
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Google Calendar</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>{t('settings.integrations.googleCalendar.permission1')}</li>
              <li>{t('settings.integrations.googleCalendar.permission2')}</li>
              <li>{t('settings.integrations.googleCalendar.permission3')}</li>
            </ul>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Microsoft Teams</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>{t('settings.integrations.microsoftTeams.permission1')}</li>
              <li>{t('settings.integrations.microsoftTeams.permission2')}</li>
              <li>{t('settings.integrations.microsoftTeams.permission3')}</li>
            </ul>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Slack</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>{t('settings.integrations.slack.permission1')}</li>
              <li>{t('settings.integrations.slack.permission2')}</li>
              <li>{t('settings.integrations.slack.permission3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings; 