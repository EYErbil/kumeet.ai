import { useState, useEffect } from 'react';
import * as api from '../utils/api';

/**
 * Custom hook for fetching and managing meeting data
 * @param {string|null} meetingId - ID of the meeting to fetch (null for all meetings)
 * @returns {Object} Meeting data and state
 */
const useMeeting = (meetingId = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // In a real app, we would fetch from the API
        // For now, simulate with mock data
        if (meetingId) {
          // Mock a single meeting fetch
          setTimeout(() => {
            // Sample meeting data
            const meetingData = {
              id: meetingId,
              title: 'Weekly dev sync',
              date: 'Mon, April 29, 2024',
              time: '3:00 PM - 4:00 PM',
              duration: 60,
              participants: [
                { id: 1, name: 'Sarah Lee', role: 'UI Designer' },
                { id: 2, name: 'John Doe', role: 'Team Leader' },
                { id: 3, name: 'Alex Brown', role: 'QA Engineer' },
                { id: 4, name: 'Michael Johnson', role: 'Frontend Developer' },
                { id: 5, name: 'Jane Smith', role: 'Backend Developer' }
              ],
              overview: 'The team discussed project progress, highlighting near-completion of backend and frontend development.',
              // Add other meeting details here
            };
            
            setData(meetingData);
            setLoading(false);
          }, 800);
        } else {
          // Mock a list of meetings fetch
          setTimeout(() => {
            // Sample meetings list
            const meetingsData = [
              {
                id: '1',
                title: 'SmartSync feature launch',
                date: 'Mon, April 29, 2024',
                time: '2:00 PM',
                duration: 44,
                description: 'The team convened for a focused discussion on the upcoming launch of the SmartSync feature.',
                category: 'Strategic planning',
                platform: 'teams',
                attendees: [
                  { name: 'John Doe', avatar: null },
                  { name: 'Sarah Lee', avatar: null }
                ]
              },
              {
                id: '2',
                title: 'Weekly dev sync',
                date: 'Mon, April 29, 2024',
                time: '3:00 PM',
                duration: 60,
                description: 'The team discussed project progress, highlighting near-completion of backend and frontend development.',
                category: 'Development',
                platform: 'google',
                attendees: [
                  { name: 'Jane Smith', avatar: null },
                  { name: 'Michael Johnson', avatar: null }
                ]
              }
            ];
            
            setData(meetingsData);
            setLoading(false);
          }, 800);
        }
        
        // In a real app, we would use:
        // const endpoint = meetingId ? `/meetings/${meetingId}` : '/meetings';
        // const response = await api.get(endpoint);
        // setData(response.data);
        
      } catch (err) {
        setError(err.message || 'Failed to fetch meeting data');
        setLoading(false);
      }
    };

    fetchData();
  }, [meetingId]);

  /**
   * Update meeting data
   * @param {Object} updatedData - Updated meeting data
   */
  const updateMeeting = async (updatedData) => {
    if (!meetingId) return;
    
    try {
      setLoading(true);
      
      // In a real app:
      // await api.put(`/meetings/${meetingId}`, updatedData);
      
      // For mock:
      setTimeout(() => {
        setData({ ...data, ...updatedData });
        setLoading(false);
      }, 500);
      
    } catch (err) {
      setError(err.message || 'Failed to update meeting');
      setLoading(false);
    }
  };

  return {
    meeting: data,
    meetings: Array.isArray(data) ? data : null,
    loading,
    error,
    updateMeeting
  };
};

export default useMeeting;