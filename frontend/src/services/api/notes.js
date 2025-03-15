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
    // In a real app, we would fetch from API
    // return await baseApi.get('/notes', { params });
    
    // For mock data
    return mockGetNotes(params);
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
    // In a real app:
    // return await baseApi.get(`/notes/meeting/${meetingId}`);
    
    // For mock data
    return mockGetNotesByMeetingId(meetingId);
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
    // In a real app:
    // return await baseApi.get(`/notes/${id}`);
    
    // For mock data
    return mockGetNoteById(id);
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
    // In a real app:
    // return await baseApi.post('/notes', data);
    
    // For mock
    return mockCreateNote(data);
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
    // In a real app:
    // return await baseApi.put(`/notes/${id}`, data);
    
    // For mock
    return mockUpdateNote(id, data);
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
    // In a real app:
    // return await baseApi.delete(`/notes/${id}`);
    
    // For mock
    return mockDeleteNote(id);
  } catch (error) {
    console.error(`Failed to delete note ${id}:`, error);
    throw error;
  }
};

// Mock data and functions
const MOCK_NOTES = [
  {
    id: '1',
    meetingId: '1',
    meetingTitle: 'Product Roadmap Planning',
    meetingDate: 'May 15, 2024',
    content: 'We discussed the Q3 roadmap priorities. Key features to focus on include:\n\n1. User authentication improvements\n2. Dashboard redesign\n3. API performance optimization\n\nTeam agreed to prioritize auth improvements first due to security concerns.',
    createdAt: '2024-05-15T14:30:00Z',
    updatedAt: '2024-05-15T16:45:00Z',
    createdBy: {
      id: '1',
      name: 'John Doe'
    }
  },
  {
    id: '2',
    meetingId: '2',
    meetingTitle: 'Weekly Dev Sync',
    meetingDate: 'May 10, 2024',
    content: 'Sprint progress update:\n- Frontend team completed 85% of planned tasks\n- Backend team facing challenges with database optimization\n- QA identified 3 critical bugs that need immediate attention\n\nAction items assigned to respective team members.',
    createdAt: '2024-05-10T11:15:00Z',
    updatedAt: '2024-05-10T11:45:00Z',
    createdBy: {
      id: '2',
      name: 'Jane Smith'
    }
  },
  {
    id: '3',
    meetingId: '3',
    meetingTitle: 'UX Design Review',
    meetingDate: 'May 8, 2024',
    content: 'Reviewed the new onboarding flow designs. Feedback points:\n\n- Simplify the first-time user experience\n- Add more visual cues for interactive elements\n- Consider accessibility improvements for color contrast\n\nDesign team will iterate and present updated mockups next week.',
    createdAt: '2024-05-08T09:30:00Z',
    updatedAt: '2024-05-08T10:15:00Z',
    createdBy: {
      id: '3',
      name: 'Alex Brown'
    }
  }
];

const mockGetNotes = (params = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filteredNotes = [...MOCK_NOTES];
      
      // Apply filters if provided
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        filteredNotes = filteredNotes.filter(note => 
          note.meetingTitle.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort by date if requested
      if (params.sortBy === 'date') {
        filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      
      resolve({
        data: filteredNotes
      });
    }, 800);
  });
};

const mockGetNotesByMeetingId = (meetingId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filteredNotes = MOCK_NOTES.filter(note => note.meetingId === meetingId);
      resolve({
        data: filteredNotes
      });
    }, 800);
  });
};

const mockGetNoteById = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const note = MOCK_NOTES.find(note => note.id === id);
      if (note) {
        resolve({
          data: note
        });
      } else {
        reject(new Error('Note not found'));
      }
    }, 800);
  });
};

const mockCreateNote = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newNote = {
        id: `${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      resolve({
        data: newNote
      });
    }, 800);
  });
};

const mockUpdateNote = (id, data) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const noteIndex = MOCK_NOTES.findIndex(note => note.id === id);
      if (noteIndex !== -1) {
        const updatedNote = {
          ...MOCK_NOTES[noteIndex],
          ...data,
          updatedAt: new Date().toISOString()
        };
        
        resolve({
          data: updatedNote
        });
      } else {
        reject(new Error('Note not found'));
      }
    }, 800);
  });
};

const mockDeleteNote = (id) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: { success: true, message: 'Note deleted successfully' }
      });
    }, 800);
  });
}; 