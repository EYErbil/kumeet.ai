import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaListAlt, FaClock, FaUsers } from 'react-icons/fa';
import ROUTES from '../constants/routes';

// Meeting card component
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
    <Link to={ROUTES.MEETINGS.DETAIL(id)} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          <div className="mr-4 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{date} {time}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{duration}</span>
          </div>
          <div className="ml-3">{getPlatformIcon()}</div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{description}</p>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {category}
            </span>
          </div>
          
          <div className="flex -space-x-2">
            {attendees.map((attendee, index) => (
              <div key={index} className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 overflow-hidden">
                {attendee.avatar ? (
                  <img src={attendee.avatar} alt={attendee.name} className="w-full h-full object-cover" />
                ) : (
                  attendee.name.charAt(0)
                )}
              </div>
            ))}
            {attendees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                +{attendees.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

// Stat card component
const StatCard = ({ title, value, icon, description, trend, trendValue }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline mb-1">
        <span className="text-2xl font-semibold text-gray-800 dark:text-white">{value}</span>
        {trend && (
          <span className={`ml-2 text-xs font-medium ${trend === 'up' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trendValue}
            {trend === 'up' ? ' ↑' : ' ↓'}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
};

// Action item component
const ActionItem = ({ item, onToggleComplete }) => {
  return (
    <div className="flex items-start p-3 border-b border-gray-100 dark:border-gray-700">
      <input 
        type="checkbox" 
        className="mt-0.5 mr-3 h-4 w-4 text-purple-600 rounded border-gray-300 dark:border-gray-600 focus:ring-purple-500"
        checked={item.completed}
        onChange={() => onToggleComplete && onToggleComplete(item.id)}
      />
      <div className="flex-1">
        <p className={`text-sm text-gray-700 dark:text-gray-300 ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
          {item.text}
        </p>
        <div className="flex items-center mt-1">
          {item.meeting && <span className="text-xs text-gray-500 dark:text-gray-400">{item.meeting}</span>}
          {item.meeting && <span className="mx-2 text-xs text-gray-400 dark:text-gray-500">•</span>}
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.dueDate}</span>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Sample recent meetings data
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

  // Today's meetings data
  const todayMeetings = [
    {
      id: 1,
      title: 'Daily Standup',
      time: '10:00 AM',
      platform: 'google',
    },
    {
      id: 2,
      title: 'Product Review',
      time: '2:00 PM',
      platform: 'teams',
    }
  ];

  // Action items data
  const [actionItems, setActionItems] = useState([
    {
      id: 1,
      text: 'Review sprint backlog',
      meeting: 'Sprint Planning',
      completed: false,
      dueDate: 'today'
    },
    {
      id: 2,
      text: 'Update API documentation',
      meeting: 'Team Sync',
      completed: false,
      dueDate: 'today'
    }
  ]);

  // Handle toggling action item completion
  const handleToggleComplete = (id) => {
    setActionItems(actionItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  // Platform icon helper function
  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'google':
        return <FaGoogle className="text-blue-500" />;
      case 'teams':
        return <FaMicrosoft className="text-blue-600" />;
      default:
        return <FaVideo className="text-purple-500" />;
    }
  };

  return (
    <div className="p-6 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <Link 
          to={ROUTES.MEETINGS.NEW} 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" size={12} />
          New Meeting
        </Link>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Meetings" 
          value="42" 
          icon={<FaVideo size={16} />}
          description="Last 30 days" 
          trend="up" 
          trendValue="12%"
        />
        <StatCard 
          title="Meeting Time" 
          value="38h 24m" 
          icon={<FaClock size={16} />}
          description="Last 30 days" 
          trend="up" 
          trendValue="8%"
        />
        <StatCard 
          title="Action Items" 
          value="86" 
          icon={<FaListAlt size={16} />}
          description="43 completed" 
          trend="down" 
          trendValue="5%"
        />
        <StatCard 
          title="Participants" 
          value="18" 
          icon={<FaUsers size={16} />}
          description="Active contributors" 
          trend="up" 
          trendValue="2"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent meetings section */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent meetings</h2>
            <Link 
              to={ROUTES.MEETINGS.ROOT} 
              className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center"
            >
              See all <FaChevronRight className="ml-1" size={12} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMeetings.slice(0, 4).map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>

        {/* Today's Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Today's Plan</h2>
            </div>
            
            {/* Today's Meetings */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Meetings</h3>
              <div className="space-y-3">
                {todayMeetings.map((meeting, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getPlatformIcon(meeting.platform)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{meeting.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{meeting.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Action Items */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Action Items</h3>
              <div className="space-y-3">
                {actionItems.filter(item => item.dueDate === 'today').map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleComplete(item.id)}
                      className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <div>
                      <div className={`text-sm ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {item.text}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.meeting}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Action Items</h2>
          <Link 
            to={ROUTES.ACTION_ITEMS} 
            className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center"
          >
            See all <FaChevronRight className="ml-1" size={12} />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actionItems.map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleComplete(item.id)}
                  className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <div>
                  <div className={`text-sm ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    {item.text}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.meeting}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due: {item.dueDate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming meetings section */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upcoming meetings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Tomorrow's meetings */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Tomorrow</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">May 2, 2024</div>
            </div>
            <div className="text-sm font-medium dark:text-white">Team standup</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">10:00 AM - 10:30 AM</div>
            <div className="mt-3 flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">+2</div>
            </div>
          </div>
          
          {/* Add meeting quick access */}
          <Link to={ROUTES.MEETINGS.NEW} className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
              <FaPlus className="text-purple-600 dark:text-purple-400" size={12} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule new meeting</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;