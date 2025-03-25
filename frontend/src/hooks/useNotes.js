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
      if (!meetingId) {
        setNotes([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // In a real app, we would fetch notes from the API
        // const response = await api.get(`/meetings/${meetingId}/notes`);
        // setNotes(response.notes);

        // For now, use mock data
        const mockNotes = [
          {
            id: '1',
            content: 'The team discussed project progress, highlighting near-completion of backend and frontend development. They addressed challenges in integrating a third-party API.\n\nAction items include finalizing authentication, UI designs, and testing. Next step: mid-week progress check-in.',
            createdBy: {
              id: '1',
              name: 'Current User'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            meetingId,
            meetingTitle: 'Project Sync',
            meetingDate: 'Mon, April 29, 2024'
          }
        ];

        // Simulate API delay
        setTimeout(() => {
          setNotes(mockNotes);
          setLoading(false);
        }, 500);
      } catch (err) {
        setError(err.message || 'Failed to fetch notes');
        setLoading(false);
      }
    };

    fetchNotes();
  }, [meetingId]);

  /**
   * Create a new note
   * @param {Object} noteData - Note data to create
   */
  const createNote = async (noteData) => {
    try {
      setLoading(true);

      // In a real app, this would call the API to create the note
      // const response = await api.post(`/meetings/${meetingId}/notes`, noteData);

      // For mock purposes
      const newNote = {
        id: Date.now().toString(),
        content: noteData.content,
        createdBy: noteData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meetingId: noteData.meetingId,
        meetingTitle: noteData.meetingTitle,
        meetingDate: noteData.meetingDate
      };

      setNotes([...notes, newNote]);
      setLoading(false);

      return newNote;
    } catch (err) {
      setError(err.message || 'Failed to create note');
      setLoading(false);
      throw err;
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

      // In a real app, this would call the API to update the note
      // const response = await api.put(`/meetings/${meetingId}/notes/${noteId}`, updatedData);

      // For mock purposes
      const noteIndex = notes.findIndex(note => note.id === noteId);
      if (noteIndex === -1) {
        throw new Error('Note not found');
      }

      const updatedNote = {
        ...notes[noteIndex],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      const updatedNotes = [...notes];
      updatedNotes[noteIndex] = updatedNote;

      setNotes(updatedNotes);
      setLoading(false);

      return updatedNote;
    } catch (err) {
      setError(err.message || 'Failed to update note');
      setLoading(false);
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

      // In a real app, this would call the API to delete the note
      // await api.del(`/meetings/${meetingId}/notes/${noteId}`);

      // For mock purposes
      setNotes(notes.filter(note => note.id !== noteId));
      setLoading(false);

      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete note');
      setLoading(false);
      throw err;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote
  };
};

export default useNotes;