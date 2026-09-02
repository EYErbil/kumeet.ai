import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChevronLeft,
  FaSearch,
  FaCalendarAlt,
  FaClock,
  FaEdit,
  FaTrash,
  FaPlus,
  FaFileAlt,
  FaVideo
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import ROUTES from '../constants/routes';
import * as api from '../utils/api';

// Enhanced Note card with better meeting display
const NoteCard = ({ note, onSelect, isSelected }) => {
  const { t } = useTranslation();
  const { meetingTitle, meetingDate, content, updatedAt, meetingId } = note;

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString || 'Unknown date';
    }
  };

  const truncateContent = (text, maxLength = 150) => {
    if (!text) return t('notes.noContent');
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Determine note type label
  const getNoteTypeLabel = () => {
    return meetingId ? t('notes.meetingNote') : t('notes.personalNote');
  };

  return (
    <div
      className={`p-4 border rounded-lg mb-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-purple-500 bg-purple-50 dark:bg-gray-700' 
          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-800'
      }`}
      onClick={() => onSelect(note)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {meetingTitle || t('notes.untitled')}
          </h3>
        </div>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <FaCalendarAlt className="mr-1" />
          <span>{meetingDate || t('notes.noDate')}</span>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {truncateContent(content)}
      </p>

      <div className="flex justify-between items-center text-xs">
        <span className="text-purple-600 dark:text-purple-400 font-medium">
          {getNoteTypeLabel()}
        </span>
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <FaClock className="mr-1" />
          <span>{t('notes.updated')} {formatDate(updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

const Notes = () => {
  const { t } = useTranslation();
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [meetingOptions, setMeetingOptions] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [isNewNote, setIsNewNote] = useState(false);

  // State for notes
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Load notes from localStorage on component mount
  useEffect(() => {
    // Directly fetch from API instead of localStorage
    fetchNotes();
  }, []);

  // Fetch notes from all available sources
  const fetchNotes = async () => {
    try {
      setLoading(true);
      console.log('Fetching all notes...');

      try {
        const resp = await api.get('/notes');
        if (resp && resp.notes && Array.isArray(resp.notes)) {
          console.log(`Found ${resp.notes.length} notes`);
          setNotes(resp.notes);
        } else {
          setNotes([]);
        }
      } catch (err) {
        console.error('Failed to fetch notes:', err);
        setError(err.message || 'Failed to fetch notes');
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
  useEffect(() => {
  }, []);

  // Search notes
  const searchNotes = (searchTerm) => {
    if (!searchTerm) return notes;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return notes.filter(note =>
      (note.content && note.content.toLowerCase().includes(lowerSearchTerm)) ||
      (note.meetingTitle && note.meetingTitle.toLowerCase().includes(lowerSearchTerm))
    );
  };

  // Handle note selection
  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setEditContent(note.content);
    setEditTitle(note.meetingTitle);
    setEditDate(note.meetingDate);
    setSelectedMeetingId(note.meetingId);
    setEditMode(false);
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Get filtered notes based on search term
  const filteredNotes = searchNotes(searchTerm);

  // Handle edit mode toggle
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  // Handle save note
  const handleSaveNote = async () => {
    if (!selectedNote) return;

    // Don't process if we're in new note mode - use handleSaveNewNote instead
    if (isNewNote) return;

    try {
      const updatedData = {
        content: editContent,
        meetingTitle: editTitle,
        meetingDate: editDate,
        meetingId: selectedMeetingId || null
      };

      // Optimistically update the UI first
      const updatedNote = {
        ...selectedNote,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      // Update the note in the local state
      const updatedNotes = notes.map(note =>
        note.id === selectedNote.id ? updatedNote : note
      );

      setNotes(updatedNotes);
      setSelectedNote(updatedNote);
      setEditMode(false);

      // Call API to update server
      const response = await api.put(`/notes/${selectedNote.id}`, updatedData);
      console.log('Update response:', response);

      // If response has different data than what we expected, update again
      if (response && response.id === selectedNote.id) {
        const serverUpdatedNote = {
          ...response,
          updatedAt: new Date().toISOString()
        };

        const notesWithServerUpdate = notes.map(note =>
          note.id === selectedNote.id ? serverUpdatedNote : note
        );

        setNotes(notesWithServerUpdate);
        setSelectedNote(serverUpdatedNote);

      }
    } catch (error) {
      console.error('Failed to update note:', error);
      // The optimistic update still remains in UI
    }
  };

  // Handle delete note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    // Show confirmation dialog
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      // Optimistically remove from UI
      const updatedNotes = notes.filter(note => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      setSelectedNote(null);


      // Call API to delete
      await api.del(`/notes/${selectedNote.id}`);
      console.log(`Note ${selectedNote.id} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete note:', error);

      // Restore the note in case of error
      fetchNotes(); // Refetch all notes to restore correct state
    }
  };

  // Handle create new note (modified to not make API call immediately)
  const handleCreateNote = () => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Set up a new note form without creating in database yet
    const tempNote = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      meetingId: null,
      meetingTitle: "New Note",
      meetingDate: today,
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemp: true
    };

    // Select the new note
    setSelectedNote(tempNote);
    setEditContent(tempNote.content);
    setEditTitle(tempNote.meetingTitle);
    setEditDate(tempNote.meetingDate);
    setSelectedMeetingId(tempNote.meetingId);
    setEditMode(true);
    setIsNewNote(true); // Flag that we're creating a new note
  };

  // Handle cancel creation
  const handleCancelCreate = () => {
    setSelectedNote(null);
    setEditMode(false);
    setIsNewNote(false);
  };

  // Handle save new note - only called when creating a new note
  const handleSaveNewNote = async () => {
    try {
      // Validate fields
      if (!editContent.trim()) {
        alert("Note content cannot be empty");
        return;
      }

      const newNoteData = {
        meetingId: selectedMeetingId || null,
        meetingTitle: editTitle,
        meetingDate: editDate,
        content: editContent
      };

      // Call API to create note
      const response = await api.post('/notes', newNoteData);
      console.log('Create response:', response);

      if (response && response.id) {
        // Format the note for the frontend
        const createdNote = {
          id: response.id,
          content: editContent,
          meetingId: selectedMeetingId || null,
          meetingTitle: editTitle,
          meetingDate: editDate,
          createdAt: response.createdAt || new Date().toISOString(),
          updatedAt: response.updatedAt || new Date().toISOString(),
          createdBy: response.createdBy || { id: '1', name: 'Current User' }
        };

        // Add to notes collection and exit edit mode
        const updatedNotes = [createdNote, ...notes];
        setNotes(updatedNotes);
        setSelectedNote(createdNote);
        setEditMode(false);
        setIsNewNote(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to={ROUTES.DASHBOARD} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4">
            <FaChevronLeft />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notes.title')}</h1>
        </div>
        {/* Only show New Note button when NOT in edit mode */}
        {!editMode && (
          <button
            onClick={handleCreateNote}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            <span>{t('notes.newNote')}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {debugInfo && debugInfo.debug && (
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded mb-4 text-xs overflow-auto max-h-40">
          <p className="font-bold">Debug Info:</p>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        {/* Notes list sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search for a note"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredNotes.length > 0 ? (
              filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onSelect={handleSelectNote}
                  isSelected={selectedNote && selectedNote.id === note.id}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No Notes Found
              </div>
            )}
          </div>
        </div>

        {/* Note detail view */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-full flex flex-col">
              {editMode ? (
                <div className="flex flex-col h-full">
                  <div className="mb-4 space-y-3">
                    <div>
                      <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Note Title
                      </label>
                      <input
                        id="note-title"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder={t('notes.titlePlaceholder')}
                      />
                    </div>
                    <div>
                      <label htmlFor="note-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Note Date
                      </label>
                      <input
                        id="note-date"
                        type="text"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder={t('notes.datePlaceholder')}
                      />
                    </div>
                    <div>
                      <label htmlFor="meeting-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Associated Meeting
                      </label>
                      <select
                        id="meeting-select"
                        value={selectedMeetingId}
                        onChange={(e) => setSelectedMeetingId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Personal Note (No Meeting)</option>
                        {meetingOptions.map(meeting => (
                          <option key={meeting.id} value={meeting.id}>
                            {meeting.title}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Linking a note to a meeting makes it easier to find later
                      </p>
                    </div>
                  </div>

                  <div className="flex-grow mb-4">
                    <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Note Content
                    </label>
                    <textarea
                      id="note-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-64"
                      style={{ minHeight: "200px" }}
                      placeholder="Start typing your note here..."
                    />
                  </div>

                  {/* Always show the action buttons at the bottom when in edit mode */}
                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={isNewNote ? handleCancelCreate : () => setEditMode(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {isNewNote ? "Cancel" : t('common.cancel')}
                      </button>
                      <button
                        onClick={isNewNote ? handleSaveNewNote : handleSaveNote}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        {isNewNote ? "Create Note" : t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center mb-2">
                        {selectedNote.meetingId ? (
                          <Link
                            to={`/meetings/${selectedNote.meetingId}`}
                            className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 hover:underline mr-2"
                          >
                            <FaVideo className="mr-1" />
                            View Meeting
                          </Link>
                        ) : (
                          <span className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 mr-2">
                            <FaFileAlt className="mr-1" />
                            Personal Note
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {selectedNote.meetingTitle || "Untitled Note"}
                      </h2>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FaCalendarAlt className="mr-1" />
                        <span>{selectedNote.meetingDate || "No date"}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={toggleEditMode}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                        title={t('common.edit')}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={handleDeleteNote}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                        title={t('common.delete')}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="prose dark:prose-invert max-w-none">
                      {(selectedNote.content || "No content").split('\n').map((line, i) => (
                        <p key={i} className="mb-4 text-gray-700 dark:text-gray-300">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{t('notes.noNoteSelected')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('notes.selectOrCreate')}</p>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {t('notes.createNote')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
