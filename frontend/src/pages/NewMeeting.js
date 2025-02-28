import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaUpload, FaMicrophone, FaUserCircle } from 'react-icons/fa';
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
  const [activeTab, setActiveTab] = useState('online');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [botName, setBotName] = useState('Meetmind Bot');

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

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8">
        <div className="mb-2">
          <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-700">
            <FaChevronLeft className="mr-1" size={14} />
            <span>Back</span>
          </Link>
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">New meeting</h1>
        
        {/* Meeting type tabs */}
        <div className="flex space-x-4 mb-8">
          <MeetingTypeTab 
            icon={<FaVideo className="text-purple-600" />} 
            label="Online meeting" 
            active={activeTab === 'online'} 
            onClick={() => setActiveTab('online')} 
          />
          <MeetingTypeTab 
            icon={<FaMicrophone className="text-gray-600" />} 
            label="In-person meeting" 
            active={activeTab === 'in-person'} 
            onClick={() => setActiveTab('in-person')} 
          />
          <MeetingTypeTab 
            icon={<FaUpload className="text-gray-600" />} 
            label="Upload meeting" 
            active={activeTab === 'upload'} 
            onClick={() => setActiveTab('upload')} 
          />
        </div>
        
        {/* Meeting URL input */}
        <div className="bg-white p-6 rounded-lg mb-8">
          {activeTab === 'online' && (
            <div>
              <div className="flex items-center border rounded-lg p-3 mb-6">
                <input 
                  type="text" 
                  className="flex-1 outline-none text-gray-700 placeholder-gray-400" 
                  placeholder="Paste your meeting URL here"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                />
                <div className="flex space-x-3 ml-2">
                  <FaGoogle className="text-blue-500" size={20} />
                  <FaVideo className="text-blue-400" size={20} />
                  <FaMicrosoft className="text-blue-600" size={20} />
                </div>
              </div>
              
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                onClick={handleStartCapturing}
              >
                Start capturing
              </button>
            </div>
          )}
          
          {activeTab === 'in-person' && (
            <div className="text-center py-8 text-gray-500">
              <FaMicrophone className="mx-auto mb-4 text-gray-400" size={32} />
              <p>Set up an in-person meeting recording</p>
            </div>
          )}
          
          {activeTab === 'upload' && (
            <div className="text-center py-8 text-gray-500">
              <FaUpload className="mx-auto mb-4 text-gray-400" size={32} />
              <p>Upload a recorded meeting file</p>
            </div>
          )}
        </div>
        
        {/* Meeting configuration */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name your meeting <span className="text-gray-400">(optional)</span></label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-lg" 
              placeholder="E.g. Team Sync"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Meeting language</label>
            <div className="relative">
              <select 
                className="w-full p-2 border rounded-lg appearance-none pr-8"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bot name</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-lg" 
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
            />
          </div>
        </div>
        
        {/* Recent meetings */}
        <MeetingList />
      </div>
      
      {/* Right sidebar - Today's schedule */}
      <div className="w-80 border-l border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Today</h2>
          <button className="text-gray-400 p-1 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700">Meetings</h3>
            <button className="text-xs text-gray-500 hover:text-gray-700">Capture all</button>
          </div>
          
          {/* Today's meetings list */}
          <div className="space-y-4">
            {todayMeetings.map(meeting => (
              <div key={meeting.id} className="flex items-center">
                <div className="flex-1 mr-3">
                  <h4 className="text-sm font-medium">{meeting.title}</h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{meeting.timeRange}</span>
                    
                    {meeting.platform === 'google' && (
                      <FaGoogle className="ml-2 text-blue-500" size={12} />
                    )}
                    {meeting.platform === 'teams' && (
                      <FaMicrosoft className="ml-2 text-blue-600" size={12} />
                    )}
                    {meeting.platform === 'zoom' && (
                      <FaVideo className="ml-2 text-blue-400" size={12} />
                    )}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <FaUserCircle className="mr-1" size={12} />
                    <span>{meeting.hostName}</span>
                  </div>
                </div>
                
                {/* Toggle switch for recording */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={meeting.recordingEnabled}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-purple-600 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* To-do section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700">To do</h3>
            <Link to="/action-items" className="text-xs text-purple-600 hover:text-purple-700 flex items-center">
              Go to Action Items <FaChevronRight className="ml-1" size={8} />
            </Link>
          </div>
          
          <div className="space-y-3">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-start">
                <input 
                  type="checkbox" 
                  className="mt-1 mr-3 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  checked={todo.completed}
                />
                <span className="text-sm text-gray-600">{todo.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewMeeting;