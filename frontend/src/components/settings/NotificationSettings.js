import React, { useState } from 'react';
import { FaBell, FaEnvelope, FaCheck } from 'react-icons/fa';

const NotificationSettings = () => {
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
    showNotification('Email notification settings updated', 'success');
  };

  // Handle in-app notification toggle
  const handleInAppToggle = (setting) => {
    setInAppNotifications({
      ...inAppNotifications,
      [setting]: !inAppNotifications[setting],
    });
    
    // Here you would update the user's notification preferences in your backend
    showNotification('In-app notification settings updated', 'success');
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notification Settings</h2>
      
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Notifications</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Control which email notifications you receive from kumeet.ai.
        </p>
        
        <div className="space-y-2 border-t border-gray-200 dark:border-gray-600 pt-4">
          <ToggleSwitch 
            checked={emailNotifications.meetingReminders} 
            onChange={() => handleEmailToggle('meetingReminders')}
            label="Meeting Reminders"
            description="Receive email reminders before your scheduled meetings"
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={emailNotifications.actionItemReminders} 
            onChange={() => handleEmailToggle('actionItemReminders')}
            label="Action Item Reminders"
            description="Receive reminders about your upcoming and overdue action items"
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={emailNotifications.meetingSummaries} 
            onChange={() => handleEmailToggle('meetingSummaries')}
            label="Meeting Summaries"
            description="Receive email summaries after your meetings"
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={emailNotifications.mentions} 
            onChange={() => handleEmailToggle('mentions')}
            label="Mentions in Notes"
            description="Receive notifications when you are mentioned in meeting notes"
          />
        </div>
      </div>
      
      {/* In-app Notifications */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaBell className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">In-app Notifications</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Control which notifications you see while using kumeet.ai.
        </p>
        
        <div className="space-y-2 border-t border-gray-200 dark:border-gray-600 pt-4">
          <ToggleSwitch 
            checked={inAppNotifications.meetingAlerts} 
            onChange={() => handleInAppToggle('meetingAlerts')}
            label="Meeting Start Alerts"
            description="Receive alerts when your meetings are about to start"
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={inAppNotifications.actionItemDueDate} 
            onChange={() => handleInAppToggle('actionItemDueDate')}
            label="Action Item Due Date Reminders"
            description="Receive reminders when action items are due"
          />
          
          <div className="border-t border-gray-200 dark:border-gray-600"></div>
          
          <ToggleSwitch 
            checked={inAppNotifications.newSharedNotes} 
            onChange={() => handleInAppToggle('newSharedNotes')}
            label="New Shared Notes"
            description="Receive notifications when new notes are shared with you"
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings; 