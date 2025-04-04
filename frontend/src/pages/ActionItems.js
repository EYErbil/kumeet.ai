import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaPlus,
  FaTimes,
  FaCalendarAlt,
  FaCheck,
  FaUser,
  FaBuilding,
  FaTrash,
  FaEdit,
  FaChevronLeft,
  FaSync,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import ROUTES from '../constants/routes';
import * as api from '../utils/api';
import useActionItems from '../hooks/useActionItems';

// Modal component for adding/editing action items
const ActionItemModal = ({ isOpen, onClose, onSave, initialData = {}, meetings = [], users = [], isEditing = false }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    text: '',
    meeting: '',
    dueDate: new Date().toISOString().split('T')[0], // Today's date as default
    assignee: '',
    completed: false
  });

  // Initialize form with data if editing
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        text: initialData.text || '',
        meeting: initialData.meetingId || '',
        dueDate: initialData.dueDate && initialData.dueDate !== 'No due date'
          ? initialData.dueDate
          : new Date().toISOString().split('T')[0],
        assignee: initialData.assignee?.id || '',
        completed: initialData.completed || false
      });
    } else {
      // Reset form for new items
      setFormData({
        text: '',
        meeting: '',
        dueDate: new Date().toISOString().split('T')[0],
        assignee: '',
        completed: false
      });
    }
  }, [isEditing, initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const actionItemData = {
      text: formData.text,
      meetingId: formData.meeting || null,
      dueDate: formData.dueDate || null,
      completed: formData.completed,
      assignee: formData.assignee ? { id: formData.assignee } : null
    };

    onSave(actionItemData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {isEditing ? t('actionItems.editActionItem') : t('actionItems.newActionItem')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('actionItems.description')}
            </label>
            <input
              type="text"
              name="text"
              value={formData.text}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('actionItems.whatToBeDone')}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('actionItems.relatedMeeting')}
            </label>
            <select
              name="meeting"
              value={formData.meeting}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('actionItems.noSpecificMeeting')}</option>
              {meetings.map(meeting => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('actionItems.dueDate')}
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('actionItems.assignee')}
            </label>
            <select
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('actionItems.assignTo')}</option>
              {users.length > 0 ? (
                users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))
              ) : (
                <option value="current-user">{t('actionItems.currentUser')}</option>
              )}
            </select>
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="completed"
              id="completed"
              checked={formData.completed}
              onChange={handleChange}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="completed" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              {t('actionItems.markAsCompleted')}
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {isEditing ? t('actionItems.update') : t('actionItems.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Individual action item component
const ActionItem = ({ item, onToggleComplete, onEdit, onDelete }) => {
  const { t } = useTranslation();
  
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'No due date') return t('actionItems.noDueDate');

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getDueStatusClass = () => {
    if (!item.dueDate || item.dueDate === 'No due date') return '';
    if (item.completed) return 'text-green-500 dark:text-green-400';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(item.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) return 'text-red-500 dark:text-red-400';

    // Due soon (within 3 days)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    if (dueDate <= threeDaysFromNow) return 'text-yellow-500 dark:text-yellow-400';

    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className={`flex items-start p-4 border-b border-gray-100 dark:border-gray-700 ${item.isTemp ? 'opacity-70' : ''}`}>
      {item.isTemp && (
        <div className="absolute top-2 right-2 text-yellow-500 dark:text-yellow-400">
          <FaSync className="animate-spin" />
        </div>
      )}

      <div className="flex-shrink-0 mt-0.5">
        <button
          onClick={() => onToggleComplete(item.id)}
          className={`h-5 w-5 rounded border ${
            item.completed 
              ? 'bg-purple-600 border-purple-600 text-white' 
              : 'border-gray-300 dark:border-gray-500'
          } flex items-center justify-center focus:outline-none`}
          aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
          disabled={item.isTemp}
        >
          {item.completed && <FaCheck className="h-3 w-3" />}
        </button>
      </div>

      <div className="ml-3 flex-1">
        <p className={`text-sm text-gray-700 dark:text-gray-300 ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
          {item.text}
        </p>

        <div className="flex flex-wrap items-center mt-1 gap-2">
          {item.meeting && (
            <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FaBuilding className="mr-1 h-3 w-3" />
              {item.meeting}
            </span>
          )}

          <span className={`inline-flex items-center text-xs ${getDueStatusClass()}`}>
            <FaCalendarAlt className="mr-1 h-3 w-3" />
            {formatDate(item.dueDate)}
          </span>

          {item.assignee && item.assignee.name && (
            <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FaUser className="mr-1 h-3 w-3" />
              {item.assignee.name}
            </span>
          )}
        </div>
      </div>

      <div className="ml-3 flex-shrink-0 flex">
        <button
          onClick={() => onEdit(item)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-2"
          aria-label="Edit"
          disabled={item.isTemp}
        >
          <FaEdit />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          aria-label="Delete"
          disabled={item.isTemp}
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

// Main action items component
const ActionItems = ({ meetingId = null }) => {
  const { t } = useTranslation();
  const {
    actionItems,
    loading,
    error,
    createActionItem,
    updateActionItem,
    toggleItemCompletion,
    deleteActionItem,
    refreshActionItems
  } = useActionItems(meetingId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed'

  // Fetch meetings and users for the dropdowns
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const meetingsResponse = await api.get('/meetings');

        if (meetingsResponse && meetingsResponse.meetings) {
          setMeetings(meetingsResponse.meetings.map(meeting => ({
            id: meeting.meeting_id || meeting.id,
            title: meeting.title
          })));
        } else if (Array.isArray(meetingsResponse)) {
          setMeetings(meetingsResponse.map(meeting => ({
            id: meeting.meeting_id || meeting.id,
            title: meeting.title
          })));
        } else {
          // Create some mock meetings as fallback
          setMeetings([
            { id: '1', title: 'Weekly Standup' },
            { id: '2', title: 'Project Planning' },
            { id: '3', title: 'Client Meeting' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching meetings:', err);

        // Fallback to mock data
        setMeetings([
          { id: '1', title: 'Weekly Standup' },
          { id: '2', title: 'Project Planning' },
          { id: '3', title: 'Client Meeting' }
        ]);
      }
    };

    const fetchUsers = async () => {
      try {
        const usersResponse = await api.get('/users');

        if (usersResponse && usersResponse.users) {
          setUsers(usersResponse.users.map(user => ({
            id: user.id || user.firebase_uid,
            name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          })));
        } else if (Array.isArray(usersResponse)) {
          setUsers(usersResponse.map(user => ({
            id: user.id || user.firebase_uid,
            name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          })));
        } else {
          // Fallback to placeholder user
          setUsers([
            { id: 'current-user', name: 'You (Current User)' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching users:', err);

        // Fallback to placeholder user
        setUsers([
          { id: 'current-user', name: 'You (Current User)' }
        ]);
      }
    };

    fetchMeetings();
    fetchUsers();
  }, []);

  // Handle toggling item completion status
  const handleToggleComplete = async (itemId) => {
    try {
      await toggleItemCompletion(itemId);
    } catch (error) {
      console.error('Error toggling item completion:', error);
    }
  };

  // Handle opening edit modal
  const handleEditClick = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Handle saving edited item
  const handleEditItem = async (data) => {
    if (!editingItem) return;

    try {
      await updateActionItem(editingItem.id, data);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  // Handle creating new item
  const handleAddItem = async (data) => {
    try {
      await createActionItem(data);
    } catch (error) {
      console.error('Error creating action item:', error);
    }
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this action item?')) return;

    try {
      await deleteActionItem(itemId);
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  // Filter action items based on current filter
  const filteredItems = actionItems.filter(item => {
    if (filter === 'pending') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  // Loading state
  if (loading && actionItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          {!meetingId && (
            <div className="flex items-center">
              <Link to={ROUTES.DASHBOARD} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4">
                <FaChevronLeft />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Action Items</h1>
            </div>
          )}
          {meetingId && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Meeting Action Items</h1>
          )}
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${meetingId ? 'pb-6' : 'p-6'}`}>
      {meetingId && (
        <div className="mb-4">
          <Link
            to={ROUTES.MEETINGS.DETAIL(meetingId)}
            className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline"
          >
            <FaChevronLeft className="mr-1" size={12} />
            {t('actionItems.backToMeeting')}
          </Link>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {meetingId ? t('actionItems.meetingActionItems') : t('actionItems.title')}
        </h1>
        <div className="flex space-x-2">
          {/* Refresh button for debugging */}
          <button
            onClick={refreshActionItems}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none"
            title={t('actionItems.refresh')}
          >
            <FaSync size={16} />
          </button>
          
          {/* Add new action item button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <FaPlus className="mr-2" size={12} />
            {t('actionItems.newActionItem')}
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md mr-2 ${
            filter === 'all'
              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('actionItems.all')}
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md mr-2 ${
            filter === 'pending'
              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('actionItems.pending')}
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-md ${
            filter === 'completed'
              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('actionItems.completed')}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg mb-6 flex items-start">
          <FaExclamationTriangle className="mr-3 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-medium">{t('actionItems.errorLoading')}</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Action items list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <ActionItem
              key={item.id}
              item={item}
              onToggleComplete={handleToggleComplete}
              onEdit={() => handleEditClick(item)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {actionItems.length > 0
              ? t('actionItems.noFilteredItems', { filter: t(`actionItems.${filter}`) })
              : t('actionItems.noItems')}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <ActionItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingItem ? handleEditItem : handleAddItem}
        initialData={editingItem}
        meetings={meetings}
        users={users}
        isEditing={!!editingItem}
      />
    </div>
  );
};

export default ActionItems;