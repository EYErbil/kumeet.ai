import { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook for fetching and managing action items with persistence
 * @param {string|null} meeting_id - Optional ID of the meeting to filter action items
 * @returns {Object} Action items data and state
 */
const useActionItems = (meeting_id = null) => {
  const { i18n } = useTranslation();
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Generate a temporary ID for optimistic updates
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Fetch action items from the server
  const fetchActionItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching action items...');

      const endpoint = meeting_id
        ? `/action-items/meeting/${meeting_id}`
        : '/action-items/all';

      console.log(`Fetching from endpoint: ${endpoint}`);
      const resp = await api.get(endpoint);

      let items = [];
      if (resp && resp.action_items && Array.isArray(resp.action_items)) {
        items = resp.action_items.map(item => ({
          id: item.id || item.item_id,
          description: item.description || '',
          meeting_id: item.meeting_id || '',
          meeting_title: item.meeting_title || '',
          status: item.status || 'pending',
          due_date: item.due_date || 'No due date',
          isTemp: false
        }));
      }

      console.log(`Found ${items.length} action items`);
      setActionItems(items);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching action items:', err);
      setError(err.message || 'Failed to fetch action items');
      setLoading(false);
    }
  };

  // Function to fetch pending action items count
  const fetchPendingCount = async () => {
    try {
      setLoading(true);
      const response = await api.get('/action-items/count/pending');
      if (response && typeof response.count === 'number') {
        setPendingCount(response.count);
      }
    } catch (err) {
      console.error('Error fetching pending action items count:', err);
      // Don't set error state here to avoid disrupting the UI
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActionItems();
    fetchPendingCount();
  }, [meeting_id]);

  // Refetch on language change
  useEffect(() => {
    const fetchData = async () => {
      await fetchActionItems();
      await fetchPendingCount();
    };
    fetchData();
  }, [i18n.language]);

  // Create a new action item
  const createActionItem = async (itemData) => {
    try {
      console.log('[DEBUG] Creating action item with data:', itemData);
      const tempId = generateTempId();
      console.log('[DEBUG] Generated temporary ID:', tempId);

      // Prepare the optimistic item
      const optimisticItem = {
        id: tempId,
        description: itemData.description,
        meeting_id: itemData.meeting_id || '',
        meeting_title: itemData.meeting_title || '',
        status: itemData.status || 'pending',
        due_date: itemData.due_date || new Date().toISOString().split('T')[0],
        isTemp: true
      };
      
      console.log('[DEBUG] Created optimistic item:', optimisticItem);

      // Update state optimistically
      setActionItems([...actionItems, optimisticItem]);
      console.log('[DEBUG] Updated state with optimistic item');

      // Call the API
      const payload = {
        description: itemData.description,
        meeting_id: itemData.meeting_id || null,
        due_date: itemData.due_date || null,
        status: itemData.status || 'pending'
      };
      
      console.log('[DEBUG] Calling API with payload:', payload);
      console.log('[DEBUG] API endpoint:', '/action-items');

      // More detailed logging for the API call
      try {
        const response = await api.post('/action-items', payload);
        console.log('[DEBUG] API response:', response);
        
        if (!response) {
          console.error('[DEBUG] No response from server');
          throw new Error('No response from server');
        }
      } catch (apiError) {
        console.error('[DEBUG] API error:', apiError);
        console.error('[DEBUG] API error details:', {
          message: apiError.message,
          status: apiError.status,
          response: apiError.response,
        });
        throw apiError;
      }

      // Refresh the list from server to ensure consistency
      console.log('[DEBUG] Refreshing action items from server');
      await fetchActionItems();
      console.log('[DEBUG] Action items refreshed successfully');

    } catch (err) {
      console.error('[DEBUG] Error creating action item:', err);
      console.error('[DEBUG] Error type:', typeof err);
      console.error('[DEBUG] Error stack:', err.stack);
      setError(err.message || 'Failed to create action item');
      // Remove optimistic update on error
      setActionItems(actionItems.filter(item => !item.isTemp));
    }
  };

  // Update an action item
  const updateActionItem = async (itemId, itemData) => {
    try {
      const itemToUpdate = actionItems.find(item => item.id === itemId);
      if (!itemToUpdate) {
        throw new Error(`Action item with ID ${itemId} not found`);
      }

      // Update optimistically
      const updatedItems = actionItems.map(item =>
        item.id === itemId ? { ...item, ...itemData } : item
      );
      setActionItems(updatedItems);

      // Call the API
      await api.put(`/action-items/${itemId}`, itemData);

      // Refresh from server to ensure consistency
      await fetchActionItems();

    } catch (err) {
      console.error('Error updating action item:', err);
      await fetchActionItems();
      throw err;
    }
  };

  // Toggle completion status
  const toggleItemCompletion = async (itemId) => {
    try {
      const itemToUpdate = actionItems.find(item => item.id === itemId);
      if (!itemToUpdate) {
        throw new Error(`Action item with ID ${itemId} not found`);
      }

      const newStatus = itemToUpdate.status === 'completed' ? 'pending' : 'completed';

      // Update optimistically
      const updatedItems = actionItems.map(item =>
        item.id === itemId ? { ...item, status: newStatus } : item
      );
      setActionItems(updatedItems);

      // Call the API
      await api.put(`/action-items/${itemId}`, { status: newStatus });

      // Refresh from server to ensure consistency
      await fetchActionItems();

    } catch (err) {
      console.error('Error toggling item completion:', err);
      await fetchActionItems();
      throw err;
    }
  };

  // Delete an action item
  const deleteActionItem = async (itemId) => {
    try {
      // Remove optimistically
      setActionItems(actionItems.filter(item => item.id !== itemId));

      // Call the API
      await api.del(`/action-items/${itemId}`);

      // Refresh from server to ensure consistency
      await fetchActionItems();

    } catch (err) {
      console.error('Error deleting action item:', err);
      await fetchActionItems();
      throw err;
    }
  };

  return {
    actionItems,
    loading,
    error,
    pendingCount,
    createActionItem,
    updateActionItem,
    toggleItemCompletion,
    deleteActionItem,
    refreshActionItems: async () => {
      await fetchActionItems();
      await fetchPendingCount();
    }
  };
};

export default useActionItems;