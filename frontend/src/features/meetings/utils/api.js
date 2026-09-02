/**
 * API utility functions for making HTTP requests
 */

// Configuration
const getBaseUrl = () => {
  // In Docker, use the service name to connect to the backend
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Check if running in Docker by examining hostname
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'http://backend:8000/api';
  }

  // For local development
  return 'http://localhost:8000/api';
};

export const BASE_URL = getBaseUrl();

/**
 * Make a GET request
 * @param {string} url - API endpoint
 * @param {Object} config - Additional fetch configuration
 * @returns {Promise<Object>} Response data
 */
export const get = async (url, config = {}) => {
  try {
    console.log(`Making API GET request to: ${BASE_URL}${url}`);
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      ...config,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`API response for ${url}:`, data);
    return data;
  } catch (error) {
    console.error(`API GET error for ${url}:`, error);
    throw error;
  }
};

/**
 * Make a POST request
 * @param {string} url - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} config - Additional fetch configuration
 * @returns {Promise<Object>} Response data
 */
export const post = async (url, data, config = {}) => {
  try {
    console.log(`Making API POST request to: ${BASE_URL}${url}`, data);
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify(data),
      ...config,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(`API response for ${url}:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`API POST error for ${url}:`, error);
    throw error;
  }
};

/**
 * Make a PUT request
 * @param {string} url - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} config - Additional fetch configuration
 * @returns {Promise<Object>} Response data
 */
export const put = async (url, data, config = {}) => {
  try {
    console.log(`Making API PUT request to: ${BASE_URL}${url}`, data);
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify(data),
      ...config,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(`API response for ${url}:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`API PUT error for ${url}:`, error);
    throw error;
  }
};

/**
 * Make a DELETE request
 * @param {string} url - API endpoint
 * @param {Object} config - Additional fetch configuration
 * @returns {Promise<Object>} Response data
 */
export const del = async (url, config = {}) => {
  try {
    console.log(`Making API DELETE request to: ${BASE_URL}${url}`);
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      ...config,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    // Some DELETE endpoints may not return content
    try {
      const data = await response.json();
      console.log(`API response for ${url}:`, data);
      return data;
    } catch (e) {
      // If no JSON content, return success object
      return { success: true };
    }
  } catch (error) {
    console.error(`API DELETE error for ${url}:`, error);
    throw error;
  }
};