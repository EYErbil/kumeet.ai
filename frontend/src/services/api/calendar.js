import axios from 'axios';
import { getAuthToken, getCurrentUser } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to get headers with auth token
const getHeaders = async () => {
  const token = await getAuthToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

// Get calendar integration status
export const getCalendarStatus = async () => {
  try {
    const headers = await getHeaders();
    console.log('Fetching calendar status from API...');
    
    // Get the current user from Firebase Auth
    const currentUser = getCurrentUser();
    let userId = currentUser?.uid;
    
    // If no user ID is found, return a default response
    if (!userId) {
      console.log('No authenticated user found in getCalendarStatus');
      return {
        googleCalendar: { connected: false, email: '', lastSync: '' },
        outlookCalendar: { connected: false, email: '', lastSync: '' }
      };
    }
    
    // Add user_id as a query parameter
    const response = await axios.get(`${API_URL}/calendar/status?user_id=${userId}`, headers);
    console.log('Raw calendar status response:', response.data);
    
    // Transform the response to match the expected format
    const result = {
      googleCalendar: {
        connected: response.data.google || false,
        email: response.data.google_email || '',
        lastSync: response.data.google_last_sync || ''
      },
      outlookCalendar: {
        connected: response.data.outlook || false,
        email: response.data.outlook_email || '',
        lastSync: response.data.outlook_last_sync || ''
      }
    };
    
    // Store the status in localStorage for quick access
    try {
      localStorage.setItem('calendarStatus', JSON.stringify(result));
    } catch (storageError) {
      console.error('Error storing calendar status in localStorage:', storageError);
    }
    
    return result;
  } catch (error) {
    console.error('Error getting calendar status:', error);
    // Return a default response instead of throwing an error
    return {
      googleCalendar: { connected: false, email: '', lastSync: '' },
      outlookCalendar: { connected: false, email: '', lastSync: '' }
    };
  }
};

// Check Google Calendar connection status
export const checkGoogleConnection = async () => {
  try {
    const headers = await getHeaders();
    console.log('Checking Google Calendar connection...');
    
    // Get the current user from Firebase Auth
    const currentUser = getCurrentUser();
    let userId = currentUser?.uid;
    
    // If no user ID is found, return a default response
    if (!userId) {
      console.log('No authenticated user found in checkGoogleConnection');
      return {
        connected: false,
        email: "",
        message: "Authentication required to check calendar connection"
      };
    }
    
    const response = await axios.get(`${API_URL}/calendar/google-status?user_id=${userId}`, headers);
    console.log('Google Calendar connection check response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error checking Google Calendar connection:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    // Return a default response instead of throwing an error
    return {
      connected: false,
      email: "",
      message: "Error checking Google Calendar connection"
    };
  }
}; 