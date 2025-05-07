import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaChevronLeft,
  FaShareAlt,
  FaEllipsisH,
  FaChevronDown,
  FaFileAlt,
  FaList,
  FaStickyNote,
  FaChartBar,
  FaUser,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCalendarAlt
} from 'react-icons/fa';
import * as api from '../utils/api';
import ROUTES from '../constants/routes';

// Collapsible section component
const CollapsibleSection = ({ icon, title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md mb-4 bg-white dark:bg-gray-800">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon}
          <h3 className="font-medium text-gray-800 dark:text-white ml-2">{title}</h3>
        </div>
        <FaChevronDown
          className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </div>

      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

// Tab component
const Tab = ({ icon, label, active, onClick }) => {
  return (
    <button
      className={`px-4 py-3 flex items-center ${
        active 
          ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 font-medium' 
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
};

// Meeting Notes component
const MeetingNotes = ({ notes: initialNotes, meetingId, meetingTitle, meetingDate }) => {
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [notes, setNotes] = useState(initialNotes || []);
  const [loading, setLoading] = useState(true);
  const [isNewNote, setIsNewNote] = useState(false);

  // Fetch notes for this meeting on component mount
  useEffect(() => {
    const fetchMeetingNotes = async () => {
      try {
        setLoading(true);
        console.log(`Fetching notes for meeting ${meetingId}`);
        const response = await api.get(`/notes/meeting/${meetingId}`);
        
        if (response && response.notes && Array.isArray(response.notes)) {
          console.log(`Found ${response.notes.length} notes for meeting ${meetingId}`);
          setNotes(response.notes);
        } else {
          console.log('No notes found or invalid response format');
          setNotes([]);
        }
      } catch (error) {
        console.error(`Error fetching notes for meeting ${meetingId}:`, error);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeetingNotes();
  }, [meetingId]);

  // Handle update note
  const handleUpdateNote = async () => {
    if (!selectedNote) return;

    try {
      const updatedData = {
        content: editContent,
        meetingTitle: editTitle,
        meetingDate: editDate,
        meetingId: meetingId
      };

      // Call API to update the note
      const response = await api.put(`/notes/${selectedNote.id}`, updatedData);
      console.log('Update response:', response);

      if (response && response.id) {
        // Update the note in local state
        const updatedNotes = notes.map(note => 
          note.id === selectedNote.id ? {...response, updatedAt: new Date().toISOString()} : note
        );
        setNotes(updatedNotes);
        setSelectedNote({...response, updatedAt: new Date().toISOString()});
      }
      
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update note:', error);
      alert('Failed to update note: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle create new note
  const handleCreateNote = () => {
    // Set up a new draft note
    const tempNote = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      meetingId: meetingId,
      meetingTitle: meetingTitle || "Meeting Note",
      meetingDate: meetingDate || new Date().toLocaleDateString(),
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemp: true
    };

    // Set this as the selected note and enable edit mode
    setSelectedNote(tempNote);
    setEditContent(tempNote.content);
    setEditTitle(tempNote.meetingTitle);
    setEditDate(tempNote.meetingDate);
    setEditMode(true);
    setIsNewNote(true);
  };

  // Handle save new note
  const handleSaveNewNote = async () => {
    try {
      // Validate fields
      if (!editContent.trim()) {
        alert("Note content cannot be empty");
        return;
      }

      const newNoteData = {
        meetingId: meetingId,
        meetingTitle: editTitle,
        meetingDate: editDate,
        content: editContent
      };

      // Call API to create the note
      const response = await api.post('/notes', newNoteData);
      console.log('Create response:', response);

      if (response && response.id) {
        // Format the note for the frontend and add to state
        const createdNote = {
          id: response.id,
          content: editContent,
          meetingId: meetingId,
          meetingTitle: editTitle,
          meetingDate: editDate,
          createdAt: response.createdAt || new Date().toISOString(),
          updatedAt: response.updatedAt || new Date().toISOString(),
          createdBy: response.createdBy || { id: '1', name: 'Current User' }
        };

        // Add to notes collection and exit edit mode
        setNotes([createdNote, ...notes]);
        setSelectedNote(createdNote);
        setEditMode(false);
        setIsNewNote(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note: ' + (error.message || 'Unknown error'));
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
      // Call API to delete the note
      await api.del(`/notes/${selectedNote.id}`);
      console.log(`Note ${selectedNote.id} deleted successfully`);
      
      // Remove from local state
      const updatedNotes = notes.filter(note => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      setSelectedNote(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note: ' + (error.message || 'Unknown error'));
    }
  };

  // Cancel editing or creating a note
  const handleCancelCreate = () => {
    if (isNewNote) {
      setSelectedNote(null);
    }
    setEditMode(false);
    setIsNewNote(false);
  };

  // Format date for display
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

  // If loading, show a loading indicator
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Meeting Notes</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {/* Notes list */}
        <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-700 pr-4 flex flex-col" style={{ maxHeight: '400px' }}>
          <div className="overflow-y-auto flex-grow">
            {notes && notes.length > 0 ? (
              notes.map(note => (
                <div
                  key={note.id}
                  className={`p-3 mb-2 rounded-md cursor-pointer ${
                    selectedNote && selectedNote.id === note.id
                      ? 'bg-purple-50 dark:bg-gray-700 border-l-4 border-purple-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedNote(note);
                    setEditContent(note.content);
                    setEditTitle(note.meetingTitle);
                    setEditDate(note.meetingDate);
                    setEditMode(false);
                    setIsNewNote(false);
                  }}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {formatDate(note.updatedAt)}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {note.content.substring(0, 100)}
                    {note.content.length > 100 && '...'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No notes available
              </div>
            )}
          </div>
          
          {/* New Note button at bottom of left column */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCreateNote}
              className="w-full flex items-center justify-center px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <FaPlus className="mr-1" size={12} />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* Note detail */}
        <div className="md:col-span-2 pl-4 flex flex-col" style={{ maxHeight: '400px' }}>
          {selectedNote ? (
            <div className="h-full flex flex-col">
              {editMode ? (
                <div className="flex flex-col h-full">
                  <div className="mb-4 space-y-3">
                    <div>
                      <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                      </label>
                      <input
                        id="note-title"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter note title"
                      />
                    </div>
                    <div>
                      <label htmlFor="note-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date
                      </label>
                      <input
                        id="note-date"
                        type="text"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter date (e.g., May 15, 2024)"
                      />
                    </div>
                  </div>

                  <div className="flex-grow mb-4">
                    <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Content
                    </label>
                    <textarea
                      id="note-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-64"
                      style={{ minHeight: '200px' }}
                      placeholder="Enter note content here..."
                    />
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCancelCreate}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={isNewNote ? handleSaveNewNote : handleUpdateNote}
                        className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        {isNewNote ? "Create Note" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {selectedNote.meetingTitle}
                      </h2>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <FaCalendarAlt className="mr-1" />
                        <span>{selectedNote.meetingDate}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditMode(true)}
                        className="p-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button
                        onClick={handleDeleteNote}
                        className="p-1 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <FaTrash size={16} />
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
            <div className="flex flex-col items-center justify-center h-full">
              {notes && notes.length > 0 ? (
                // Show this when there are notes but none is selected
                <>
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Select a note</h3>
                  <p className="text-gray-600 dark:text-gray-400">Click on a note from the list to view its details</p>
                </>
              ) : (
                // Show this when there are no notes for the meeting
                <>
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No notes for this meeting</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Create a note to keep track of important points</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MeetingDetail = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetingNotes, setMeetingNotes] = useState([]);

  // Fetch meeting data
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/meetings/${id}`);
        setMeeting(data);
        
        // Try to fetch notes for this meeting
        try {
          const notesResponse = await api.get(`/notes/meeting/${id}`);
          if (notesResponse && notesResponse.notes) {
            setMeetingNotes(notesResponse.notes);
          }
        } catch (notesError) {
          console.error('Error fetching meeting notes:', notesError);
          // Continue even if notes fetching fails
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch meeting details');
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id]);
  
  // Function to refresh notes after adding new ones
  const refreshNotes = async () => {
    try {
      const notesResponse = await api.get(`/notes/meeting/${id}`);
      if (notesResponse && notesResponse.notes) {
        setMeetingNotes(notesResponse.notes);
      }
    } catch (notesError) {
      console.error('Error refreshing meeting notes:', notesError);
    }
  };

  // Loading indicator
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
        <Link
          to={ROUTES.MEETINGS.ROOT}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <FaChevronLeft className="mr-2" size={14} />
          Back to Meetings
        </Link>
      </div>
    );
  }

  // If no meeting data
  if (!meeting) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>Meeting not found</p>
        </div>
        <Link
          to={ROUTES.MEETINGS.ROOT}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <FaChevronLeft className="mr-2" size={14} />
          Back to Meetings
        </Link>
      </div>
    );
  }

  const { date, title, time } = meeting;

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center mb-4">
            <Link to="/meetings" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              <FaChevronLeft size={16} />
            </Link>
            <div className="ml-4 flex-1">
              <div className="text-sm text-gray-500 dark:text-gray-400 ml-[2px]">{date}</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{title}</div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <FaShareAlt size={16} />
              </button>
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <FaEllipsisH size={16} />
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 ml-[calc(16px+1rem+2px)]">{time}</div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <Tab
            icon={<FaFileAlt size={14} />}
            label="Summary"
            active={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
          />
          <Tab
            icon={<FaList size={14} />}
            label="Transcript"
            active={activeTab === 'transcript'}
            onClick={() => setActiveTab('transcript')}
          />
          <Tab
            icon={<FaStickyNote size={14} />}
            label="Notes"
            active={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
          />
          <Tab
            icon={<FaChartBar size={14} />}
            label="Analytics"
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <CollapsibleSection icon={<FaFileAlt size={16} className="text-gray-600 dark:text-gray-400" />} title="Overview">
              <p className="text-gray-700 dark:text-gray-300">
                {meeting.summaries?.general?.content ||
                  "The team discussed project progress, highlighting near-completion of backend and frontend development. " +
                  "Overall, the meeting was productive with clear action items and next steps defined."}
              </p>
            </CollapsibleSection>

            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Key points">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Summary</h4>
                  <ul className="space-y-2">
                    {meeting.summaries?.detailed ? (
                      // Parse and display the detailed summary content
                      meeting.summaries.detailed.content
                        .split('\n\n')
                        .filter(item => item.trim().match(/^\d+\./)) // Filter for numbered items
                        .map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                            <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          </li>
                        ))
                    ) : (
                      // Fallback content
                      <>
                        <li className="flex items-start">
                          <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                          <span className="text-gray-700 dark:text-gray-300">Backend development progressing well, with significant contributions from Jane Smith.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                          <span className="text-gray-700 dark:text-gray-300">Frontend dashboard redesign nearing completion, ready for testing.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                          <span className="text-gray-700 dark:text-gray-300">Positive feedback received on UI designs.</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Decisions made</h4>
                  <ul className="space-y-2">
                    {meeting.decisions && meeting.decisions.length > 0 ? (
                      meeting.decisions.map((decision, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                          <span className="text-gray-700 dark:text-gray-300">{decision}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start">
                        <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                        <span className="text-gray-700 dark:text-gray-300">No decisions recorded for this meeting.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Action items">
              <div className="space-y-4">
                {meeting.action_items && meeting.action_items.length > 0 ? (
                  meeting.action_items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full"></span>
                      <div className="flex-1">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {item.description || item.text}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-2">
                          {item.due_date || item.dueDate ? (
                            <span>Due: {item.due_date || item.dueDate}</span>
                          ) : null}
                          <span>Status: {item.status || (item.completed ? 'completed' : 'pending')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400">No action items found for this meeting.</div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {meeting.transcript_segments && meeting.transcript_segments.length > 0 ? (
              <div className="space-y-6">
                {meeting.transcript_segments.map((segment, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-2">
                        {segment.speaker.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{segment.speaker}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.floor(segment.start_time / 60)}:{String(Math.floor(segment.start_time % 60)).padStart(2, '0')} -
                          {Math.floor(segment.end_time / 60)}:{String(Math.floor(segment.end_time % 60)).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                    <div className="pl-10 text-gray-700 dark:text-gray-300">
                      {segment.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Transcript not available for this meeting.</p>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <MeetingNotes
              notes={meetingNotes}
              meetingId={id}
              meetingTitle={title}
              meetingDate={date}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Meeting Overview</h3>
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center">
                    <FaChartBar className="text-purple-600 mr-2" size={18} />
                    <div className="text-gray-900 dark:text-white">
                      <span className="font-medium">Total Meeting Duration: </span>
                      {meeting.duration_seconds ? (
                        <span className="text-gray-700 dark:text-gray-300">
                          {Math.floor(meeting.duration_seconds / 3600) > 0 
                            ? `${Math.floor(meeting.duration_seconds / 3600)}h ` 
                            : ''}
                          {Math.floor((meeting.duration_seconds % 3600) / 60) > 0 
                            ? `${Math.floor((meeting.duration_seconds % 3600) / 60)}m ` 
                            : ''}
                          {Math.floor(meeting.duration_seconds % 60)}s
                        </span>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">Not available</span>
                      )}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Participation Analysis</h3>
                <div className="space-y-6">
                  {meeting.participants && meeting.participants.map((speaker, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FaUser className="text-gray-600 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{speaker.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{speaker.role}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{speaker.talkPercentage || 0}%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{speaker.talkTime || '0m 0s'}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${speaker.talkPercentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingDetail;