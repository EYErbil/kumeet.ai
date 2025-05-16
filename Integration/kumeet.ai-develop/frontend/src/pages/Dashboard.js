import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaChevronRight, FaVideo, FaListAlt, FaClock } from 'react-icons/fa';
import ROUTES from '../constants/routes';
import { useTranslation } from 'react-i18next';
import * as api from '../utils/api';
import useActionItems from '../hooks/useActionItems';

// Meeting card component (unchanged)
const MeetingCard = ({ meeting }) => {
  const { t } = useTranslation();
  const { id, meeting_id, title, date, time, duration, description, category, attendees, platform } = meeting;
  
  // Use meeting_id if available, fallback to id, ensure it's a string
  const meetingId = String(meeting_id || id);

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
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{description}</p>

        <div className="flex justify-between items-center">
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {t(`meetings.categories.${category.toLowerCase()}`)}
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
  const { actionItems, pendingCount, loading: loadingActions, error: actionsError, toggleItemCompletion: handleToggleComplete } = useActionItems();
  
  // Add console log to debug language
  // Sample recent meetings data (for fallback if API fails)
  const sampleMeetings = [
    {
      id: 1,
      title: 'SmartSync feature launch',
      date: 'Mon, April 29, 2024',
      time: '2:00 PM',
      duration: '44m',
      duration_seconds: 2640, // 44 minutes in seconds
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
      duration_seconds: 3600, // 60 minutes in seconds
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

  // State for total meeting time
  const [totalMeetingTime, setTotalMeetingTime] = useState("0h 0m");
  const [loadingMeetingTime, setLoadingMeetingTime] = useState(true);
  const [meetingTimeError, setMeetingTimeError] = useState(null);
  
  // State for total meetings count
  const [totalMeetingsCount, setTotalMeetingsCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [countError, setCountError] = useState(null);

  // Format seconds into a readable duration string
  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) {
      return "0h 0m";
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Calculate total meeting time from meetings data (used as a fallback)
  const calculateTotalMeetingTime = (meetings) => {
    if (!meetings || meetings.length === 0) {
      return "0h 0m";
    }

    // Sum up all durations
    const totalSeconds = meetings.reduce((total, meeting) => {
      return total + (meeting.duration_seconds || 0);
    }, 0);
    
    return formatDuration(totalSeconds);
  };

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
          
          // Calculate and set total meeting time
          setTotalMeetingTime(calculateTotalMeetingTime(formattedMeetings));
        } else {
          console.warn('Recent meetings API returned unexpected format:', response);
          // Fallback to sample data
          setRecentMeetings(sampleMeetings);
          
          // Calculate and set total meeting time using sample data
          setTotalMeetingTime(calculateTotalMeetingTime(sampleMeetings));
        }
        
        setLoadingMeetings(false);
      } catch (error) {
        console.error('Error fetching recent meetings:', error);
        console.error('Error details:', error.message, error.status, error.response);
        setMeetingsError(error.message || 'Failed to fetch recent meetings');
        // Fallback to sample data
        setRecentMeetings(sampleMeetings);
        
        // Calculate and set total meeting time using sample data
        setTotalMeetingTime(calculateTotalMeetingTime(sampleMeetings));
        
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
  
  // Fetch total meetings count for the last 30 days
  useEffect(() => {
    const fetchMeetingsCount = async () => {
      try {
        setLoadingCount(true);
        const response = await api.get('/meetings/count/last-30-days');
        
        console.log('Meetings count API response:', response);
        
        if (response && typeof response.count === 'number') {
          setTotalMeetingsCount(response.count);
        } else {
          console.warn('Meetings count API returned unexpected format:', response);
          // Fallback to recentMeetings.length as before
          setTotalMeetingsCount(recentMeetings.length || 0);
        }
        
        setLoadingCount(false);
      } catch (error) {
        console.error('Error fetching meetings count:', error);
        setCountError(error.message || 'Failed to fetch meetings count');
        // Fallback to recentMeetings.length as before
        setTotalMeetingsCount(recentMeetings.length || 0);
        setLoadingCount(false);
      }
    };

    fetchMeetingsCount();
  }, []);
  
  // Fetch total meeting time for the last 30 days
  useEffect(() => {
    const fetchMeetingTime = async () => {
      try {
        setLoadingMeetingTime(true);
        const response = await api.get('/meetings/time/last-30-days');
        
        console.log('Meeting time API response:', response);
        
        if (response && typeof response.total_seconds === 'number') {
          // Format the seconds into a readable string
          setTotalMeetingTime(formatDuration(response.total_seconds));
        } else {
          console.warn('Meeting time API returned unexpected format:', response);
          // We don't need to use recentMeetings as a fallback here since we'll get proper data from the API
          setTotalMeetingTime("0h 0m");
        }
        
        setLoadingMeetingTime(false);
      } catch (error) {
        console.error('Error fetching meeting time:', error);
        setMeetingTimeError(error.message || 'Failed to fetch meeting time');
        // We don't need to use recentMeetings as a fallback here
        setTotalMeetingTime("0h 0m");
        setLoadingMeetingTime(false);
      }
    };

    fetchMeetingTime();
  }, []);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          title="dashboard.stats.totalMeetings" 
          value={loadingCount ? "..." : totalMeetingsCount} 
          icon={<FaVideo size={16} />}
          description="dashboard.stats.last30Days" 
        />
        <StatCard 
          title="dashboard.stats.meetingTime" 
          value={loadingMeetingTime ? "..." : totalMeetingTime} 
          icon={<FaClock size={16} />}
          description="dashboard.stats.last30Days" 
        />
        <StatCard 
          title="dashboard.stats.actionItems" 
          value={pendingCount} 
          icon={<FaListAlt size={16} />}
          description="dashboard.stats.pendingItems" 
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
              ) : actionItems.filter(item => item.due_date === 'today' || item.due_date.includes(new Date().toISOString().split('T')[0])).length > 0 ? (
                <div className="space-y-3">
                  {actionItems.filter(item => item.due_date === 'today' || item.due_date.includes(new Date().toISOString().split('T')[0])).map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={item.status === 'completed'}
                        onChange={() => handleToggleComplete(item.id)}
                        className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      <div>
                        <div className={`text-sm ${item.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {item.description}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.meeting_title}</div>
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
                    checked={item.status === 'completed'}
                    onChange={() => handleToggleComplete(item.id)}
                    className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div>
                    <div className={`text-sm ${item.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {item.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.meeting_title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due: {item.due_date}</div>
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
    </div>
  );
};

export default Dashboard;