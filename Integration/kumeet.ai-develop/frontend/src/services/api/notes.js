import * as baseApi from '../../utils/api';

/**
 * Notes API functions
 */

/**
 * Get all notes
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Notes list
 */
export const getNotes = async (params = {}) => {
  try {
    // Use real API call instead of mock data
    return await baseApi.get('/notes', { params });
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    throw error;
  }
};

/**
 * Get notes by meeting ID
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Array>} Notes for the meeting
 */
export const getNotesByMeetingId = async (meetingId) => {
  try {
    // Use real API call instead of mock data
    return await baseApi.get(`/notes/meeting/${meetingId}`);
  } catch (error) {
    console.error(`Failed to fetch notes for meeting ${meetingId}:`, error);
    throw error;
  }
};

/**
 * Get note by ID
 * @param {string} id - Note ID
 * @returns {Promise<Object>} Note data
 */
export const getNoteById = async (id) => {
  try {
    // Use real API call instead of mock data
    return await baseApi.get(`/notes/${id}`);
  } catch (error) {
    console.error(`Failed to fetch note ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new note
 * @param {Object} data - Note data
 * @returns {Promise<Object>} Created note
 */
export const createNote = async (data) => {
  try {
    // Use real API call instead of mock data
    return await baseApi.post('/notes', data);
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
};

/**
 * Update an existing note
 * @param {string} id - Note ID
 * @param {Object} data - Updated note data
 * @returns {Promise<Object>} Updated note
 */
export const updateNote = async (id, data) => {
  try {
    // Use real API call instead of mock data
    return await baseApi.put(`/notes/${id}`, data);
  } catch (error) {
    console.error(`Failed to update note ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a note
 * @param {string} id - Note ID
 * @returns {Promise<Object>} Result
 */
export const deleteNote = async (id) => {
  try {
    // Use real API call instead of mock data
    return await baseApi.del(`/notes/${id}`);
  } catch (error) {
    console.error(`Failed to delete note ${id}:`, error);
    throw error;
  }
};