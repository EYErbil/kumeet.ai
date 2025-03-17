import React, { useState } from 'react';
import { FaPlus, FaTimes, FaCalendarPlus } from 'react-icons/fa';
import ROUTES from '../constants/routes';
import { AddToCalendarButton } from '../components/calendar';

// Modal component for adding new action items
const AddActionItemModal = ({ isOpen, onClose, onAdd }) => {
  const [newItem, setNewItem] = useState({
    text: '',
    meeting: '',
    dueDate: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      ...newItem,
      id: Date.now(),
      completed: false
    });
    setNewItem({
      text: '',
      meeting: '',
      dueDate: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Add New Action Item</h2>
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
              Action Item
            </label>
            <input
              type="text"
              value={newItem.text}
              onChange={(e) => setNewItem({...newItem, text: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder="What needs to be done?"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Related Meeting
            </label>
            <input
              type="text"
              value={newItem.meeting}
              onChange={(e) => setNewItem({...newItem, meeting: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder="Meeting name (optional)"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={newItem.dueDate}
              onChange={(e) => setNewItem({...newItem, dueDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Action item component
const ActionItem = ({ item, onToggleComplete }) => {
  // Format the due date for the calendar
  const formattedItem = {
    ...item,
    id: item.id.toString(),
    title: item.text,
    dueDate: typeof item.dueDate === 'string' 
      ? (item.dueDate === 'Today' 
          ? new Date() 
          : item.dueDate === 'Tomorrow' 
            ? new Date(Date.now() + 24 * 60 * 60 * 1000) 
            : new Date(item.dueDate))
      : new Date(item.dueDate)
  };

  return (
    <div className="flex items-start p-4 border-b border-gray-100 dark:border-gray-700">
      <input 
        type="checkbox" 
        className="mt-0.5 mr-3 h-4 w-4 text-purple-600 rounded border-gray-300 dark:border-gray-600 focus:ring-purple-500"
        checked={item.completed}
        onChange={() => onToggleComplete(item.id)}
      />
      <div className="flex-1">
        <p className={`text-sm text-gray-700 dark:text-gray-300 ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
          {item.text}
        </p>
        <div className="flex items-center mt-1">
          {item.meeting && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.meeting}</span>
          )}
          {item.meeting && <span className="mx-2 text-xs text-gray-400 dark:text-gray-500">•</span>}
          <span className="text-xs text-gray-500 dark:text-gray-400">Due: {item.dueDate}</span>
        </div>
      </div>
      {!item.completed && (
        <AddToCalendarButton 
          item={formattedItem} 
          type="action-item" 
          buttonText=""
          className="ml-2 px-2 py-1"
        />
      )}
    </div>
  );
};

const ActionItems = () => {
  // Sample action items data - in a real app, this would come from an API
  const [actionItems, setActionItems] = useState([
    {
      id: 1,
      text: 'Review sprint backlog',
      meeting: 'Sprint Planning',
      completed: false,
      dueDate: 'Today'
    },
    {
      id: 2,
      text: 'Update API documentation',
      meeting: 'Team Sync',
      completed: false,
      dueDate: 'Tomorrow'
    },
    {
      id: 3,
      text: 'Fix authentication bug',
      meeting: 'Bug Triage',
      completed: true,
      dueDate: '2024-04-25'
    },
    {
      id: 4,
      text: 'Prepare demo for stakeholders',
      meeting: 'Sprint Review',
      completed: false,
      dueDate: '2024-04-30'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  const handleToggleComplete = (id) => {
    setActionItems(actionItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleAddActionItem = (newItem) => {
    setActionItems([newItem, ...actionItems]);
  };

  const filteredItems = actionItems.filter(item => {
    if (filter === 'active') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Action Items</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <FaPlus className="mr-2" size={12} />
          New Action Item
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              filter === 'all' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              filter === 'active' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              filter === 'completed' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        <div>
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <ActionItem 
                key={item.id} 
                item={item} 
                onToggleComplete={handleToggleComplete} 
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No action items found.
            </div>
          )}
        </div>
      </div>

      <AddActionItemModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddActionItem}
      />
    </div>
  );
};

export default ActionItems; 