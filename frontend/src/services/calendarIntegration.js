import { createMeetingEvent, createActionItemEvent, getCalendarStatus } from './api/calendar';

/**
 * Calendar integration service
 * This service provides functions to integrate meetings and action items with calendar services
 */

// Check if calendar integration is available
export const isCalendarAvailable = async (calendarType = null, useMock = false) => {
  try {
    console.log(`Checking if ${calendarType || 'any'} calendar is available...`);
    
    // First, check if we have a stored status in localStorage
    let status = null;
    const storedStatus = localStorage.getItem('calendarStatus');
    
    if (storedStatus) {
      try {
        const parsedStatus = JSON.parse(storedStatus);
        console.log('Retrieved calendar status from localStorage:', parsedStatus);
        status = parsedStatus;
      } catch (parseError) {
        console.error('Error parsing stored calendar status:', parseError);
      }
    }
    
    // If we don't have a valid stored status, fetch from API
    if (!status) {
      status = await getCalendarStatus();
    }
    
    console.log('Calendar status response:', status);
    
    if (calendarType === 'google') {
      console.log(`Google Calendar connected: ${status.googleCalendar.connected}`);
      return status.googleCalendar.connected;
    } else if (calendarType === 'outlook') {
      console.log(`Outlook Calendar connected: ${status.outlookCalendar.connected}`);
      return status.outlookCalendar.connected;
    } else {
      // Return true if any calendar is connected
      const anyConnected = status.googleCalendar.connected || status.outlookCalendar.connected;
      console.log(`Any calendar connected: ${anyConnected}`);
      return anyConnected;
    }
  } catch (error) {
    console.error('Error checking calendar availability:', error);
    
    // Try to get the status from localStorage as a fallback
    try {
      const storedStatus = localStorage.getItem('calendarStatus');
      if (storedStatus) {
        const parsedStatus = JSON.parse(storedStatus);
        console.log('Fallback: Retrieved calendar status from localStorage:', parsedStatus);
        
        if (calendarType === 'google') {
          return parsedStatus.googleCalendar.connected;
        } else if (calendarType === 'outlook') {
          return parsedStatus.outlookCalendar.connected;
        } else {
          return parsedStatus.googleCalendar.connected || parsedStatus.outlookCalendar.connected;
        }
      }
    } catch (storageError) {
      console.error('Error retrieving calendar status from localStorage:', storageError);
    }
    
    return false;
  }
};

// Get user's preferred calendar type
export const getPreferredCalendarType = async (useMock = false) => {
  try {
    const status = await getCalendarStatus(useMock);
    
    // Return the first connected calendar type, prioritizing Google
    if (status.googleCalendar.connected) {
      return 'google';
    } else if (status.outlookCalendar.connected) {
      return 'outlook';
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting preferred calendar type:', error);
    return null;
  }
};

// Add meeting to calendar
export const addMeetingToCalendar = async (meeting, calendarType = null, useMock = false) => {
  try {
    // If no calendar type specified, use preferred calendar
    if (!calendarType) {
      calendarType = await getPreferredCalendarType(useMock);
      
      // If no calendar is connected, return error
      if (!calendarType) {
        throw new Error('No calendar connected');
      }
    }
    
    // Format meeting data for calendar
    const meetingData = {
      title: meeting.title,
      start_time: new Date(meeting.startTime || meeting.scheduledTime).toISOString(),
      end_time: new Date(meeting.endTime || new Date(meeting.scheduledTime).getTime() + 60 * 60 * 1000).toISOString(),
      meeting_id: meeting.id,
      description: meeting.description || 'Meeting created by kumeet.ai',
      location: meeting.location || '',
      attendees: meeting.attendees?.map(attendee => ({
        email: attendee.email,
        name: attendee.name || attendee.email.split('@')[0]
      })) || []
    };
    
    // Create meeting event in calendar
    const result = await createMeetingEvent(meetingData, calendarType, useMock);
    
    return {
      success: true,
      eventId: result.event_id,
      message: result.message,
      calendarType
    };
  } catch (error) {
    console.error('Error adding meeting to calendar:', error);
    return {
      success: false,
      message: error.message || 'Failed to add meeting to calendar',
      calendarType
    };
  }
};

// Add action item to calendar
export const addActionItemToCalendar = async (actionItem, calendarType = null, useMock = false, retryCount = 0) => {
  try {
    console.log('Adding action item to calendar:', actionItem);
    
    // If no calendar type specified, use preferred calendar
    if (!calendarType) {
      calendarType = await getPreferredCalendarType(useMock);
      
      // If no calendar is connected, return error
      if (!calendarType) {
        throw new Error('No calendar connected');
      }
    }
    
    // Format action item data for calendar
    const actionItemData = {
      action_item_id: actionItem.id,
      title: actionItem.title || actionItem.text || 'Action Item',
      description: `Action Item: ${actionItem.title || actionItem.text || 'No description'}`,
      due_date: actionItem.dueDate ? new Date(actionItem.dueDate).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      calendar_type: calendarType
    };
    
    console.log('Formatted action item data:', actionItemData);
    
    // Create action item event in calendar
    const result = await createActionItemEvent(actionItemData, calendarType, useMock);
    
    console.log('Action item creation result:', result);
    
    // If successful, show a more detailed success message
    if (result.success) {
      return {
        success: true,
        eventId: result.event_id,
        message: `Added "${actionItemData.title}" to ${calendarType === 'google' ? 'Google' : 'Outlook'} Calendar`,
        calendarType
      };
    }
    
    // Check if we need to authenticate
    if (!result.success && 
        (result.status === 'not_connected' || result.status === 'token_expired') && 
        result.authorization_url) {
      
      // If we've already retried too many times, just return the error
      if (retryCount >= 2) {
        console.warn('Too many authentication retries, giving up');
        return {
          success: false,
          message: 'Authentication failed after multiple attempts. Please try again later.',
          status: 'auth_failed',
          calendarType
        };
      }
      
      return {
        success: false,
        message: result.message || 'Calendar authentication required',
        authorization_url: result.authorization_url,
        status: result.status,
        calendarType
      };
    }
    
    return {
      success: result.success !== false,
      eventId: result.event_id,
      message: result.message || 'Action item added to calendar',
      calendarType
    };
  } catch (error) {
    console.error('Error adding action item to calendar:', error);
    return {
      success: false,
      message: error.message || 'Failed to add action item to calendar',
      calendarType
    };
  }
}; 