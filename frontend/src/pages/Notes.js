import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaChevronLeft, 
  FaSearch, 
  FaCalendarAlt, 
  FaClock, 
  FaEdit, 
  FaTrash,
  FaPlus
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import ROUTES from '../constants/routes';
import useNotes from '../hooks/useNotes';

// Note card component
const NoteCard = ({ note, onSelect, isSelected }) => {
  const { t } = useTranslation();
  const { meetingTitle, meetingDate, content, updatedAt } = note;
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // Truncate content for preview
  const truncateContent = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
        <h3 className="font-medium text-gray-900 dark:text-white">{meetingTitle}</h3>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <FaCalendarAlt className="mr-1" />
          <span>{meetingDate}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {truncateContent(content)}
      </p>
      
      <div className="flex justify-end items-center text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
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
  
  // Use the custom hook to manage notes
  const { 
    notes, 
    loading, 
    error, 
    createNote, 
    updateNote, 
    deleteNote, 
    searchNotes 
  } = useNotes();
  
  // Handle note selection
  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setEditContent(note.content);
    setEditTitle(note.meetingTitle);
    setEditDate(note.meetingDate);
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
    
    try {
      const updatedData = { 
        content: editContent,
        meetingTitle: editTitle,
        meetingDate: editDate
      };
      
      const updatedNote = await updateNote(selectedNote.id, updatedData);
      
      setSelectedNote(updatedNote);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };
  
  // Handle delete note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    try {
      await deleteNote(selectedNote.id);
      setSelectedNote(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };
  
  // Handle create new note
  const handleCreateNote = async () => {
    try {
      const newNoteData = {
        meetingId: null, // This is a standalone note, not associated with a meeting
        meetingTitle: t('notes.newNote'),
        meetingDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        content: t('notes.contentPlaceholder'),
        createdBy: {
          id: '1', // In a real app, this would be the current user's ID
          name: 'Current User' // In a real app, this would be the current user's name
        }
      };
      
      const newNote = await createNote(newNoteData);
      
      setSelectedNote(newNote);
      setEditContent(newNote.content);
      setEditTitle(newNote.meetingTitle);
      setEditDate(newNote.meetingDate);
      setEditMode(true);
    } catch (error) {
      console.error('Failed to create note:', error);
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
        <button 
          onClick={handleCreateNote}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          <span>{t('notes.newNote')}</span>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        {/* Notes list sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={t('notes.searchPlaceholder')}
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
                {t('notes.noNotesFound')}
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
                        {t('notes.noteTitle')}
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
                        {t('notes.noteDate')}
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
                  </div>
                  
                  <div className="flex-1 mb-4 flex flex-col">
                    <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('notes.noteContent')}
                    </label>
                    <div className="flex-1 relative">
                      <textarea
                        id="note-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-full absolute inset-0 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        style={{ minHeight: '300px', height: 'calc(100% - 20px)' }}
                        placeholder={t('notes.contentPlaceholder')}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      onClick={handleSaveNote}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {selectedNote.meetingTitle}
                      </h2>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FaCalendarAlt className="mr-1" />
                        <span>{selectedNote.meetingDate}</span>
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
                      {selectedNote.content.split('\n').map((line, i) => (
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-full flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{t('notes.noNoteSelected')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{t('notes.selectOrCreate')}</p>
                <button 
                  onClick={handleCreateNote}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  {t('notes.createNewNote')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes; 