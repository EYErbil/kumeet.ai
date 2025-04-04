import { useState, useEffect } from 'react';
import * as api from '../utils/api';

/**
 * Custom hook for fetching and managing action items with persistence
 * @param {string|null} meetingId - Optional ID of the meeting to filter action items
 * @returns {Object} Action items data and state
 */
const useActionItems = (meetingId = null) => {
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Generate a unique temporary ID for optimistic updates
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Save items to localStorage for persistence
  const persistItems = (items) => {
    try {
      // If filtering by meeting, store under meeting-specific key
      const storageKey = meetingId
        ? `kumeet_action_items_meeting_${meetingId}`
        : 'kumeet_action_items';

      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save action items to localStorage:', e);
    }
  };

  // Load items from localStorage
  const loadPersistedItems = () => {
    try {
      // Try meeting-specific storage first if applicable
      const storageKey = meetingId
        ? `kumeet_action_items_meeting_${meetingId}`
        : 'kumeet_action_items';

      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`Loaded ${parsed.length} action items from localStorage`);
          setActionItems(parsed);
          setLoading(false);
          return true;
        }
      }

      // As a fallback for meeting-specific views, try the general items
      if (meetingId && !localStorage.getItem(`kumeet_action_items_meeting_${meetingId}`)) {
        const allItems = localStorage.getItem('kumeet_action_items');
        if (allItems) {
          const parsed = JSON.parse(allItems);
          if (Array.isArray(parsed)) {
            const filteredItems = parsed.filter(item => item.meetingId === meetingId);
            if (filteredItems.length > 0) {
              console.log(`Filtered ${filteredItems.length} items for meeting ${meetingId} from all action items`);
              setActionItems(filteredItems);
              setLoading(false);
              return true;
            }
          }
        }
      }

      return false;
    } catch (e) {
      console.warn('Failed to load action items from localStorage:', e);
      return false;
    }
  };

  // Fetch action items from the server
  const fetchActionItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching action items...');

      // Create a variable to store all fetched items from multiple sources
      let allItems = [];
      let debugData = {};

      // Define endpoints to try based on context
      const endpoints = meetingId
        ? [
            `/action-items/meeting/${meetingId}`,
            `/meetings/${meetingId}/action-items`,
            `/meetings/action-items/meeting/${meetingId}`
          ]
        : [
            '/action-items/all',
            '/meetings/action-items/all'
          ];

      // Try each endpoint in sequence
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const resp = await api.get(endpoint);
          debugData[endpoint] = resp;

          if (resp && resp.action_items && Array.isArray(resp.action_items)) {
            console.log(`Success with ${endpoint}: found ${resp.action_items.length} items`);
            // Add items from this endpoint to our collection, avoiding duplicates
            resp.action_items.forEach(item => {
              if (!allItems.some(existingItem => existingItem.id === item.id)) {
                allItems.push(item);
              }
            });
          } else {
            console.log(`Endpoint ${endpoint} returned no action items or unexpected format`);
          }
        } catch (err) {
          console.log(`Failed to fetch from ${endpoint}: ${err.message}`);
          debugData[`${endpoint}_error`] = err.message;
        }
      }

      // If we're looking at a specific meeting, also try fetching all items and filtering client-side
      if (meetingId && allItems.length === 0) {
        try {
          console.log('Fetching all action items to filter by meeting ID client-side');
          const allItemsResp = await api.get('/action-items/all');

          if (allItemsResp && allItemsResp.action_items && Array.isArray(allItemsResp.action_items)) {
            console.log(`Found ${allItemsResp.action_items.length} total action items`);

            // Filter by meeting ID
            const filteredItems = allItemsResp.action_items.filter(
              item => item.meetingId === meetingId
            );

            console.log(`Filtered ${filteredItems.length} items for meeting ${meetingId}`);

            // Add filtered items to our collection
            filteredItems.forEach(item => {
              if (!allItems.some(existingItem => existingItem.id === item.id)) {
                allItems.push(item);
              }
            });
          }
        } catch (err) {
          console.log('Failed to fetch and filter all action items:', err.message);
        }
      }

      // Try direct debug endpoint as a last resort
      if (allItems.length === 0) {
        try {
          console.log('Trying debug endpoint as a last resort');
          const debugResp = await fetch('/api/debug/action-items').then(res => res.json());

          if (debugResp && Array.isArray(debugResp)) {
            console.log(`Found ${debugResp.length} action items from debug endpoint`);

            // Transform the debug data format if needed
            const transformedItems = debugResp.map(item => ({
              id: item.item_id,
              text: item.description || '',
              meeting: 'Unknown Meeting',
              meetingId: item.meeting_id ? String(item.meeting_id) : '',
              completed: item.status === 'completed',
              dueDate: item.due_date || 'No due date',
              assignee: { id: item.firebase_uid, name: 'User' }
            }));

            // Filter by meeting ID if applicable
            const itemsToAdd = meetingId
              ? transformedItems.filter(item => item.meetingId === meetingId)
              : transformedItems;

            // Add to our collection
            itemsToAdd.forEach(item => {
              if (!allItems.some(existingItem => existingItem.id === item.id)) {
                allItems.push(item);
              }
            });
          }
        } catch (err) {
          console.log('Debug endpoint failed:', err.message);
        }
      }

      // If we still have no items, add mock data for development/testing
      if (allItems.length === 0 && process.env.NODE_ENV === 'development') {
        console.log('No action items found, adding mock data for development');

        allItems = [
          {
            id: generateTempId(),
            text: 'Review project requirements',
            meeting: 'Project Kickoff',
            meetingId: meetingId || '1',
            completed: false,
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            assignee: { id: 'current-user', name: 'You' },
            isMock: true
          },
          {
            id: generateTempId(),
            text: 'Update team on progress',
            meeting: 'Weekly Standup',
            meetingId: meetingId || '2',
            completed: true,
            dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
            assignee: { id: 'current-user', name: 'You' },
            isMock: true
          },
          {
            id: generateTempId(),
            text: 'Prepare demo for client meeting',
            meeting: 'Client Review',
            meetingId: meetingId || '3',
            completed: false,
            dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0], // 3 days from now
            assignee: { id: 'current-user', name: 'You' },
            isMock: true
          }
        ];
      }

      // Set the state with all collected items
      if (allItems.length > 0) {
        console.log(`Total unique action items found: ${allItems.length}`);
        setActionItems(allItems);
        persistItems(allItems);
      } else {
        console.warn('No action items found from any source');
        setActionItems([]);
      }

      setDebugInfo(debugData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching action items:', err);
      setError(err.message || 'Failed to fetch action items');
      setLoading(false);
    }
  };

  // Initialize: Try to load from localStorage first, then fetch from server
  useEffect(() => {
    const hasPersistedItems = loadPersistedItems();
    if (!hasPersistedItems) {
      fetchActionItems();
    } else {
      // Still fetch in background to update if needed
      fetchActionItems();
    }
  }, [meetingId]);

  // Create a new action item
  const createActionItem = async (itemData) => {
    try {
      // Generate a temporary client ID before server creates one
      const tempId = generateTempId();

      // Prepare the optimistic item
      const optimisticItem = {
        id: tempId,
        text: itemData.text,
        meeting: itemData.meeting || '',
        meetingId: itemData.meetingId || '',
        completed: itemData.completed || false,
        dueDate: itemData.dueDate || new Date().toISOString().split('T')[0],
        assignee: itemData.assignee || { id: 'current-user', name: 'You' },
        isTemp: true // Flag to indicate this is a temporary item
      };

      // Update state optimistically
      const updatedItems = [...actionItems, optimisticItem];
      setActionItems(updatedItems);
      persistItems(updatedItems);

      // Call the API
      const payload = {
        text: itemData.text,
        meetingId: itemData.meetingId || null,
        dueDate: itemData.dueDate || null,
        completed: itemData.completed || false,
        assignee: itemData.assignee || null
      };

      let response;
      try {
        response = await api.post('/action-items', payload);
      } catch (error) {
        console.log('First endpoint failed, trying alternative');
        response = await api.post('/meetings/action-items', payload);
      }

      console.log('Create response:', response);

      // If we got a valid response, update our local state with the server ID
      if (response && response.id) {
        const serverItem = {
          ...optimisticItem,
          id: response.id,
          isTemp: false,
          // Update any other fields that might have changed on the server
          meeting: response.meeting || optimisticItem.meeting,
          assignee: response.assignee || optimisticItem.assignee
        };

        // Update local state, replacing the temp item with the server item
        const updatedWithServerItems = actionItems.map(item =>
          item.id === tempId ? serverItem : item
        );

        setActionItems(updatedWithServerItems);
        persistItems(updatedWithServerItems);

        return serverItem;
      }

      return optimisticItem;
    } catch (err) {
      console.error('Error creating action item:', err);
      setError(err.message || 'Failed to create action item');

      // Even if the API call fails, keep the optimistic item in the UI
      return null;
    }
  };

  // Update an action item
  const updateActionItem = async (itemId, itemData) => {
    try {
      // Find the item to update
      const itemToUpdate = actionItems.find(item => item.id === itemId);
      if (!itemToUpdate) {
        throw new Error(`Action item with ID ${itemId} not found`);
      }

      // Prepare the updated item with optimistic changes
      const updatedItem = {
        ...itemToUpdate,
        ...itemData,
        updatedAt: new Date().toISOString()
      };

      // Update state optimistically
      const updatedItems = actionItems.map(item =>
        item.id === itemId ? updatedItem : item
      );

      setActionItems(updatedItems);
      persistItems(updatedItems);

      // Call the API
      let response;
      try {
        response = await api.put(`/action-items/${itemId}`, itemData);
      } catch (error) {
        console.log('First endpoint failed, trying alternative');
        response = await api.put(`/meetings/action-items/${itemId}`, itemData);
      }

      console.log('Update response:', response);

      // If we got a valid response, update any fields that might have changed on the server
      if (response && response.id) {
        const serverUpdatedItem = {
          ...updatedItem,
          meeting: response.meeting || updatedItem.meeting,
          assignee: response.assignee || updatedItem.assignee
        };

        // Update local state with the server response
        const itemsWithServerUpdate = actionItems.map(item =>
          item.id === itemId ? serverUpdatedItem : item
        );

        setActionItems(itemsWithServerUpdate);
        persistItems(itemsWithServerUpdate);

        return serverUpdatedItem;
      }

      return updatedItem;
    } catch (err) {
      console.error('Error updating action item:', err);

      // Refresh from server to ensure consistency
      fetchActionItems();

      throw err;
    }
  };

  // Update just the completion status (common operation)
  const toggleItemCompletion = async (itemId) => {
    try {
      // Find the item to toggle
      const itemToUpdate = actionItems.find(item => item.id === itemId);
      if (!itemToUpdate) {
        throw new Error(`Action item with ID ${itemId} not found`);
      }

      // Toggle completed status
      const newStatus = !itemToUpdate.completed;

      // Update optimistically
      const updatedItems = actionItems.map(item =>
        item.id === itemId ? { ...item, completed: newStatus } : item
      );

      setActionItems(updatedItems);
      persistItems(updatedItems);

      // Call the API
      const payload = { completed: newStatus };

      try {
        await api.put(`/action-items/${itemId}`, payload);
      } catch (error) {
        console.log('First endpoint failed, trying alternative');
        await api.put(`/meetings/action-items/${itemId}`, payload);
      }

      return true;
    } catch (err) {
      console.error('Error toggling action item completion:', err);

      // Revert the optimistic update
      setActionItems(actionItems.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ));

      throw err;
    }
  };

  // Delete an action item
  const deleteActionItem = async (itemId) => {
    try {
      // Optimistically remove from UI
      const itemsBeforeDelete = [...actionItems];
      const updatedItems = actionItems.filter(item => item.id !== itemId);

      setActionItems(updatedItems);
      persistItems(updatedItems);

      // Call the API
      try {
        await api.del(`/action-items/${itemId}`);
      } catch (error) {
        console.log('First endpoint failed, trying alternative');
        await api.del(`/meetings/action-items/${itemId}`);
      }

      return true;
    } catch (err) {
      console.error('Error deleting action item:', err);

      // Refresh from server to ensure consistency
      fetchActionItems();

      throw err;
    }
  };

  // Reload action items from the server
  const refreshActionItems = () => {
    fetchActionItems();
  };

  return {
    actionItems,
    loading,
    error,
    debugInfo,
    createActionItem,
    updateActionItem,
    toggleItemCompletion,
    deleteActionItem,
    refreshActionItems
  };
};

export default useActionItems;