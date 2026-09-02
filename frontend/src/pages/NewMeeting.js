import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaUpload, FaMicrophone, FaUserCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MeetingList from './MeetingList';
// Import our API utility
import { post, uploadFile } from '../utils/api';

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
  const [focusQuestion, setFocusQuestion] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    
    // If file is selected, upload it
    if (selectedFile) {
      uploadMeetingFile();
    }
  };

  const uploadMeetingFile = async () => {
    // Create form data for the file upload
    const formData = new FormData();
    formData.append('audio_file', selectedFile);
    formData.append('meeting_type', meetingType);
    
    // Add focus question if provided
    if (focusQuestion) {
      formData.append('focus_question', focusQuestion);
    }
    
    // Show loading state
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Validate file before sending
      if (!selectedFile) {
        throw new Error("No file selected");
      }
      
      if (selectedFile.size > 500 * 1024 * 1024) { // 500MB limit
        throw new Error("File is too large. Maximum size is 500MB");
      }
      
      // Create the meeting first to get meeting_id
      console.log("Creating meeting...");
      const meetingData = await post('/meetings/create', {
        title: meetingName || "Untitled Meeting",
        meeting_type: meetingType,
      });
      
      if (!meetingData || !meetingData.meeting_id) {
        throw new Error("Invalid response when creating meeting");
      }
      
      const meetingId = meetingData.meeting_id;
      console.log(`Meeting created with ID: ${meetingId}`);
      
      // Set processing state
      setIsProcessing(true);
      
      // Now upload the file to the meeting
      console.log("Uploading audio file...");
      const uploadResult = await uploadFile(`/meetings/${meetingId}/upload-audio`, formData);
      
      if (!uploadResult) {
        throw new Error("File upload failed");
      }
      
      console.log('Meeting created and file uploaded successfully');
      
      // Redirect to the meeting page
      window.location.href = `/meetings/${meetingId}`;
    } catch (error) {
      console.error('Error during meeting creation or file upload:', error);
      setUploadError(error.message || "An unknown error occurred");
      setIsUploading(false);
      setIsProcessing(false);
    }
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
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*,video/*" />
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

            {/* Meeting Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Type
              </label>
              <div className="relative">
                <select 
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                >
                  <option value="general">General Meeting</option>
                  <option value="team_sync">Team Sync</option>
                  <option value="planning">Planning Meeting</option>
                  <option value="interview">Interview</option>
                  <option value="presentation">Presentation</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Focus Question */}
            <div className="mb-6">
              <label htmlFor="focusQuestion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Focus Question (Optional)
              </label>
              <input
                type="text"
                id="focusQuestion"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="E.g. What action items were agreed upon?"
                value={focusQuestion}
                onChange={(e) => setFocusQuestion(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The AI will prioritize finding answers to this question in the meeting content.
              </p>
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
                disabled={isUploading || isProcessing || !selectedFile}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  isUploading || isProcessing || !selectedFile
                    ? 'bg-purple-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {isUploading && !isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  t('meetings.create')
                )}
              </button>
            </div>

            {/* Error message */}
            {uploadError && (
              <div className="mt-4 p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{uploadError}</span>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-4 p-4 border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400">
                <div className="flex items-center">
                  <svg className="animate-spin h-5 w-5 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>
                    Processing your meeting audio. This may take several minutes for long recordings...
                    <br/>
                    <span className="text-xs">Please do not close this window.</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewMeeting;