import React, { useState } from 'react';
import { FaCheck, FaGlobe } from 'react-icons/fa';

const LanguageSettings = () => {
  // Available languages
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  ];

  // State
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [notification, setNotification] = useState(null);

  // Handle language change
  const handleLanguageChange = (languageCode) => {
    setSelectedLanguage(languageCode);
    showNotification(`Language changed to ${languages.find(lang => lang.code === languageCode).name}`, 'success');
    
    // Here you would update the user's language preference in your backend
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Language Settings</h2>
      
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
      
      {/* Language Selection */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaGlobe className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Application Language</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Select your preferred language for the kumeet.ai interface. This will change all text in the application.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center p-3 rounded-lg border ${
                selectedLanguage === language.code
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900 dark:border-purple-400'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-xl mr-3">{language.flag}</span>
              <span className="text-gray-900 dark:text-white">{language.name}</span>
              {selectedLanguage === language.code && (
                <FaCheck className="ml-auto text-purple-600 dark:text-purple-400" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Default Meeting Language */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaGlobe className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Default Meeting Language</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Select the default language for new meetings. This will be pre-selected when creating a new meeting.
        </p>
        
        <div className="relative">
          <select 
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none"
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.flag} {language.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings; 