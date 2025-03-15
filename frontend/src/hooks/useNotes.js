import { useState, useEffect } from 'react';
import * as notesApi from '../services/api/notes';

/**
 * Custom hook for fetching and managing notes data
 * @param {string|null} meetingId - ID of the meeting to fetch notes for (null for all notes)
 * @returns {Object} Notes data and state
 */
const useNotes = (meetingId = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);
  
  // Handle ResizeObserver error
  useEffect(() => {
    // This prevents the "ResizeObserver loop completed with undelivered notifications" error
    const handleError = (event) => {
      if (event.message && event.message.includes('ResizeObserver')) {
        event.stopImmediatePropagation();
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  // Fetch notes data
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        if (meetingId) {
          // Fetch notes for a specific meeting
          response = await notesApi.getNotesByMeetingId(meetingId);
        } else {
          // Fetch all notes
          response = await notesApi.getNotes();
        }
        
        setNotes(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch notes:', err);
        setError(err.message || 'Failed to fetch notes');
        setLoading(false);
      }
    };
    
    fetchNotes();
  }, [meetingId]);
  
  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note
   */
  const createNote = async (noteData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notesApi.createNote(noteData);
      
      // Update local state
      setNotes(prevNotes => [response.data, ...prevNotes]);
      setLoading(false);
      
      return response.data;
    } catch (err) {
      console.error('Failed to create note:', err);
      setError(err.message || 'Failed to create note');
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Update an existing note
   * @param {string} id - Note ID
   * @param {Object} noteData - Updated note data
   * @returns {Promise<Object>} Updated note
   */
  const updateNote = async (id, noteData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notesApi.updateNote(id, noteData);
      
      // Update local state
      setNotes(prevNotes => 
        prevNotes.map(note => note.id === id ? response.data : note)
      );
      
      setLoading(false);
      return response.data;
    } catch (err) {
      console.error(`Failed to update note ${id}:`, err);
      setError(err.message || 'Failed to update note');
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Delete a note
   * @param {string} id - Note ID
   * @returns {Promise<boolean>} Success status
   */
  const deleteNote = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      await notesApi.deleteNote(id);
      
      // Update local state
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error(`Failed to delete note ${id}:`, err);
      setError(err.message || 'Failed to delete note');
      setLoading(false);
      throw err;
    }
  };
  
  /**
   * Get a note by ID
   * @param {string} id - Note ID
   * @returns {Object|null} Note data or null if not found
   */
  const getNoteById = (id) => {
    return notes.find(note => note.id === id) || null;
  };
  
  /**
   * Search notes by term
   * @param {string} searchTerm - Search term
   * @returns {Array} Filtered notes
   */
  const searchNotes = (searchTerm) => {
    if (!searchTerm) return notes;
    
    const term = searchTerm.toLowerCase();
    return notes.filter(note => 
      note.meetingTitle.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term)
    );
  };
  
  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    searchNotes
  };
};

export default useNotes; 