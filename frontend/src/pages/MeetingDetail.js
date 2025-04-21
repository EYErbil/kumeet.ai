import React, { useState, useEffect, useRef } from 'react';
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
  FaCalendarAlt,
  FaUpload
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
const MeetingNotes = ({ notes, meetingId, meetingTitle, meetingDate }) => {
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);

  // Mock function for updating notes (in a real app, this would call the API)
  const updateNote = async (noteId, updatedData) => {
    // Find the note in our local state
    const noteToUpdate = notes.find(note => note.id === noteId);
    if (!noteToUpdate) return null;

    // Return updated note (mock response)
    return {
      ...noteToUpdate,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
  };

  // Mock function for creating notes
  const createNote = async (noteData) => {
    // Create a new note ID
    const noteId = Date.now().toString();

    // Return the new note (mock response)
    return {
      id: noteId,
      content: noteData.content,
      createdBy: noteData.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meetingId: noteData.meetingId,
      meetingTitle: noteData.meetingTitle,
      meetingDate: noteData.meetingDate
    };
  };

  // Mock function for deleting notes
  const deleteNote = async (noteId) => {
    return true; // Success
  };

  // Handle create new note
  const handleCreateNote = async () => {
    try {
      const newNoteData = {
        meetingId,
        meetingTitle,
        meetingDate,
        content: 'Start typing your meeting notes here...',
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

  // If no notes exist yet, show a message and create button
  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No notes for this meeting</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Create a note to keep track of important points</p>
        <button
          onClick={handleCreateNote}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Create Meeting Note
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Meeting Notes</h3>
        {!selectedNote && (
          <button
            onClick={handleCreateNote}
            className="flex items-center px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <FaPlus className="mr-1" size={12} />
            <span>New Note</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {/* Notes list */}
        <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto flex flex-col" style={{ maxHeight: '400px' }}>
          {notes.map(note => (
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
          ))}
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

                  <div className="flex-1 mb-4 flex flex-col">
                    <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Content
                    </label>
                    <div className="flex-1 relative">
                      <textarea
                        id="note-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-full absolute inset-0 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        style={{ minHeight: '300px', height: 'calc(100% - 20px)' }}
                        placeholder="Enter note content here..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNote}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Save
                    </button>
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
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Select a note from the list or create a new one
              </p>
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
  const [processingTranscript, setProcessingTranscript] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [statusPollingCount, setStatusPollingCount] = useState(0);
  const pollingTimeoutRef = useRef(null);
  const [generatingOverview, setGeneratingOverview] = useState(false);

  // Fetch meeting data
  useEffect(() => {
    fetchMeeting();
    
    // Cleanup function
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [id]);

  // Check pipeline status if needed, but only once per meeting ID
  useEffect(() => {
    if (meeting && (!meeting.transcript_path || !meeting.summary_path) && statusPollingCount === 0) {
      // Only start checking pipeline status if we haven't started checking already
      checkPipelineStatus();
    }
    
    // Cleanup function
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [meeting, id]);

  const tryAlternativeRoutes = async () => {
    console.log('Trying alternative API routes for meeting:', id);
    try {
      // Option 1: Try different API endpoint format
      const alternativeEndpoint = `/api/meetings/get/${id}`;
      console.log('Trying alternative endpoint:', alternativeEndpoint);
      const response = await fetch(alternativeEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully retrieved meeting data from alternative endpoint:', data);
        setMeeting(data);
        setLoading(false);
        return true;
      }
    } catch (altError) {
      console.error('Alternative endpoint failed:', altError);
    }

    try {
      // Option 2: Try raw data endpoint
      const rawDataEndpoint = `/api/meetings/${id}/raw`;
      console.log('Trying raw data endpoint:', rawDataEndpoint);
      const response = await fetch(rawDataEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully retrieved raw meeting data:', data);
        // Transform raw data into expected format if needed
        const transformedData = {
          ...data,
          transcript_segments: data.transcript_segments || [],
          key_points: data.key_points || [],
          summaries: data.summaries || {}
        };
        setMeeting(transformedData);
        setLoading(false);
        return true;
      }
    } catch (rawError) {
      console.error('Raw data endpoint failed:', rawError);
    }

    return false;
  }

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      console.log(`Attempting to fetch meeting with ID: ${id}`);
      
      const data = await api.get(`/meetings/${id}`);
      console.log('Meeting data received successfully:', data);
      setMeeting(data);
      
      // Force stop loading if we have any useful data, even if transcript or summary path is missing
      const hasUsefulData = (data.transcript_segments && data.transcript_segments.length > 0) || 
                            (data.key_points && data.key_points.length > 0) ||
                            (data.summaries && data.summaries.general);
      
      // Set processing flag based on whether the meeting is fully processed
      const isBeingProcessed = !data.transcript_path || !data.summary_path;
      setIsProcessing(isBeingProcessed && !hasUsefulData);
      
      // Clear generating flag - it should only be set during actual generation
      setGeneratingOverview(false);
      
      // If we have transcript but no overview, and there's no pending generation,
      // we'll show the button rather than automatically generating
      if (data.transcript_segments && data.transcript_segments.length > 0 && 
          (!data.summaries || !data.summaries.general)) {
        console.log('Transcript available but no overview - showing generation button');
      }
      
      // If the meeting is fully processed or we have useful data, stop loading
      if (!isBeingProcessed || hasUsefulData) {
        console.log('Stopping loading - meeting data is usable');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching meeting details:', err);
      
      // Handle 422 Unprocessable Entity error specifically
      if (err.message && err.message.includes('422')) {
        console.error('422 Unprocessable Entity error detected - Database issue with meeting:', id);
        
        // Try alternative routes before giving up
        const alternativeSuccess = await tryAlternativeRoutes();
        
        if (!alternativeSuccess) {
          setError(`Unable to load meeting ID: ${id}. The meeting data structure may be corrupted in the database. (Error 422: Unprocessable Entity)`);
          setLoading(false);
        }
      } else {
        setError(`Failed to fetch meeting details: ${err.message || 'Unknown error'}`);
        setLoading(false);
      }
    }
  };

  const checkPipelineStatus = async () => {
    try {
      // Maximum number of polls (2 minutes at 10s intervals = 12 polls)
      const MAX_POLLS = 12;
      
      // Increment polling count first to prevent excessive logging
      setStatusPollingCount(prev => prev + 1);
      
      // If we've been polling for a while (> 3 polls), check if we already have useful data
      if (statusPollingCount > 3) {
        try {
          // Refresh meeting data to see if we have something to show
          const data = await api.get(`/meetings/${id}`);
          
          // Check if we have key points, segments, or summaries
          const hasUsefulData = (data.transcript_segments && data.transcript_segments.length > 0) || 
                                (data.key_points && data.key_points.length > 0) ||
                                (data.summaries && data.summaries.general);
                                
          if (hasUsefulData) {
            console.log('Found useful meeting data - ending pipeline status check');
            
            setMeeting(data);
            // Don't auto-trigger overview generation - let user click the button instead
            
            setIsProcessing(false);
            setGeneratingOverview(false);
            setLoading(false);
            return;
          }
        } catch (fetchError) {
          console.error('Error checking for meeting data:', fetchError);
          // Continue with regular polling if this check fails
        }
      }
      
      // If we've been polling too long, stop and show the page anyway
      // This ensures we don't hang indefinitely and provides a timeout mechanism
      // Meeting data processing may continue in the background even after we stop polling
      if (statusPollingCount >= MAX_POLLS) {
        console.log('Maximum polling attempts reached - ending pipeline status check');
        setIsProcessing(false);
        setGeneratingOverview(false);
        setLoading(false);
        return;
      }
      
      let statusData;
      try {
        statusData = await api.get(`/meetings/${id}/pipeline-status`);
        setPipelineStatus(statusData);
        console.log('Pipeline status:', statusData);
      } catch (statusError) {
        console.error('Error getting pipeline status:', statusError);
        // If we can't get status, try in next poll
        pollingTimeoutRef.current = setTimeout(checkPipelineStatus, 10000);
        return;
      }
      
      if (statusData.status === 'completed') {
        // Refresh meeting data to ensure we have the latest transcript/summary
        try {
          const data = await api.get(`/meetings/${id}`);
          setMeeting(data);
          
          // Don't auto-generate overview - let user manually trigger it
          setGeneratingOverview(false);
        } catch (fetchError) {
          console.error('Error fetching completed meeting data:', fetchError);
        }
        
        setIsProcessing(false);
        setLoading(false);
        return;
      }
      
      // For any other status, set appropriate message based on polling count
      setIsProcessing(true);
      if (statusPollingCount < 3) {
        setProcessingMessage('Converting video to audio...');
      } else if (statusPollingCount < 6) {
        setProcessingMessage('Transcribing audio...');
      } else {
        setProcessingMessage('Analyzing transcript and creating summary...');
      }
      
      // Continue polling after delay, store the timeout ID for cleanup
      pollingTimeoutRef.current = setTimeout(checkPipelineStatus, 10000);
    } catch (error) {
      console.error('Error checking pipeline status:', error);
      
      // After a few attempts, stop polling and show the page anyway
      if (statusPollingCount > 3) {
        setIsProcessing(false);
        setGeneratingOverview(false);
        setLoading(false);
      } else {
        pollingTimeoutRef.current = setTimeout(checkPipelineStatus, 10000);
      }
    }
  };

  const handleTranscriptUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a JSON file
    if (!file.name.endsWith('.json')) {
      setUploadError('Please upload a JSON file');
      return;
    }

    try {
      setProcessingTranscript(true);
      setUploadError(null);
      setUploadSuccess(false);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('summary_type', 'general');
      formData.append('min_importance', '6');
      formData.append('update_summary', 'true');
      // Request to generate overview automatically by the server
      formData.append('generate_overview', 'true');

      // Upload the transcript
      const response = await api.postForm(`/meetings/${id}/upload-transcript`, formData);

      if (response && (response.segments_count > 0 || response.success)) {
        setUploadSuccess(true);
        
        // If overview wasn't already generated by the server, generate it now
        // This is a fallback in case the server-side generation didn't work
        setGeneratingOverview(true);
        
        // Refresh meeting data to show updated transcript and summaries
        const updatedMeeting = await api.get(`/meetings/${id}`);
        setMeeting(updatedMeeting);
        
        // If no overview was generated by the server, trigger the client-side generation
        if (!updatedMeeting.summaries?.general && updatedMeeting.transcript_segments?.length > 0) {
          try {
            await generateOverviewFromTranscript(updatedMeeting);
          } catch (overviewError) {
            console.error('Failed to generate overview after transcript upload:', overviewError);
          }
        }
        
        setGeneratingOverview(false);
        
        // Switch to the summary tab to show results
        setActiveTab('summary');
      } else {
        setUploadError('No transcript segments were processed');
      }
    } catch (err) {
      setUploadError(`Failed to process transcript: ${err.message}`);
      
      // Try a fallback approach if the upload failed
      try {
        const localData = await api.get(`/meetings/${id}`);
        if (localData && localData.transcript_segments && localData.transcript_segments.length > 0) {
          // We have transcript data, try generating the overview automatically
          setMeeting(localData);
          setGeneratingOverview(true);
          await generateOverviewFromTranscript(localData);
          setGeneratingOverview(false);
        }
      } catch (fetchErr) {
        console.error('Fallback fetch after upload error also failed:', fetchErr);
      }
    } finally {
      setProcessingTranscript(false);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Generate overview using LLM
  const generateOverviewFromTranscript = async (meeting) => {
    if (!meeting || !meeting.transcript_segments || meeting.transcript_segments.length === 0) {
      alert("No transcript available to generate overview.");
      return;
    }

    try {
      setGeneratingOverview(true);
      console.log("Starting overview generation...");
      
      // Combine transcript segments into a single text for processing
      const transcriptText = meeting.transcript_segments
        .map(segment => `${segment.speaker}: ${segment.text}`)
        .join('\n');
      
      // Prepare request data
      const requestData = {
        transcript: transcriptText,
        meetingId: id,
        meetingTitle: meeting.title || "Meeting"
      };
      
      let overview = null;
      
      try {
        // Call API endpoint to generate overview
        console.log("Calling API for overview generation...");
        const response = await api.post('/meetings/generate-overview', requestData);
        console.log("API response:", response);
        
        if (response && response.overview) {
          overview = response.overview;
          console.log("Successfully generated overview from API");
        }
      } catch (apiError) {
        console.warn('API endpoint for generating overview failed, falling back to client-side generation:', apiError);
        
        // Client-side fallback - create a simplified summary based on available data
        console.log("Generating fallback overview...");
        const topSegments = meeting.transcript_segments.slice(0, 5); // Take first 5 segments
        const speakerNames = [...new Set(meeting.transcript_segments.map(seg => seg.speaker))];
        
        let fallbackOverview = `Meeting with ${speakerNames.join(', ')}. `;
        fallbackOverview += `This meeting covered the following topics: `;
        
        if (meeting.key_points && meeting.key_points.length > 0) {
          // Use existing key points if available
          fallbackOverview += meeting.key_points
            .slice(0, 3)
            .map(point => typeof point === 'string' ? point : point.text || '')
            .map(text => text.replace(/\[\d+\.\d+-\d+\.\d+\]/g, '').replace(/\[score=\d+\]/g, '').trim())
            .join('; ');
        } else {
          // Otherwise use the first few transcript segments
          fallbackOverview += topSegments
            .map(seg => seg.text.substring(0, 100) + (seg.text.length > 100 ? '...' : ''))
            .join(' ');
        }
        
        overview = fallbackOverview;
        console.log("Generated fallback overview:", overview);
      }
      
      if (overview) {
        // Update the meeting with the new overview
        console.log("Updating meeting with new overview");
        const updatedMeeting = {
          ...meeting,
          summaries: {
            ...meeting.summaries || {},
            general: overview
          }
        };
        setMeeting(updatedMeeting);
        
        // Try to save the overview to the server
        try {
          await api.put(`/meetings/${id}`, {
            summaries: updatedMeeting.summaries
          });
          console.log("Successfully saved overview to server");
        } catch (saveError) {
          console.warn("Failed to save overview to server:", saveError);
          // Continue anyway since we've updated the local state
        }
      } else {
        throw new Error('No overview generated');
      }
    } catch (err) {
      console.error('Failed to generate overview:', err);
      alert('Failed to generate overview. Please try again later.');
    } finally {
      setGeneratingOverview(false);
      console.log("Overview generation process completed");
    }
  };

  // Loading indicator
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        {isProcessing && (
          <div className="text-center max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Processing your meeting</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{processingMessage}</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-in-out" 
                style={{ width: `${Math.min(95, statusPollingCount * 8)}%` }} 
              />
            </div>
            
            {statusPollingCount > 2 && (
              <button
                onClick={() => {
                  setLoading(false);
                  setIsProcessing(false);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors"
              >
                View Anyway
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium text-lg">Error loading meeting data</p>
          <p className="mt-2">{error}</p>
          
          {error.includes('422') && (
            <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded text-gray-800">
              <p className="font-medium">Database Issue Detected</p>
              <p className="mt-2">
                This error typically occurs when the meeting data is not properly saved or is corrupted in the database.
                The server cannot process the meeting data (Error 422: Unprocessable Entity).
              </p>
              <p className="mt-2">
                Possible solutions:
              </p>
              <ul className="list-disc ml-5 mt-2">
                <li>Return to the dashboard and create a new meeting</li>
                <li>Check if your backend API and database are running correctly</li>
                <li>Try clearing your browser cache and reloading the page</li>
                <li>Verify that the meeting ID in the URL is correct</li>
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Link
            to={ROUTES.MEETINGS.ROOT}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <FaChevronLeft className="mr-2" size={14} />
            Back to Meetings
          </Link>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Try Again
          </button>
          
          <button
            onClick={() => {
              // Attempt to manually force a reconnection to the database
              window.location.href = `/api/system/reconnect-db?redirect=${encodeURIComponent(window.location.pathname)}`;
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Reconnect Database
          </button>
          
          <button
            onClick={() => {
              // Try fetching with different API path
              window.location.href = `/api/meetings/${id}/download`;
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download Raw Data
          </button>
        </div>
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

  // Replace the Overview section with this:
  const renderOverviewSection = () => {
    if (generatingOverview) {
      return (
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Generating meeting overview...</p>
        </div>
      );
    }

    if (meeting?.summaries?.general) {
      return (
        <div>
          <p className="whitespace-pre-line">{meeting.summaries.general}</p>
        </div>
      );
    }

    // No overview available
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <p className="text-gray-600">
          {meeting?.transcript_segments && meeting.transcript_segments.length > 0 
            ? "Processing your transcript to generate an overview..." 
            : "Upload a transcript or recording to automatically generate a meeting overview."}
        </p>
      </div>
    );
  };

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
            {renderOverviewSection()}

            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Key points">
              <div className="space-y-6">
                {/* Display all key points in a single list */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Points</h4>
                  <ul className="space-y-2">
                    {meeting.key_points && meeting.key_points.length > 0 ? (
                      meeting.key_points.map((point, index) => {
                        // Clean up any time ranges and scores from the point text
                        let pointText = typeof point === 'string' ? point : (point.text || '');
                        // Remove time ranges like [23.10-60.89]
                        pointText = pointText.replace(/\[\d+\.\d+-\d+\.\d+\]/g, '');
                        // Remove score indicators like [score=8]
                        pointText = pointText.replace(/\[score=\d+\]/g, '');
                        // Trim any extra whitespace
                        pointText = pointText.trim();
                        
                        return (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                            <span className="text-gray-700 dark:text-gray-300">{pointText}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="flex items-start">
                        <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                        <span className="text-gray-700 dark:text-gray-300">No key points available for this meeting.</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Add any summary content if available in wrong location */}
                {meeting.summaries && meeting.decisions && meeting.decisions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Additional Points</h4>
                    <ul className="space-y-2">
                      {meeting.decisions.map((decision, index) => {
                        // Clean up any time ranges and scores from the decision text
                        let decisionText = typeof decision === 'string' ? decision : (decision.text || '');
                        // Remove time ranges like [23.10-60.89]
                        decisionText = decisionText.replace(/\[\d+\.\d+-\d+\.\d+\]/g, '');
                        // Remove score indicators like [score=8]
                        decisionText = decisionText.replace(/\[score=\d+\]/g, '');
                        // Trim any extra whitespace
                        decisionText = decisionText.trim();
                        
                        return (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                            <span className="text-gray-700 dark:text-gray-300">{decisionText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Action items">
              <div className="space-y-4">
                {meeting.action_items && meeting.action_items.length > 0 ? (
                  meeting.action_items.map((item, index) => {
                    // Clean up action item text by removing time ranges and score indicators
                    let actionText = item.text || '';
                    // Remove time ranges like [23.10-60.89]
                    actionText = actionText.replace(/\[\d+\.\d+-\d+\.\d+\]/g, '');
                    // Remove score indicators like [score=8]
                    actionText = actionText.replace(/\[score=\d+\]/g, '');
                    // Trim any extra whitespace that might be left
                    actionText = actionText.trim();
                    
                    return (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                          {item.assignee.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{item.assignee}</div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">{actionText}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400">No action items assigned in this meeting.</div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transcript</h3>
              
              <div className="flex items-center">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".json" 
                  onChange={handleTranscriptUpload} 
                  className="hidden" 
                />
                <button
                  onClick={triggerFileUpload}
                  disabled={processingTranscript}
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    processingTranscript 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {processingTranscript ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaUpload className="mr-2" size={14} />
                      Update Transcript
                    </>
                  )}
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{uploadError}</p>
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p>Transcript successfully processed! Meeting details have been updated.</p>
              </div>
            )}

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
              <div className="text-center py-8">
                <FaFileAlt className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No transcript available for this meeting.</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">Upload a transcript JSON file to analyze and summarize your meeting.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <MeetingNotes
              notes={meeting.notes || []}
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
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{speaker.wpm || '175'} WPM</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{speaker.talkTime || '10m'}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${speaker.talkPercentage || 50}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{speaker.talkPercentage || 50}%</span>
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