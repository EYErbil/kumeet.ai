import React, { useState, useEffect } from 'react';
import { FaUser, FaGlobe, FaBell, FaPlug, FaCreditCard, FaCommentDots, FaFileContract } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// Settings page components
import ProfileSettings from '../components/settings/ProfileSettings';
import LanguageSettings from '../components/settings/LanguageSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import BillingSettings from '../components/settings/BillingSettings';
import FeedbackSettings from '../components/settings/FeedbackSettings';
import LegalSettings from '../components/settings/LegalSettings';

const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tab configuration
  const tabs = [
    { id: 'profile', label: t('settings.profile.title'), icon: <FaUser /> },
    { id: 'language', label: t('settings.language.title'), icon: <FaGlobe /> },
    { id: 'notifications', label: t('settings.notifications.title'), icon: <FaBell /> },
    { id: 'integrations', label: t('settings.integrations.title'), icon: <FaPlug /> },
    { id: 'billing', label: t('settings.billing.title'), icon: <FaCreditCard /> },
    { id: 'feedback', label: t('settings.feedback.title'), icon: <FaCommentDots /> },
    { id: 'legal', label: t('settings.legal.title'), icon: <FaFileContract /> },
  ];

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'language':
        return <LanguageSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'integrations':
        return <IntegrationSettings />;
      case 'billing':
        return <BillingSettings />;
      case 'feedback':
        return <FeedbackSettings />;
      case 'legal':
        return <LegalSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white p-6 pb-4">{t('settings.title')}</h1>
      
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow mx-6 mb-6 overflow-hidden flex flex-col">
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
          {/* Sidebar Navigation - Fixed */}
          <div className={`${isMobile ? 'w-full' : 'w-64'} bg-gray-50 dark:bg-gray-700 ${isMobile ? '' : 'h-full overflow-y-auto'}`}>
            <nav className="p-4">
              <ul>
                {tabs.map((tab) => (
                  <li key={tab.id} className="mb-1">
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="mr-3">{tab.icon}</span>
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Content Area - Scrollable */}
          <div className={`${isMobile ? 'w-full' : 'flex-1'} ${isMobile ? '' : 'h-full overflow-y-auto'}`}>
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 