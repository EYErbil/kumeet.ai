import React, { useState } from 'react';
import { FaBell, FaEnvelope, FaCheck } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const NotificationSettings = () => {
  const { t } = useTranslation();
  
  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState({
    meetingReminders: true,
    actionItemReminders: true,
    meetingSummaries: true,
    mentions: false,
  });

  const [inAppNotifications, setInAppNotifications] = useState({
    meetingAlerts: true,
    actionItemDueDate: true,
    newSharedNotes: false,
  });

  const [notification, setNotification] = useState(null);

  // Handle email notification toggle
  const handleEmailToggle = (setting) => {
    setEmailNotifications({
      ...emailNotifications,
      [setting]: !emailNotifications[setting],
    });
    
    // Here you would update the user's notification preferences in your backend
    showNotification(t('settings.notifications.settingsUpdated'), 'success');
  };

  // Handle in-app notification toggle
  const handleInAppToggle = (setting) => {
    setInAppNotifications({
      ...inAppNotifications,
      [setting]: !inAppNotifications[setting],
    });
    
    // Here you would update the user's notification preferences in your backend
    showNotification(t('settings.notifications.settingsUpdated'), 'success');
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Toggle switch component
  const ToggleSwitch = ({ checked, onChange, label, description }) => {
    return (
      <div className="flex items-start justify-between py-3">
        <div>
          <p className="text-gray-900 dark:text-white font-medium">{label}</p>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={checked}
            onChange={onChange}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
        </label>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.notifications.title')}</h2>
      
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }`}>
          <div className="flex items-center">
            <FaCheck className="mr-2" />
            {notification.message}
          </div>
        </div>
      )}
      
      {/* Email Notifications */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaEnvelope className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.notifications.emailNotifications')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.notifications.emailDescription')}
        </p>
        
        <div className="space-y-2 border-t border-gray-200 dark:border-gray-600 pt-4">
          <ToggleSwitch 
            checked={emailNotifications.meetingReminders} 
            onChange={() => handleEmailToggle('meetingReminders')}
            label={t('settings.notifications.meetingAlerts')}
            description={t('settings.notifications.meetingAlertsDescription')}
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={emailNotifications.actionItemReminders} 
            onChange={() => handleEmailToggle('actionItemReminders')}
            label={t('settings.notifications.actionItemReminders')}
            description={t('settings.notifications.actionItemRemindersDescription')}
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={emailNotifications.meetingSummaries} 
            onChange={() => handleEmailToggle('meetingSummaries')}
            label={t('settings.notifications.meetingSummaries')}
            description={t('settings.notifications.meetingSummariesDescription')}
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={emailNotifications.mentions} 
            onChange={() => handleEmailToggle('mentions')}
            label={t('settings.notifications.mentions')}
            description={t('settings.notifications.mentionsDescription')}
          />
        </div>
      </div>
      
      {/* In-app Notifications */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaBell className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.notifications.inAppNotifications')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.notifications.inAppDescription')}
        </p>
        
        <div className="space-y-2 border-t border-gray-200 dark:border-gray-600 pt-4">
          <ToggleSwitch 
            checked={inAppNotifications.meetingAlerts} 
            onChange={() => handleInAppToggle('meetingAlerts')}
            label={t('settings.notifications.meetingAlerts')}
            description={t('settings.notifications.meetingAlertsDescription')}
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={inAppNotifications.actionItemDueDate} 
            onChange={() => handleInAppToggle('actionItemDueDate')}
            label={t('settings.notifications.actionItemReminders')}
            description={t('settings.notifications.actionItemRemindersDescription')}
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={inAppNotifications.newSharedNotes} 
            onChange={() => handleInAppToggle('newSharedNotes')}
            label={t('settings.notifications.sharedNotes')}
            description={t('settings.notifications.sharedNotesDescription')}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings; 