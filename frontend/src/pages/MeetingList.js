import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight, FaGoogle, FaMicrosoft, FaVideo } from 'react-icons/fa';

// Reusable meeting card component
const MeetingCard = ({ meeting }) => {
  const { id, title, date, time, duration, description, category, attendees, platform } = meeting;
  
  // Platform icon based on meeting platform
  const getPlatformIcon = () => {
    switch(platform) {
      case 'google':
        return <div className="w-5 h-5 flex items-center justify-center"><FaGoogle className="text-blue-500" /></div>;
      case 'teams':
        return <div className="w-5 h-5 flex items-center justify-center"><FaMicrosoft className="text-blue-600" /></div>;
      default:
        return <div className="w-5 h-5 flex items-center justify-center"><FaVideo className="text-purple-500" /></div>;
    }
  };

  return (
    <Link to={`/meetings/${id}`} className="block">
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <div className="mr-4 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{date}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{duration}</span>
          </div>
          <div className="ml-3">{getPlatformIcon()}</div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {category}
            </span>
          </div>
          
          <div className="flex -space-x-2">
            {attendees.map((attendee, index) => (
              <div key={index} className="w-6 h-6 rounded-full bg-gray-300 border border-white flex items-center justify-center text-xs font-medium text-gray-600 overflow-hidden">
                {attendee.avatar ? (
                  <img src={attendee.avatar} alt={attendee.name} className="w-full h-full object-cover" />
                ) : (
                  attendee.name.charAt(0)
                )}
              </div>
            ))}
            {attendees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-xs text-gray-500">
                +{attendees.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

const MeetingList = () => {
  // Sample meeting data
  const recentMeetings = [
    {
      id: 1,
      title: 'SmartSync feature launch',
      date: 'Mon, April 29, 2024',
      time: '2:00 PM',
      duration: '44m',
      description: 'The team convened for a focused discussion on the upcoming launch of the SmartSync feature, a pivotal update designed to enhance real-time collaboration.',
      category: 'Strategic planning',
      platform: 'teams',
      attendees: [
        { name: 'John Doe', avatar: null },
        { name: 'Sarah Lee', avatar: null },
        { name: 'Robert Fox', avatar: null },
        { name: 'Alex Brown', avatar: null },
      ]
    },
    {
      id: 2,
      title: 'Weekly dev sync',
      date: 'Mon, April 29, 2024',
      time: '3:00 PM',
      duration: '60m',
      description: 'The team discussed project progress, highlighting near-completion of backend and frontend development. They addressed challenges in integrating a third-party API.',
      category: 'Development',
      platform: 'google',
      attendees: [
        { name: 'Jane Smith', avatar: null },
        { name: 'Michael Johnson', avatar: null },
        { name: 'Alex Brown', avatar: null },
      ]
    }
  ];

  return (
    <div className="px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Recent meetings</h1>
        <Link 
          to="/meetings" 
          className="text-purple-600 flex items-center text-sm font-medium hover:text-purple-700"
        >
          Go to Meetings <FaChevronRight className="ml-1" size={12} />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recentMeetings.map(meeting => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </div>
  );
};

export default MeetingList;