import { useState, useEffect } from 'react';
import * as api from '../utils/api';

/**
 * Custom hook for fetching and managing action items
 * @param {string|null} meetingId - Optional ID of the meeting to filter action items
 * @returns {Object} Action items data and state
 */
const useActionItems = (meetingId = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    const fetchActionItems = async () => {
      try {
        setLoading(true);

        let endpoint = '/meetings/action-items/all';
        if (meetingId) {
          endpoint = `/meetings/${meetingId}/action-items`;
        }

        const response = await api.get(endpoint);
        setActionItems(response.action_items);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch action items');
        setLoading(false);
      }
    };

    fetchActionItems();
  }, [meetingId]);

  /**
   * Update action item status
   * @param {string} itemId - ID of the action item to update
   * @param {boolean} completed - New completion status
   */
  const updateActionItemStatus = async (itemId, completed) => {
    try {
      // Optimistically update UI
      setActionItems(actionItems.map(item =>
        item.id === itemId ? { ...item, completed } : item
      ));

      // In a real app, this would call the API to update the status
      // await api.put(`/meetings/action-items/${itemId}`, { status: completed ? 'completed' : 'pending' });

      // For now, we're just simulating the update with a timeout
      return new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      // Revert optimistic update on error
      setActionItems(actionItems);
      throw err;
    }
  };

  /**
   * Create a new action item
   * @param {Object} actionItemData - Action item data
   */
  const createActionItem = async (actionItemData) => {
    try {
      setLoading(true);

      // In a real app, this would call the API to create the action item
      // const response = await api.post('/meetings/action-items', actionItemData);
      // setActionItems([...actionItems, response]);

      // For now, we're just simulating the creation
      const newItem = {
        id: Date.now().toString(),
        text: actionItemData.description,
        meeting: actionItemData.meetingTitle || '',
        completed: false,
        dueDate: actionItemData.dueDate || 'No due date',
      };

      setActionItems([...actionItems, newItem]);
      setLoading(false);

      return newItem;
    } catch (err) {
      setError(err.message || 'Failed to create action item');
      setLoading(false);
      throw err;
    }
  };

  /**
   * Delete an action item
   * @param {string} itemId - ID of the action item to delete
   */
  const deleteActionItem = async (itemId) => {
    try {
      // Optimistically update UI
      setActionItems(actionItems.filter(item => item.id !== itemId));

      // In a real app, this would call the API to delete the action item
      // await api.del(`/meetings/action-items/${itemId}`);

      // For now, we're just simulating the delete with a timeout
      return new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      // Revert optimistic update on error
      setActionItems(actionItems);
      throw err;
    }
  };

  return {
    actionItems,
    loading,
    error,
    updateActionItemStatus,
    createActionItem,
    deleteActionItem
  };
};

export default useActionItems;