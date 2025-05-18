import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaChevronRight, FaGoogle, FaMicrosoft, FaVideo, FaListAlt, FaClock, FaUsers } from 'react-icons/fa';
import ROUTES from '../constants/routes';
import { useTranslation } from 'react-i18next';
import * as api from '../utils/api';

// Meeting card component (unchanged)
const MeetingCard = ({ meeting }) => {
  const { t } = useTranslation();
  const { id, meeting_id, title, date, time, duration, description, category, attendees, platform } = meeting;
  
  // Use meeting_id if available, fallback to id, ensure it's a string
  const meetingId = String(meeting_id || id);

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

  // Debug information - log the meetingId to help diagnose issues
  console.log('MeetingCard rendering with ID:', id, 'meeting_id:', meeting_id, 'using meetingId:', meetingId);

  return (
    <Link to={`/meetings/${meetingId}`} className="block">
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
            {attendees && attendees.map((attendee, index) => (
              <div key={index} className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 overflow-hidden">
                {attendee.avatar ? (
                  <img src={attendee.avatar} alt={attendee.name} className="w-full h-full object-cover" />
                ) : (
                  attendee.name.charAt(0)
                )}
              </div>
            ))}
            {attendees && attendees.length > 3 && (
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

// Stat card component (unchanged)
const StatCard = ({ title, value, icon, description, trend, trendValue }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t(title)}</h3>
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
      <p className="text-xs text-gray-500 dark:text-gray-400">{t(description)}</p>
    </div>
  );
};

// Action item component (unchanged)
const ActionItem = ({ item, onToggleComplete }) => {
  const { t } = useTranslation();
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
          <span className="text-xs text-gray-500 dark:text-gray-400">Due: {item.dueDate}</span>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  
  // Add console log to debug language
  // Sample recent meetings data (for fallback if API fails)
  const sampleMeetings = [
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

  // State for recent meetings
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState(null);

  // State for today's meetings
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [todayError, setTodayError] = useState(null);

  // State for action items
  const [actionItems, setActionItems] = useState([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [actionsError, setActionsError] = useState(null);

  // Fetch recent meetings
  useEffect(() => {
    const fetchRecentMeetings = async () => {
      try {
        setLoadingMeetings(true);
        const response = await api.get('/meetings/recent');
        
        console.log('Recent meetings API response:', response);
        
        if (response && response.meetings && Array.isArray(response.meetings)) {
          // Ensure consistent meeting ID property for each meeting
          const formattedMeetings = response.meetings.map(meeting => {
            const meetingObj = {
              ...meeting,
              id: meeting.id || meeting.meeting_id, // Ensure id is always available
              meeting_id: meeting.meeting_id || meeting.id // Ensure meeting_id is always available
            };
            console.log('Processed recent meeting:', meetingObj);
            return meetingObj;
          });
          setRecentMeetings(formattedMeetings);
        } else {
          console.warn('Recent meetings API returned unexpected format:', response);
          // Fallback to sample data
          setRecentMeetings(sampleMeetings);
        }
        
        setLoadingMeetings(false);
      } catch (error) {
        console.error('Error fetching recent meetings:', error);
        console.error('Error details:', error.message, error.status, error.response);
        setMeetingsError(error.message || 'Failed to fetch recent meetings');
        // Fallback to sample data
        setRecentMeetings(sampleMeetings);
        setLoadingMeetings(false);
      }
    };

    fetchRecentMeetings();
  }, []);

  // Fetch today's meetings
  useEffect(() => {
    const fetchTodayMeetings = async () => {
      try {
        setLoadingToday(true);
        const response = await api.get('/meetings/today');
        
        console.log('Today\'s meetings API response:', response);
        
        if (response && response.meetings && Array.isArray(response.meetings)) {
          // Ensure consistent meeting ID property for each meeting
          const formattedMeetings = response.meetings.map(meeting => {
            const meetingObj = {
              ...meeting,
              id: meeting.id || meeting.meeting_id, // Ensure id is always available
              meeting_id: meeting.meeting_id || meeting.id // Ensure meeting_id is always available
            };
            console.log('Processed today meeting:', meetingObj);
            return meetingObj;
          });
          setTodayMeetings(formattedMeetings);
        } else {
          console.warn('Today\'s meetings API returned unexpected format:', response);
          // Fallback to sample data
          setTodayMeetings([
            {
              id: 1,
              meeting_id: 1,
              title: 'Daily Standup',
              time: '10:00 AM',
              platform: 'google',
            },
            {
              id: 2,
              meeting_id: 2,
              title: 'Product Review',
              time: '2:00 PM',
              platform: 'teams',
            }
          ]);
        }
        
        setLoadingToday(false);
      } catch (error) {
        console.error('Error fetching today\'s meetings:', error);
        console.error('Error details:', error.message, error.status, error.response);
        setTodayError(error.message || 'Failed to fetch today\'s meetings');
        // Fallback to sample data
        setTodayMeetings([
          {
            id: 1,
            meeting_id: 1,
            title: 'Daily Standup',
            time: '10:00 AM',
            platform: 'google',
          },
          {
            id: 2,
            meeting_id: 2,
            title: 'Product Review',
            time: '2:00 PM',
            platform: 'teams',
          }
        ]);
        setLoadingToday(false);
      }
    };

    fetchTodayMeetings();
  }, []);

  // Fetch action items
  useEffect(() => {
    const fetchActionItems = async () => {
      try {
        setLoadingActions(true);
        const response = await api.get('/meetings/action-items/all');
        setActionItems(response.action_items);
        setLoadingActions(false);
      } catch (error) {
        console.error('Error fetching action items:', error);
        setActionsError(error.message || 'Failed to fetch action items');
        // Fallback to sample data
        setActionItems([
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
        setLoadingActions(false);
      }
    };

    fetchActionItems();
  }, []);

  // Handle toggling action item completion
  const handleToggleComplete = async (id) => {
    // In a real app, this would update the action item status via API
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

  // Loading indicators
  const renderLoading = () => (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );

  // Error indicators
  const renderError = (message) => (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{message}</p>
    </div>
  );

  return (
    <div className="p-6 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <Link 
          to={ROUTES.MEETINGS.NEW} 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" size={12} /> {t('dashboard.newMeeting')}
        </Link>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="dashboard.stats.totalMeetings" 
          value={recentMeetings.length || "42"} 
          icon={<FaVideo size={16} />}
          description="dashboard.stats.last30Days" 
          trend="up" 
          trendValue="12%"
        />
        <StatCard 
          title="dashboard.stats.meetingTime" 
          value="38h 24m" 
          icon={<FaClock size={16} />}
          description="dashboard.stats.last30Days" 
          trend="up" 
          trendValue="8%"
        />
        <StatCard 
          title="dashboard.stats.actionItems" 
          value={actionItems.length || "86"} 
          icon={<FaListAlt size={16} />}
          description="dashboard.stats.completed" 
          trend="down" 
          trendValue="5%"
        />
        <StatCard 
          title="dashboard.stats.participants" 
          value="18" 
          icon={<FaUsers size={16} />}
          description="dashboard.stats.activeContributors" 
          trend="up" 
          trendValue="2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent meetings section */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('dashboard.recentMeetings.title')}</h2>
            <Link 
              to={ROUTES.MEETINGS.ROOT} 
              className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center"
            >
              {t('dashboard.viewAll')} <FaChevronRight className="ml-1" size={12} />
            </Link>
          </div>
          
          {meetingsError && renderError(meetingsError)}

          {loadingMeetings ? (
            renderLoading()
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentMeetings.length > 0 ? recentMeetings.slice(0, 4).map((meeting, index) => (
                <MeetingCard key={meeting.id || index} meeting={meeting} />
              )) : (
                <div className="col-span-2 text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{t('dashboard.recentMeetings.empty')}</p>
                  <Link 
                    to={ROUTES.MEETINGS.NEW} 
                    className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <FaPlus className="mr-2" /> {t('dashboard.newMeeting')}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('dashboard.todaysPlan.title')}</h2>
            </div>
            
            {/* Today's Meetings */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('dashboard.todaysPlan.meetings')}</h3>
              
              {todayError && renderError(todayError)}
              
              {loadingToday ? (
                renderLoading()
              ) : todayMeetings.length > 0 ? (
                <div className="space-y-3">
                  {todayMeetings.map((meeting, index) => {
                    // Use the same approach as MeetingCard for consistent ID handling
                    // Make sure to convert ID to string
                    const meetingId = String(meeting.meeting_id || meeting.id);
                    console.log('Today meeting with ID:', meeting.id, 'meeting_id:', meeting.meeting_id, 'using meetingId:', meetingId);
                    return (
                      <Link to={`/meetings/${meetingId}`} key={index} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getPlatformIcon(meeting.platform)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{meeting.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{meeting.time}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.todaysPlan.noMeetings')}</div>
              )}
            </div>

            {/* Today's Action Items */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('dashboard.todaysPlan.actionItems')}</h3>
              
              {actionsError && renderError(actionsError)}
              
              {loadingActions ? (
                renderLoading()
              ) : actionItems.filter(item => item.dueDate === 'today').length > 0 ? (
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
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.todaysPlan.noActionItems')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('actionItems.title')}</h2>
          <Link 
            to={ROUTES.ACTION_ITEMS} 
            className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center"
          >
            {t('dashboard.viewAll')} <FaChevronRight className="ml-1" size={12} />
          </Link>
        </div>
        
        {actionsError && renderError(actionsError)}

        {loadingActions ? (
          renderLoading()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actionItems.length > 0 ? actionItems.slice(0, todayMeetings.length <= 1 ? 6 : 4).map((item, index) => (
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
            )) : (
              <div className="col-span-3 text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">{t('actionItems.empty')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming meetings section */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('dashboard.upcomingMeetings.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Tomorrow's meetings */}
          <Link to={ROUTES.MEETINGS.LIST} className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('dashboard.upcomingMeetings.tomorrow')}</h3>
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
          </Link>
          
          {/* Add meeting quick access */}
          <Link to={ROUTES.MEETINGS.NEW} className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
              <FaPlus className="text-purple-600 dark:text-purple-400" size={12} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.upcomingMeetings.scheduleNew')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;