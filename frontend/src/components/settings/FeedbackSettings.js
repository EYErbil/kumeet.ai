import React, { useState } from 'react';
import { FaCommentDots, FaCheck, FaExclamationTriangle, FaLightbulb, FaBug, FaQuestionCircle } from 'react-icons/fa';
import { getCurrentUser } from '../../services/api/auth';
import * as api from '../../utils/api';

const FeedbackSettings = () => {
  // Feedback state
  const [feedbackType, setFeedbackType] = useState('general feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [notification, setNotification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Handle feedback type change
  const handleFeedbackTypeChange = (type) => {
    setFeedbackType(type);
  };

  // Handle feedback text change
  const handleFeedbackTextChange = (e) => {
    setFeedbackText(e.target.value);
  };

  // Handle feedback submission
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      showNotification('Please enter your feedback', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      // Use API utility with correct feedback endpoint
      const data = await api.post('/feedback', {
        feedback_text: feedbackText,
        feedback_type: feedbackType
      });
      
      console.log('Success response:', data);
      setFeedbackText('');
      showNotification('Thank you for your feedback!', 'success');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showNotification(
        error.message === '[object Object]' 
          ? 'Failed to submit feedback. Please try again.' 
          : error.message,
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 10000);
  };

  // Feedback type options
  const feedbackTypes = [
    {
      id: 'general feedback',
      label: 'General Feedback',
      icon: <FaCommentDots />,
      description: 'Share your overall experience with kumeet.ai',
    },
    {
      id: 'feature request',
      label: 'Feature Request',
      icon: <FaLightbulb />,
      description: 'Suggest new features or improvements',
    },
    {
      id: 'bug report',
      label: 'Bug Report',
      icon: <FaBug />,
      description: 'Report issues or unexpected behavior',
    },
    {
      id: 'question',
      label: 'Question',
      icon: <FaQuestionCircle />,
      description: 'Ask a question about how to use kumeet.ai',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Feedback</h2>
      
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <FaCheck className="mr-2" />
            ) : (
              <FaExclamationTriangle className="mr-2" />
            )}
            {notification.message}
          </div>
        </div>
      )}
      
      {/* Feedback Form */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaCommentDots className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Share Your Feedback</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We value your feedback and are constantly working to improve kumeet.ai. Please share your thoughts, suggestions, or report any issues you've encountered.
        </p>
        
        <form onSubmit={handleSubmitFeedback}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Feedback Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleFeedbackTypeChange(type.id)}
                  className={`flex items-center p-3 rounded-lg border ${
                    feedbackType === type.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900 dark:border-purple-400'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className={`text-xl mr-3 ${
                    feedbackType === type.id
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 dark:text-white font-medium">{type.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Feedback
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={handleFeedbackTextChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows="5"
              placeholder={`Share your ${feedbackType === 'general feedback' ? 'thoughts' : feedbackType === 'feature request' ? 'feature idea' : feedbackType === 'bug report' ? 'bug details' : 'question'} here...`}
              required
            ></textarea>
            {feedbackType === 'bug report' && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Please include steps to reproduce the issue, expected behavior, and any error messages you received.
              </p>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Help Resources */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaQuestionCircle className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Help Resources</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Need help with kumeet.ai? Check out these resources:
        </p>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Knowledge Base</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Find answers to common questions and learn how to use kumeet.ai effectively.
            </p>
            <a 
              href="#" 
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
            >
              Browse Knowledge Base
            </a>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Video Tutorials</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Watch step-by-step tutorials on how to use kumeet.ai features.
            </p>
            <a 
              href="#" 
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
            >
              View Tutorials
            </a>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Contact Support</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Need personalized help? Our support team is ready to assist you.
            </p>
            <a 
              href="mailto:support@kumeet.ai" 
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSettings; 