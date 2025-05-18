/**
 * Base API utility functions for making HTTP requests
 */
import { getAuth } from 'firebase/auth';

// In Docker, if using the frontend container's "localhost" it won't reach the backend
// When using the Docker network, backend service is accessible via hostname "backend"
// For local development outside Docker, localhost is correct
// The REACT_APP_API_URL environment variable should be properly set in both contexts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// For debugging - let's log which API URL we're using
console.log('API Base URL:', API_BASE_URL);

/**
 * Get Firebase authentication token
 * @returns {Promise<string>} Authentication token
 */
const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return await user.getIdToken();
};

/**
 * Process API response according to the standardized format
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Processed response data
 */
const processResponse = async (response) => {
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`);
    let errorData;
    
    try {
      errorData = await response.json();
      console.error('Error details:', errorData);
    } catch (e) {
      const errorText = await response.text();
      console.error(`Error details (text): ${errorText}`);
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    throw new Error(errorData.message || `HTTP error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  // For standardized responses, extract data from success format
  if (data && data.success === true) {
    // If it's our standardized response format, extract just the data for the caller
    // Keep a consistent return shape by excluding "success" and "message" flags
    const { success, message, ...restData } = data;
    
    // If there's only one key in restData and it's "data", return just that
    const keys = Object.keys(restData);
    if (keys.length === 1 && keys[0] === 'data') {
      return restData.data;
    }
    
    // Otherwise return the rest of the data
    return restData;
  }
  
  // For older endpoints that don't use the standardized format
  return data;
};

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export const get = async (endpoint, options = {}) => {
  try {
    // Get auth token if available
    const token = await getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      ...options
    });

    const data = await processResponse(response);
    console.log(`API Response for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error('API GET error:', error);
    throw error;
  }
};

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export const post = async (endpoint, data, options = {}) => {
  try {
    // Get auth token if available
    const token = await getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options
    });

    return await processResponse(response);
  } catch (error) {
    console.error('API POST error:', error);
    throw error;
  }
};

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export const put = async (endpoint, data, options = {}) => {
  try {
    // Get auth token if available
    const token = await getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options
    });

    return await processResponse(response);
  } catch (error) {
    console.error('API PUT error:', error);
    throw error;
  }
};

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export const del = async (endpoint, options = {}) => {
  try {
    // Get auth token if available
    const token = await getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      ...options
    });

    return await processResponse(response);
  } catch (error) {
    console.error('API DELETE error:', error);
    throw error;
  }
};

/**
 * Upload a file
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - Form data with file
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export const uploadFile = async (endpoint, formData, options = {}) => {
  try {
    // Get auth token if available
    const token = await getAuthToken();

    const headers = {
      // Don't set Content-Type for multipart/form-data
      // It will be set automatically with the boundary
      ...options.headers
    };

    // Add auth header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      ...options
    });

    return await processResponse(response);
  } catch (error) {
    console.error('API file upload error:', error);
    throw error;
  }
};