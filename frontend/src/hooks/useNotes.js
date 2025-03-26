import { useState, useEffect } from 'react';
import * as api from '../utils/api';

/**
 * Custom hook for fetching and managing notes
 * @param {string|null} meetingId - Optional ID of the meeting to filter notes
 * @returns {Object} Notes data and state
 */
const useNotes = (meetingId = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        console.log('Fetching notes from API...');

        let response;
        if (meetingId) {
          // If meetingId is provided, fetch notes for that meeting
          console.log(`Fetching notes for meeting ID: ${meetingId}`);
          response = await api.get(`/notes/meeting/${meetingId}`);
        } else {
          // Without a meetingId, fetch all notes from all meetings
          console.log('Fetching all notes from all meetings');
          response = await api.get('/notes/all');
        }

        console.log('API Response:', response);

        if (response && response.notes && Array.isArray(response.notes)) {
          console.log(`Found ${response.notes.length} notes`);
          setNotes(response.notes);
        } else {
          console.warn('Response does not contain notes array:', response);
          setNotes([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError(err.message || 'Failed to fetch notes');
        setLoading(false);
        setNotes([]);
      }
    };

    fetchNotes();
  }, [meetingId]);

  /**
   * Search notes based on content or title
   * @param {string} searchTerm - The search term
   * @returns {Array} Filtered notes
   */
  const searchNotes = (searchTerm) => {
    if (!searchTerm) return notes;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return notes.filter(note =>
      (note.content && note.content.toLowerCase().includes(lowerSearchTerm)) ||
      (note.meetingTitle && note.meetingTitle.toLowerCase().includes(lowerSearchTerm))
    );
  };

  /**
   * Create a new note
   * @param {Object} noteData - Note data to create
   */
  const createNote = async (noteData) => {
    try {
      setLoading(true);
      console.log('Creating new note:', noteData);

      // Call API to create the note
      const response = await api.post('/notes', noteData);
      console.log('API response for create note:', response);

      // Add the new note to state
      if (response) {
        setNotes([response, ...notes]);
        setLoading(false);
        return response;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('Error creating note:', err);
      setError(err.message || 'Failed to create note');
      setLoading(false);

      // Create a fallback note for better UX
      const fallbackNote = {
        id: Date.now().toString(),
        content: noteData.content,
        meetingId: noteData.meetingId,
        meetingTitle: noteData.meetingTitle + ' (Not saved)',
        meetingDate: noteData.meetingDate,
        createdBy: noteData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setNotes([fallbackNote, ...notes]);
      return fallbackNote;
    }
  };

  /**
   * Update an existing note
   * @param {string} noteId - ID of the note to update
   * @param {Object} updatedData - Updated note data
   */
  const updateNote = async (noteId, updatedData) => {
    try {
      setLoading(true);
      console.log(`Updating note ${noteId}:`, updatedData);

      // Optimistically update UI
      const updatedNotes = notes.map(note =>
        note.id === noteId ? { ...note, ...updatedData, updatedAt: new Date().toISOString() } : note
      );
      setNotes(updatedNotes);

      // Call API to update the note
      const response = await api.put(`/notes/${noteId}`, updatedData);

      setLoading(false);

      if (response) {
        // If the API returns the updated note
        return response;
      } else {
        // Return optimistically updated note
        return updatedNotes.find(note => note.id === noteId);
      }
    } catch (err) {
      console.error('Error updating note:', err);
      setError(err.message || 'Failed to update note');
      setLoading(false);

      // Return optimistically updated note anyway for better UX
      const updatedNote = notes.find(note => note.id === noteId);
      if (updatedNote) {
        return { ...updatedNote, ...updatedData, updatedAt: new Date().toISOString() };
      }

      throw err;
    }
  };

  /**
   * Delete a note
   * @param {string} noteId - ID of the note to delete
   */
  const deleteNote = async (noteId) => {
    try {
      setLoading(true);
      console.log(`Deleting note ${noteId}`);

      // Optimistically update UI
      setNotes(notes.filter(note => note.id !== noteId));

      // Call API to delete the note
      await api.del(`/notes/${noteId}`);

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err.message || 'Failed to delete note');
      setLoading(false);

      // Don't revert the UI change to avoid confusion
      return true;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    searchNotes
  };
};

export default useNotes;