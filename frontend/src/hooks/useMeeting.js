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

        if (meetingId) {
          // Fetch a single meeting
          const response = await api.get(`/meetings/${meetingId}`);
          setData(response);
        } else {
          // Fetch all meetings
          const response = await api.get('/meetings');
          setData(response.meetings);
        }

        setLoading(false);
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

      const response = await api.put(`/meetings/${meetingId}`, updatedData);
      setData(response);
      setLoading(false);

      return response;
    } catch (err) {
      setError(err.message || 'Failed to update meeting');
      setLoading(false);
      throw err;
    }
  };

  return {
    meeting: meetingId ? data : null,
    meetings: meetingId ? null : data,
    loading,
    error,
    updateMeeting
  };
};

export default useMeeting;