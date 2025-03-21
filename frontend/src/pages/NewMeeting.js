import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaUpload, FaMicrophone, FaUserCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MeetingList from './MeetingList';

// Tab component for meeting creation options
const MeetingTypeTab = ({ icon, label, active, onClick }) => {
  return (
    <button
      className={`flex items-center py-3 px-6 rounded-lg ${
        active ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2 font-medium">{label}</span>
    </button>
  );
};

const NewMeeting = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('online');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [botName, setBotName] = useState('Meetmind Bot');

  // Available languages with their flags - using the same list as in LanguageSettings
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  ];

  // Get proper language display name
  const getLanguageDisplayName = (language) => {
    if (i18n.language === 'en') {
      return language.name;
    } else {
      return language.nativeName;
    }
  };

  // Today's meetings data
  const todayMeetings = [
    {
      id: 101,
      title: 'Product marketing meeting',
      timeRange: '11:00 AM - 11:45 AM',
      platform: 'google',
      hostName: 'Jane Cooper',
      recordingEnabled: true
    },
    {
      id: 102,
      title: 'User research discussion',
      timeRange: '12:30 PM - 1:30 PM',
      platform: 'teams',
      hostName: 'Darrell Steward',
      recordingEnabled: true
    },
    {
      id: 103,
      title: 'Design review session',
      timeRange: '2:15 PM - 3:00 PM',
      platform: 'zoom',
      hostName: 'Robert Fox',
      recordingEnabled: true
    }
  ];

  // To-do list
  const todos = [
    { id: 1, text: 'Refine the chosen design and prepare for the prototyping stage', completed: false },
    { id: 2, text: 'Conduct a competitive analysis to inform the pricing model', completed: false }
  ];

  const handleStartCapturing = () => {
    console.log('Starting meeting capture with URL:', meetingUrl);
    // Add implementation for starting the capture
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center">
            <Link to="/meetings" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              <FaChevronLeft size={16} />
            </Link>
            <h1 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">{t('meetings.newMeeting')}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-10 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6">
            {/* Meeting Name */}
            <div className="mb-6">
              <label htmlFor="meetingName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('meetings.meetingName')}
              </label>
              <input
                type="text"
                id="meetingName"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="E.g. Team Sync"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
              />
            </div>

            {/* Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('meetings.uploadRecording')}
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-300 dark:hover:border-purple-500 transition-colors">
                <div className="space-y-1 text-center">
                  <FaUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500">
                      <span>{t('meetings.uploadFile')}</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="video/*" />
                    </label>
                    <p className="pl-1">{t('meetings.dragAndDrop')}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('meetings.fileFormats')}
                  </p>
                  {selectedFile && (
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                      {t('meetings.selected')} {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('meetings.language')}
              </label>
              <div className="relative">
                <select 
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                >
                  {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.flag} {getLanguageDisplayName(language)}
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

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4">
              <Link
                to="/meetings"
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </Link>
              <button
                onClick={handleStartCapturing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {t('meetings.create')}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Meetings Section */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('meetings.recentMeetings')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sample meeting cards - you can map through actual data here */}
            {[1, 2].map((index) => (
              <Link 
                to={`/meetings/${index}`} 
                key={index} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Team Sync Meeting</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Weekly team sync to discuss project progress and upcoming milestones.</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    45 minutes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewMeeting;