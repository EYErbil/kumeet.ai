import React, { useState } from 'react';
import { FaCamera, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const ProfileSettings = () => {
  const { t } = useTranslation();
  
  // User profile state
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isEmailVerified: true,
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value,
    });
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  // Save profile changes
  const handleSaveProfile = (e) => {
    e.preventDefault();
    // Here you would call your API to update the profile
    setIsEditingProfile(false);
    showNotification(t('settings.profile.profileUpdated'), 'success');
  };

  // Change password
  const handleChangePassword = (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification(t('settings.profile.passwordsDoNotMatch'), 'error');
      return;
    }
    
    // Here you would call your API to change the password
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsChangingPassword(false);
    showNotification(t('settings.profile.passwordChanged'), 'success');
  };

  // Handle profile picture change
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Here you would upload the file to your server
      // For now, we'll just show a success message
      showNotification(t('settings.profile.pictureUpdated'), 'success');
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.profile.title')}</h2>
      
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
      
      {/* Profile Picture */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center overflow-hidden">
              <span className="text-3xl text-purple-600 dark:text-purple-300">
                {profile.firstName && profile.lastName 
                  ? `${profile.firstName[0]}${profile.lastName[0]}`
                  : 'JD'}
              </span>
            </div>
            <label htmlFor="profile-picture" className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full cursor-pointer">
              <FaCamera size={14} />
              <input 
                type="file" 
                id="profile-picture" 
                className="hidden" 
                accept="image/*"
                onChange={handleProfilePictureChange}
              />
            </label>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {profile.firstName} {profile.lastName}
            </h3>
            <div className="flex items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">{profile.email}</span>
              {profile.isEmailVerified && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-xs flex items-center">
                  <FaCheck size={10} className="mr-1" /> {t('settings.profile.verified')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* User Information */}
      <div className="mb-8 bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.profile.userInformation')}</h3>
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
          >
            {isEditingProfile ? t('common.cancel') : t('common.edit')}
          </button>
        </div>
        
        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.profile.firstName')}
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.profile.lastName')}
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.profile.emailAddress')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {t('settings.profile.saveChanges')}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.profile.firstName')}</p>
                <p className="text-gray-900 dark:text-white">{profile.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.profile.lastName')}</p>
                <p className="text-gray-900 dark:text-white">{profile.lastName}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.profile.emailAddress')}</p>
              <div className="flex items-center">
                <p className="text-gray-900 dark:text-white">{profile.email}</p>
                {!profile.isEmailVerified && (
                  <button className="ml-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
                    {t('settings.profile.verifyEmail')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Password Management */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.profile.passwordManagement')}</h3>
          <button 
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
          >
            {isChangingPassword ? t('common.cancel') : t('settings.profile.changePassword')}
          </button>
        </div>
        
        {isChangingPassword ? (
          <form onSubmit={handleChangePassword}>
            <div className="mb-4">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.profile.currentPassword')}
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.profile.newPassword')}
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.profile.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {t('settings.profile.updatePassword')}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.profile.passwordLastChanged')} <span className="text-gray-900 dark:text-white">January 15, 2024</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings; 