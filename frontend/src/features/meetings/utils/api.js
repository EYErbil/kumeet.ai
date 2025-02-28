import * as baseApi from '../../../utils/api';

/**
 * Meeting API functions
 */

/**
 * Get all meetings
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Meetings list
 */
export const getMeetings = async (params = {}) => {
  try {
    // In a real app, we would fetch from API
    // return await baseApi.get('/meetings', { params });
    
    // For mock data
    return mockGetMeetings(params);
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    throw error;
  }
};

/**
 * Get meeting by ID
 * @param {string} id - Meeting ID
 * @returns {Promise<Object>} Meeting data
 */
export const getMeetingById = async (id) => {
  try {
    // In a real app:
    // return await baseApi.get(`/meetings/${id}`);
    
    // For mock data
    return mockGetMeetingById(id);
  } catch (error) {
    console.error(`Failed to fetch meeting ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new meeting
 * @param {Object} data - Meeting data
 * @returns {Promise<Object>} Created meeting
 */
export const createMeeting = async (data) => {
  try {
    // In a real app:
    // return await baseApi.post('/meetings', data);
    
    // For mock
    return mockCreateMeeting(data);
  } catch (error) {
    console.error('Failed to create meeting:', error);
    throw error;
  }
};

/**
 * Upload meeting recording
 * @param {FormData} formData - Form data with file
 * @returns {Promise<Object>} Upload result
 */
export const uploadRecording = async (formData) => {
  try {
    // In a real app:
    // return await baseApi.uploadFile('/meetings/upload', formData);
    
    // For mock
    return mockUploadRecording(formData);
  } catch (error) {
    console.error('Failed to upload recording:', error);
    throw error;
  }
};

// Mock implementations
const mockGetMeetings = (params) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: [
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
        ]
      });
    }, 800);
  });
};

const mockGetMeetingById = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === '2') {
        resolve({
          data: {
            id: '2',
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
            overview: 'The team discussed project progress, highlighting near-completion of backend and frontend development.'
          }
        });
      } else {
        reject(new Error('Meeting not found'));
      }
    }, 800);
  });
};

const mockCreateMeeting = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          id: '3',
          ...data,
          createdAt: new Date().toISOString()
        }
      });
    }, 800);
  });
};

const mockUploadRecording = (formData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          id: '4',
          fileName: formData.get('file')?.name || 'unknown.mp4',
          fileSize: formData.get('file')?.size || 0,
          uploadedAt: new Date().toISOString(),
          status: 'processing'
        }
      });
    }, 1500);
  });
};