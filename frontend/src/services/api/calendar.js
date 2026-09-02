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
    
    // If no user is found, return a default response
    if (!currentUser) {
      console.log('No authenticated user found in getCalendarStatus');
      return {
        googleCalendar: { connected: false, email: '', lastSync: '' },
        outlookCalendar: { connected: false, email: '', lastSync: '' }
      };
    }
    
    // Add user_id as a query parameter
    const userId = currentUser.uid;
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

// Get authorization URL for Google Calendar
export const getGoogleCalendarAuthUrl = async () => {
  try {
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/calendar/auth/google`, headers);
    return response.data.authorization_url;
  } catch (error) {
    console.error('Error getting Google Calendar auth URL:', error);
    throw error;
  }
};

// Get authorization URL for Outlook Calendar
export const getOutlookCalendarAuthUrl = async () => {
  try {
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/calendar/auth/outlook`, headers);
    return response.data.authorization_url;
  } catch (error) {
    console.error('Error getting Outlook Calendar auth URL:', error);
    throw error;
  }
};

// Handle OAuth callback for Google Calendar
export const handleGoogleCalendarCallback = async (code) => {
  try {
    const headers = await getHeaders();
    console.log(`Sending Google Calendar callback with code: ${code.substring(0, 10)}...`);
    
    const response = await axios.get(
      `${API_URL}/calendar/auth/google/callback?code=${encodeURIComponent(code)}`,
      headers
    );
    
    console.log('Google Calendar callback response:', response.data);
    
    // Get the updated calendar status
    const updatedStatus = await getCalendarStatus();
    console.log('Updated calendar status after callback:', updatedStatus);
    
    // Force a refresh of the calendar status by making a direct call to check Google connection
    const googleStatus = await checkGoogleConnection();
    console.log('Direct Google connection check:', googleStatus);
    
    // Create a result object with the connection status
    const result = {
      connected: true,
      email: response.data.email || updatedStatus.googleCalendar.email || googleStatus.email || '',
      lastSync: new Date().toISOString()
    };
    
    // Update the localStorage directly to ensure consistency
    try {
      const storedStatus = localStorage.getItem('calendarStatus');
      let calendarStatus = storedStatus ? JSON.parse(storedStatus) : {
        googleCalendar: { connected: false, email: '', lastSync: '' },
        outlookCalendar: { connected: false, email: '', lastSync: '' }
      };
      
      // Update the Google Calendar status
      calendarStatus.googleCalendar = {
        connected: true,
        email: result.email,
        lastSync: result.lastSync
      };
      
      // Store the updated status
      localStorage.setItem('calendarStatus', JSON.stringify(calendarStatus));
      console.log('Updated calendar status in localStorage:', calendarStatus);
    } catch (storageError) {
      console.error('Error updating calendar status in localStorage:', storageError);
    }
    
    return result;
  } catch (error) {
    console.error('Error handling Google Calendar callback:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
};

// Handle OAuth callback for Outlook Calendar
export const handleOutlookCalendarCallback = async (code) => {
  try {
    const headers = await getHeaders();
    console.log(`Sending Outlook Calendar callback with code: ${code.substring(0, 10)}...`);
    
    const response = await axios.get(
      `${API_URL}/calendar/auth/outlook/callback?code=${encodeURIComponent(code)}`,
      headers
    );
    
    console.log('Outlook Calendar callback response:', response.data);
    
    // Refresh calendar status to get updated information
    await getCalendarStatus();
    
    return {
      connected: true,
      email: response.data.email,
      lastSync: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error handling Outlook Calendar callback:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
};

// Disconnect Google Calendar
export const disconnectGoogleCalendar = async () => {
  try {
    const headers = await getHeaders();
    await axios.delete(`${API_URL}/calendar/auth/google`, headers);
    
    // Update the localStorage to reflect the disconnection
    try {
      const storedStatus = localStorage.getItem('calendarStatus');
      if (storedStatus) {
        const calendarStatus = JSON.parse(storedStatus);
        calendarStatus.googleCalendar = {
          connected: false,
          email: '',
          lastSync: ''
        };
        localStorage.setItem('calendarStatus', JSON.stringify(calendarStatus));
        console.log('Updated calendar status in localStorage after disconnection:', calendarStatus);
      }
    } catch (storageError) {
      console.error('Error updating calendar status in localStorage:', storageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    throw error;
  }
};

// Disconnect Outlook Calendar
export const disconnectOutlookCalendar = async () => {
  try {
    const headers = await getHeaders();
    await axios.delete(`${API_URL}/calendar/auth/outlook`, headers);
    return true;
  } catch (error) {
    console.error('Error disconnecting Outlook Calendar:', error);
    throw error;
  }
};

// Create meeting event in calendar
export const createMeetingEvent = async (meetingData, calendarType) => {
  try {
    const headers = await getHeaders();
    const response = await axios.post(
      `${API_URL}/calendar/events/meeting`,
      { ...meetingData, calendar_type: calendarType },
      headers
    );
    return response.data;
  } catch (error) {
    console.error('Error creating meeting event:', error);
    throw error;
  }
};

// Create action item event in calendar
export const createActionItemEvent = async (actionItemData, calendarType) => {
  try {
    const headers = await getHeaders();
    console.log('Creating action item event with data:', { ...actionItemData, calendar_type: calendarType });
    
    // Ensure the action item has all required fields
    const payload = {
      ...actionItemData,
      calendar_type: calendarType,
      title: actionItemData.title || 'Action Item',
      action_item_id: actionItemData.action_item_id || actionItemData.id || Date.now().toString(),
      due_date: actionItemData.due_date || new Date().toISOString()
    };
    
    console.log('Sending action item payload to API:', payload);
    
    const response = await axios.post(
      `${API_URL}/calendar/events/action-item`,
      payload,
      headers
    );
    
    console.log('Action item event creation response:', response.data);
    
    // Check if we need to authenticate
    if (response.data.status === 'not_connected' || response.data.status === 'token_expired') {
      return {
        success: false,
        message: response.data.message,
        authorization_url: response.data.authorization_url,
        status: response.data.status
      };
    }
    
    return {
      success: true,
      event_id: response.data.event_id,
      message: response.data.message,
      status: response.data.status || 'success'
    };
  } catch (error) {
    console.error('Error creating action item event:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      
      // Check if we need to authenticate
      if (error.response.data && 
          (error.response.data.status === 'not_connected' || 
           error.response.data.status === 'token_expired')) {
        return {
          success: false,
          message: error.response.data.message,
          authorization_url: error.response.data.authorization_url,
          status: error.response.data.status
        };
      }
    }
    throw error;
  }
};

// Check Google Calendar connection status
export const checkGoogleConnection = async () => {
  try {
    const headers = await getHeaders();
    console.log('Checking Google Calendar connection...');
    
    // Get the current user from Firebase Auth
    const currentUser = getCurrentUser();
    
    // If no user is found, return a default response
    if (!currentUser) {
      console.log('No authenticated user found in checkGoogleConnection');
      return {
        connected: false,
        email: "",
        message: "Authentication required to check calendar connection"
      };
    }
    
    const response = await axios.get(`${API_URL}/calendar/google-status?user_id=${currentUser.uid}`, headers);
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