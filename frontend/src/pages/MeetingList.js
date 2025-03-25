import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaGoogle, FaMicrosoft, FaVideo, FaPlus, FaEllipsisH } from 'react-icons/fa';
import ROUTES from '../constants/routes';
import * as api from '../utils/api';

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
    <Link to={ROUTES.MEETINGS.DETAIL(id)} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <FaEllipsisH />
          </button>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
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
            <span>{time} ({duration})</span>
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
              index < 3 && (
                <div key={index} className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 overflow-hidden">
                  {attendee.avatar ? (
                    <img src={attendee.avatar} alt={attendee.name} className="w-full h-full object-cover" />
                  ) : (
                    attendee.name.charAt(0)
                  )}
                </div>
              )
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

const MeetingList = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/meetings');
        setMeetings(response.meetings);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch meetings');
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  // Loading indicator
  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Meetings</h1>
        <Link
          to={ROUTES.MEETINGS.NEW}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <FaPlus className="mr-2" size={12} />
          New Meeting
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {meetings.map(meeting => (
          <MeetingCard
            key={meeting.meeting_id}
            meeting={{
              id: meeting.meeting_id,
              title: meeting.title,
              date: meeting.date,
              time: meeting.time,
              duration: meeting.duration,
              description: meeting.description,
              category: meeting.category || meeting.meeting_type,
              platform: meeting.platform,
              attendees: meeting.attendees
            }}
          />
        ))}
      </div>

      {meetings.length === 0 && (
        <div className="text-center py-12">
          <div className="mb-4">
            <FaVideo className="mx-auto text-gray-400 dark:text-gray-600" size={48} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No meetings found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first meeting</p>
          <Link
            to={ROUTES.MEETINGS.NEW}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-flex items-center transition-colors"
          >
            <FaPlus className="mr-2" size={12} />
            New Meeting
          </Link>
        </div>
      )}
    </div>
  );
};

export default MeetingList;