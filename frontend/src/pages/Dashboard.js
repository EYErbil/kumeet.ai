import React from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaListAlt, FaClock, FaUsers } from 'react-icons/fa';

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
    <Link to={`/meetings/${id}`} className="block">
      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
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

// Stat card component
const StatCard = ({ title, value, icon, description, trend, trendValue }) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline mb-1">
        <span className="text-2xl font-semibold text-gray-800">{value}</span>
        {trend && (
          <span className={`ml-2 text-xs font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trendValue}
            {trend === 'up' ? ' ↑' : ' ↓'}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
};

// Action item component
const ActionItem = ({ item }) => {
  return (
    <div className="flex items-start p-3 border-b border-gray-100">
      <input 
        type="checkbox" 
        className="mt-0.5 mr-3 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
        checked={item.completed}
      />
      <div className="flex-1">
        <p className="text-sm text-gray-700">{item.text}</p>
        <div className="flex items-center mt-1">
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-1 overflow-hidden">
            {item.assignee.avatar ? (
              <img src={item.assignee.avatar} alt={item.assignee.name} className="w-full h-full object-cover" />
            ) : (
              item.assignee.name.charAt(0)
            )}
          </div>
          <span className="text-xs text-gray-500">{item.assignee.name}</span>
          <span className="mx-2 text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">{item.dueDate}</span>
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
    },
    {
      id: 3,
      title: 'Product roadmap planning',
      date: 'Tue, April 30, 2024',
      time: '11:00 AM',
      duration: '90m',
      description: 'Discussion about Q3 product roadmap priorities and customer feedback implementation plan.',
      category: 'Product',
      platform: 'zoom',
      attendees: [
        { name: 'Emily Chen', avatar: null },
        { name: 'David Wilson', avatar: null },
        { name: 'Sarah Lee', avatar: null },
        { name: 'John Doe', avatar: null },
      ]
    },
    {
      id: 4,
      title: 'UX design review',
      date: 'Wed, May 1, 2024',
      time: '2:30 PM',
      duration: '45m',
      description: 'Review of new dashboard UI concepts and mobile app navigation improvements.',
      category: 'Design',
      platform: 'google',
      attendees: [
        { name: 'Sarah Lee', avatar: null },
        { name: 'Emma Rodriguez', avatar: null },
        { name: 'Alex Brown', avatar: null },
      ]
    }
  ];

  // Sample action items
  const actionItems = [
    {
      id: 1,
      text: 'Finalize authentication flow for the mobile app',
      completed: false,
      assignee: { name: 'Jane Smith', avatar: null },
      dueDate: 'May 5'
    },
    {
      id: 2,
      text: 'Create wireframes for new dashboard layout',
      completed: true,
      assignee: { name: 'Sarah Lee', avatar: null },
      dueDate: 'May 3'
    },
    {
      id: 3,
      text: 'Research third-party API alternatives for geolocation',
      completed: false,
      assignee: { name: 'Alex Brown', avatar: null },
      dueDate: 'May 7'
    },
    {
      id: 4,
      text: 'Document updated feature requirements for SmartSync',
      completed: false,
      assignee: { name: 'John Doe', avatar: null },
      dueDate: 'Today'
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <Link 
          to="/new-meeting" 
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
            <h2 className="text-lg font-medium text-gray-900">Recent meetings</h2>
            <Link 
              to="/meetings" 
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
        
        {/* Action items section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">Action items</h2>
            <Link 
              to="/action-items" 
              className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center"
            >
              See all <FaChevronRight className="ml-1" size={12} />
            </Link>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {actionItems.map(item => (
              <ActionItem key={item.id} item={item} />
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-100">
            <button className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Add action item
            </button>
          </div>
        </div>
      </div>
      
      {/* Upcoming meetings quick access section */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming meetings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Tomorrow's meetings */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Tomorrow</h3>
              <div className="text-xs text-gray-500">May 2, 2024</div>
            </div>
            <div className="text-sm font-medium">Team standup</div>
            <div className="text-xs text-gray-500 mt-1">10:00 AM - 10:30 AM</div>
            <div className="mt-3 flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-300 border border-white"></div>
              <div className="w-6 h-6 rounded-full bg-gray-300 border border-white"></div>
              <div className="w-6 h-6 rounded-full bg-gray-300 border border-white"></div>
              <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-xs">+2</div>
            </div>
          </div>
          
          {/* Add meeting quick access */}
          <Link to="/new-meeting" className="flex flex-col items-center justify-center bg-white rounded-lg p-4 border-2 border-dashed border-gray-300 hover:border-purple-300 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
              <FaPlus className="text-purple-600" size={12} />
            </div>
            <span className="text-sm font-medium text-gray-700">Schedule new meeting</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;