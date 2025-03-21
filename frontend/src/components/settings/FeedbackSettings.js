import React, { useState } from 'react';
import { FaCommentDots, FaCheck, FaExclamationTriangle, FaLightbulb, FaBug, FaQuestionCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const FeedbackSettings = () => {
  const { t } = useTranslation();
  
  // Feedback state
  const [feedbackType, setFeedbackType] = useState('general');
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
  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      showNotification(t('settings.feedback.enterFeedback'), 'error');
      return;
    }
    
    setSubmitting(true);
    
    // Here you would send the feedback to your backend
    // For demo purposes, we'll just simulate a successful submission
    setTimeout(() => {
      setFeedbackText('');
      setSubmitting(false);
      showNotification(t('settings.feedback.feedbackSent'), 'success');
    }, 1000);
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Feedback type options
  const feedbackTypes = [
    {
      id: 'general',
      label: t('settings.feedback.generalFeedback'),
      icon: <FaCommentDots />,
      description: t('settings.feedback.generalFeedbackDescription'),
    },
    {
      id: 'feature',
      label: t('settings.feedback.featureRequest'),
      icon: <FaLightbulb />,
      description: t('settings.feedback.featureRequestDescription'),
    },
    {
      id: 'bug',
      label: t('settings.feedback.bugReport'),
      icon: <FaBug />,
      description: t('settings.feedback.bugReportDescription'),
    },
    {
      id: 'question',
      label: t('settings.feedback.question'),
      icon: <FaQuestionCircle />,
      description: t('settings.feedback.questionDescription'),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.feedback.title')}</h2>
      
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.feedback.yourFeedback')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('settings.feedback.generalFeedbackDescription')}
        </p>
        
        <form onSubmit={handleSubmitFeedback}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.feedback.feedbackType')}
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
              {t('settings.feedback.yourFeedback')}
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={handleFeedbackTextChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows="5"
              placeholder={t(`settings.feedback.placeholders.${feedbackType}`)}
            ></textarea>
            {feedbackType === 'bug' && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('settings.feedback.bugReportHelp')}
              </p>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('settings.feedback.submitting') : t('settings.feedback.submitFeedback')}
            </button>
          </div>
        </form>
      </div>
      
      {/* Help Resources */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaQuestionCircle className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.feedback.helpResources.title')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('settings.feedback.helpResources.faq')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.feedback.helpResources.faqDescription')}
            </p>
            <a 
              href="#" 
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium"
            >
              {t('settings.legal.view')}
            </a>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('settings.feedback.helpResources.documentation')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.feedback.helpResources.documentationDescription')}
            </p>
            <a 
              href="#" 
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium"
            >
              {t('settings.legal.view')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSettings; 