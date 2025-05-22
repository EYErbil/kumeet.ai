import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as api from '../utils/api';
import useActionItems from '../hooks/useActionItems';
import ROUTES from '../constants/routes';
import {
  FaPlus,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaEdit,
  FaTrash,
  FaFilter,
  FaChevronLeft,
  FaBuilding,
  FaSync,
  FaExclamationTriangle
} from 'react-icons/fa';
import AddToCalendarButton from '../components/calendar/AddToCalendarButton';

// Modal component for adding/editing action items
const ActionItemModal = ({ isOpen, onClose, onSave, initialData = {}, meetings = [], isEditing = false }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    description: '',
    meeting_id: '',
    due_date: new Date().toISOString().split('T')[0], // Today's date as default
    status: 'pending'
  });

  // Initialize form with data if editing
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        description: initialData.description || '',
        meeting_id: initialData.meeting_id || '',
        due_date: initialData.due_date && initialData.due_date !== 'No due date'
          ? initialData.due_date
          : new Date().toISOString().split('T')[0],
        status: initialData.status || 'pending'
      });
    } else {
      // Reset form for new items
      setFormData({
        description: '',
        meeting_id: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending'
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
      description: formData.description,
      meeting_id: formData.meeting_id || null,
      due_date: formData.due_date || null,
      status: formData.status
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
              name="description"
              value={formData.description}
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
              name="meeting_id"
              value={formData.meeting_id}
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
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="status"
              id="status"
              checked={formData.status === 'completed'}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  status: e.target.checked ? 'completed' : 'pending'
                });
              }}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="status" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
    if (!item.due_date || item.due_date === 'No due date') return '';
    if (item.status === 'completed') return 'text-green-500 dark:text-green-400';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due_date = new Date(item.due_date);
    due_date.setHours(0, 0, 0, 0);

    if (due_date < today) return 'text-red-500 dark:text-red-400';

    // Due soon (within 3 days)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    if (due_date <= threeDaysFromNow) return 'text-yellow-500 dark:text-yellow-400';

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
            item.status === 'completed' 
              ? 'bg-purple-600 border-purple-600 text-white' 
              : 'border-gray-300 dark:border-gray-500'
          } flex items-center justify-center focus:outline-none`}
          aria-label={item.status === 'completed' ? "Mark as incomplete" : "Mark as complete"}
          disabled={item.isTemp}
        >
          {item.status === 'completed' && <FaCheck className="h-3 w-3" />}
        </button>
      </div>

      <div className="ml-3 flex-1">
        <p className={`text-sm text-gray-700 dark:text-gray-300 ${item.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
          {item.description}
        </p>

        <div className="flex flex-wrap items-center mt-1 gap-2">
          {item.meeting_id && (
            <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FaBuilding className="mr-1 h-3 w-3" />
              {item.meeting_title || 'Unknown Meeting'}
            </span>
          )}

          <span className={`inline-flex items-center text-xs ${getDueStatusClass()}`}>
            <FaCalendarAlt className="mr-1 h-3 w-3" />
            {formatDate(item.due_date)}
          </span>
        </div>
      </div>

      <div className="ml-3 flex-shrink-0 flex items-center">
        {item.due_date && (
          <div className="mr-2">
            <AddToCalendarButton 
              item={{
                id: item.id,
                title: item.description,
                dueDate: item.due_date
              }}
              type="action-item"
              buttonText=""
              className="p-2 text-sm"
            />
          </div>
        )}
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
const ActionItems = ({ meeting_id = null }) => {
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
  } = useActionItems(meeting_id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [meetings, setMeetings] = useState([]);
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
          setMeetings([]);
        }
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setMeetings([]);
      }
    };

    fetchMeetings();
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
      // Find the meeting title if a meeting_id is provided
      let meeting_title = '';
      if (data.meeting_id) {
        const meeting = meetings.find(m => m.id === data.meeting_id);
        meeting_title = meeting ? meeting.title : '';
      }

      // Add meeting title to the data
      const itemData = {
        ...data,
        meeting_title
      };

      await createActionItem(itemData);
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
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'completed') return item.status === 'completed';
    return true;
  });

  // Loading state
  if (loading && actionItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            {!meeting_id && (
              <div className="flex items-center">
                <Link to={ROUTES.DASHBOARD} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4">
                  <FaChevronLeft />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Action Items</h1>
              </div>
            )}
            {meeting_id && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Meeting Action Items</h1>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${meeting_id ? 'pb-6' : 'p-6'}`}>
      {meeting_id && (
        <div className="mb-4">
          <Link
            to={ROUTES.MEETINGS.DETAIL(meeting_id)}
            className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline"
          >
            <FaChevronLeft className="mr-1" size={12} />
            {t('actionItems.backToMeeting')}
          </Link>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {meeting_id ? t('actionItems.meetingActionItems') : t('actionItems.title')}
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
        isEditing={!!editingItem}
      />
    </div>
  );
};

export default ActionItems;