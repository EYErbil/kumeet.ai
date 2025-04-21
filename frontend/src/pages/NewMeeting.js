import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaUpload, FaMicrophone, FaUserCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MeetingList from './MeetingList';
import { api } from '../utils/api'; // Import the API utility

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
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleStartCapturing = async () => {
    try {
      if (!selectedFile) {
        setUploadError('No file selected');
        return;
      }

      if (!meetingName.trim()) {
        setUploadError('Meeting name is required');
        return;
      }

      // Reset states
      setUploadError('');
      setIsUploading(true);
      setUploadStatus('Creating meeting...');
      setUploadProgress(10);

      // Create a meeting using the non-auth endpoint
      try {
        // Use direct fetch to the endpoint that doesn't require auth
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/meetings/create-without-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: meetingName,
            description: '',
            meeting_type: 'general',
          }),
        });
        
        if (!response.ok) {
          console.error('Error creating meeting:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          throw new Error(`Failed to create meeting: ${response.status} ${response.statusText}`);
        }
        
        const createMeetingResult = await response.json();
        console.log('Meeting created:', createMeetingResult);
        
        // Get the meeting ID
        const meeting_id = createMeetingResult.meeting_id;
        
        setUploadStatus('Uploading video...');
        setUploadProgress(25);
  
        // Create a FormData object
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('meeting_type', 'general');
        formData.append('quality', 'normal');
        formData.append('min_importance', '6');
  
        // Upload the video file to the meeting using direct fetch
        const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/meetings/${meeting_id}/upload-video`, {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          console.error('Error uploading video:', uploadResponse.status, uploadResponse.statusText);
          const errorText = await uploadResponse.text();
          console.error('Upload error details:', errorText);
          throw new Error(`Failed to upload video: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        
        const result = await uploadResponse.json();
        console.log('Upload response:', result);
        
        if (result.success === false) {
          setUploadError(result.error || 'Processing failed');
          setIsUploading(false);
          return;
        }
        
        // If there's a warning but processing succeeded
        if (result.warning) {
          setUploadStatus(`Processing started with limitations: ${result.warning}`);
        } else {
          setUploadStatus('Processing started. Converting video to audio...');
        }
        
        setUploadProgress(40);
        
        // Start polling for status
        checkProcessingStatus(meeting_id);
        
      } catch (error) {
        console.error('API Error:', error);
        setUploadError(`API Error: ${error.message}`);
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadError(`Error: ${error.message}`);
      setIsUploading(false);
    }
  };

  // Add a function to check processing status
  const checkProcessingStatus = async (meeting_id, pollCount = 0) => {
    try {
      // Maximum number of poll attempts (3 minutes at 5 second intervals)
      const MAX_POLLS = 36;
      
      if (pollCount >= MAX_POLLS) {
        setUploadStatus('Processing is taking longer than expected. You will be redirected to the meeting page where you can check the status.');
        setTimeout(() => {
          window.location.href = `/meetings/${meeting_id}`;
        }, 2000);
        return;
      }
      
      // Update progress based on poll count (from 40% to 95%)
      const progressIncrement = 55 / MAX_POLLS;
      const newProgress = Math.min(95, 40 + (progressIncrement * pollCount)); 
      setUploadProgress(Math.round(newProgress));

      // Every 5th check, directly verify meeting data
      if (pollCount > 0 && pollCount % 5 === 0) {
        try {
          // Get meeting data directly
          const meetingResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/meetings/${meeting_id}`);
          if (meetingResponse.ok) {
            const meetingData = await meetingResponse.json();
            
            // If we have a transcript path, we can redirect
            if (meetingData.transcript_path) {
              setUploadStatus('Processing complete! Redirecting to meeting...');
              setUploadProgress(100);
              setTimeout(() => {
                window.location.href = `/meetings/${meeting_id}`;
              }, 1500);
              return;
            }
          }
        } catch (err) {
          console.log('Error checking meeting data directly:', err);
        }
      }

      // Fetch the current status
      const statusResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/meetings/${meeting_id}/pipeline-status`);
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to get status: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      console.log('Pipeline status:', statusData);
      
      // Update UI based on status
      if (statusData.status === 'completed') {
        setUploadStatus('Processing complete! Redirecting to meeting...');
        setUploadProgress(100);
        
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = `/meetings/${meeting_id}`;
        }, 1500);
        return;
      } 
      else if (statusData.status === 'partial') {
        setUploadStatus('Transcript ready, but summary is still processing...');
        
        // If we've been polling for a while with partial status, just redirect
        if (pollCount > 10) {
          setUploadStatus('Transcript is ready. Redirecting to meeting page...');
          setUploadProgress(100);
          setTimeout(() => {
            window.location.href = `/meetings/${meeting_id}`;
          }, 1500);
          return;
        }
        
        // Continue polling, but at a slower rate
        setTimeout(() => checkProcessingStatus(meeting_id, pollCount + 1), 5000);
      }
      else if (statusData.status === 'processing') {
        // Update status message based on progress
        if (pollCount < 5) {
          setUploadStatus('Converting video to audio...');
        } else if (pollCount < 15) {
          setUploadStatus('Transcribing audio...');
        } else if (pollCount < 30) {
          setUploadStatus('Analyzing transcript and creating summary...');
        } else {
          setUploadStatus('Still processing... This may take a few minutes for long videos.');
        }
        
        // Continue polling
        setTimeout(() => checkProcessingStatus(meeting_id, pollCount + 1), 5000);
      }
      else {
        // Unknown status, check a few more times then redirect
        if (pollCount > 10) {
          setUploadStatus('Redirecting to meeting page where you can check processing status...');
          setTimeout(() => {
            window.location.href = `/meetings/${meeting_id}`;
          }, 2000);
        } else {
          setTimeout(() => checkProcessingStatus(meeting_id, pollCount + 1), 5000);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      // If we can't check status, just redirect after a few attempts
      if (pollCount > 5) {
        setUploadStatus('Unable to check processing status. Redirecting to meeting page...');
        setTimeout(() => {
          window.location.href = `/meetings/${meeting_id}`;
        }, 2000);
      } else {
        setTimeout(() => checkProcessingStatus(meeting_id, pollCount + 1), 5000);
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
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
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed ${dragActive ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600'} rounded-lg hover:border-purple-300 dark:hover:border-purple-500 transition-colors cursor-pointer`}
                onClick={() => document.getElementById('file-upload').click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <FaUpload className={`mx-auto h-12 w-12 ${dragActive ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500">
                      <span>{t('meetings.uploadFile')}</span>
                      <input id="file-upload" name="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="video/*" />
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
                disabled={isUploading}
                className={`px-4 py-2 ${isUploading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              >
                {isUploading ? t('meetings.processing') : t('meetings.create')}
              </button>
            </div>
            
            {/* Upload Status */}
            {isUploading && (
              <div className="mt-6 p-4 border border-purple-200 rounded-lg bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">{uploadStatus}</h3>
                  <div className="text-xs text-purple-600 dark:text-purple-400">{uploadProgress}%</div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${uploadProgress}%` }} 
                  />
                </div>
                <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                  {t('meetings.processingDescription')}
                </p>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Note: For better speaker diarization, a Hugging Face API token is required. Without it, all speech will be assigned to a single speaker.
                </p>
              </div>
            )}
            
            {/* Error Display */}
            {uploadError && (
              <div className="mt-4 p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                {uploadError.includes("Unauthorized") && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    <p>This error is related to Hugging Face authentication. To fix it:</p>
                    <ol className="list-decimal ml-4 mt-1 space-y-1">
                      <li>Create an account at <a href="https://huggingface.co/join" target="_blank" rel="noopener noreferrer" className="underline">huggingface.co</a></li>
                      <li>Generate an access token at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">huggingface.co/settings/tokens</a></li>
                      <li>Accept the license for the model at <a href="https://huggingface.co/pyannote/speaker-diarization-3.1" target="_blank" rel="noopener noreferrer" className="underline">pyannote/speaker-diarization-3.1</a></li>
                      <li>Add the token to your backend environment</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
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