import React, { useState } from 'react';
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
import useNotes from '../hooks/useNotes';
import { AddToCalendarButton } from '../components/calendar';

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

const MeetingDetail = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const { id } = useParams();

  // Sample meeting data
  const meetingData = {
    id: id,
    date: 'Mon, April 29, 2024',
    title: 'Weekly dev sync',
    time: '3:00 PM - 4:00 PM (60m)',
    startTime: '2024-04-29T15:00:00',
    endTime: '2024-04-29T16:00:00',
    description: 'Weekly development team sync meeting to discuss progress and blockers.',
    attendees: [
      { email: 'john.doe@example.com', name: 'John Doe' },
      { email: 'alex.brown@example.com', name: 'Alex Brown' },
      { email: 'michael.johnson@example.com', name: 'Michael Johnson' }
    ]
  };

  const { date, title, time } = meetingData;

  // Sample analytics data
  const speakerStats = [
    {
      name: 'John Doe',
      role: 'Team Leader',
      wpm: 182,
      talkTime: '28m',
      talkPercentage: 47,
      participationScore: 53
    },
    {
      name: 'Alex Brown',
      role: 'QA Engineer',
      wpm: 194,
      talkTime: '15m',
      talkPercentage: 25,
      participationScore: 75
    },
    {
      name: 'Michael Johnson',
      role: 'Frontend Developer',
      wpm: 172,
      talkTime: '6m',
      talkPercentage: 10,
      participationScore: 90
    }
  ];

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
              <AddToCalendarButton 
                item={meetingData} 
                type="meeting" 
              />
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
                The team discussed project progress, highlighting near-completion of backend and frontend development. 
                They addressed challenges in integrating a third-party API. Action items include finalizing authentication, 
                UI designs, and testing. Next step: mid-week progress check-in.
              </p>
            </CollapsibleSection>
            
            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Key points">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Project progress</h4>
                  <ul className="space-y-2">
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
                      <span className="text-gray-700 dark:text-gray-300">Positive feedback received on UI designs by Sarah Lee.</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Challenges faced</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Difficulty integrating a third-party API for geolocation services.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Discussion on potential solutions and collaborative efforts to overcome this obstacle.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Action items">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">J</div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Jane</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Backend development tasks (authentication)</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">M</div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Michael</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Frontend implementation tasks</div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}
        
        {activeTab === 'transcript' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-700 dark:text-gray-300">Transcript content will be displayed here...</p>
          </div>
        )}
        
        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <MeetingNotes meetingId={id} meetingTitle={title} meetingDate={date} />
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Participation Analysis</h3>
                <div className="space-y-6">
                  {speakerStats.map((speaker, index) => (
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
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{speaker.wpm} WPM</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{speaker.talkTime}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${speaker.talkPercentage}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{speaker.talkPercentage}%</span>
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

// Meeting Notes component
const MeetingNotes = ({ meetingId, meetingTitle, meetingDate }) => {
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  
  // Use the custom hook to manage notes for this meeting
  const { 
    notes, 
    loading, 
    error, 
    createNote, 
    updateNote, 
    deleteNote 
  } = useNotes(meetingId);
  
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
  if (notes.length === 0 && !loading) {
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
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default MeetingDetail;