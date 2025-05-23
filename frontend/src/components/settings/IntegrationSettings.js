import React, { useState, useEffect } from 'react';
import { 
  getCalendarStatus, 
  getGoogleCalendarAuthUrl, 
  getOutlookCalendarAuthUrl,
  disconnectGoogleCalendar,
  disconnectOutlookCalendar,
  checkGoogleConnection
} from '../../services/api/calendar';
import { getCurrentUser } from '../../services/api/auth';
import { getHeaders } from '../../services/api/utils';
import axios from 'axios';
import {
  FaGoogle,
  FaMicrosoft,
  FaCheck,
  FaUnlink,
  FaLink,
  FaPlug,
  FaExclamationTriangle
} from 'react-icons/fa';

const handleConnectGoogle = async () => {
  try {
    setLoading(true);
    
    // Get the current user ID
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.uid) {
      showNotification('Please log in before connecting to Google Calendar', 'error');
      setLoading(false);
      return;
    }
    
    // Create a state parameter that includes the user ID
    const stateObj = { 
      userId: currentUser.uid,
      timestamp: Date.now() 
    };
    const stateParam = encodeURIComponent(JSON.stringify(stateObj));
    
    // Get the authorization URL with state parameter
    const response = await axios.get(
      `${API_URL}/calendar/auth/google?state=${stateParam}`,
      await getHeaders()
    );
    
    const authUrl = response.data.authorization_url;
    showNotification('Redirecting to Google for authorization...', 'success');
    setTimeout(() => { window.location.href = authUrl; }, 1000);
  } catch (error) {
    console.error('Error connecting to Google Calendar:', error);
    showNotification('Failed to connect to Google Calendar', 'error');
    setLoading(false);
  }
}; 