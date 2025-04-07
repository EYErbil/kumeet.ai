import React, { useState, useEffect } from 'react';
import { FaCamera, FaCheck, FaExclamationTriangle, FaUserShield } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '../../services/api/auth';
import * as api from '../../utils/api';
import { auth } from '../../config/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import PasswordInput from '../common/PasswordInput';

const ProfileSettings = () => {
  const { t } = useTranslation();
  
  // User profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
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

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }

      try {
        const data = await api.get(`/user/${currentUser.uid}`);
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        showNotification('Failed to load user profile', 'error', 'profile');
      }
    } catch (error) {
      console.error('Error in profile data fetch:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

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

  // Handle cancel edit
  const handleCancelEdit = async () => {
    await fetchUserData(); // Fetch fresh data from database
    setIsEditingProfile(false);
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        showNotification(t('settings.profile.notLoggedIn'), 'error', 'profile');
        return;
      }

      // Call API to update the profile
      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName
      };
      
      // Update in our database
      await api.put(`/user/${currentUser.uid}`, updateData);

      // Update in Firebase
      await updateProfile(currentUser, {
        displayName: `${profile.firstName} ${profile.lastName}`
      });

      setIsEditingProfile(false);
      showNotification(t('settings.profile.profileUpdated'), 'success', 'profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification(t('settings.profile.updateFailed'), 'error', 'profile');
    }
  };

  // Show notification
  const showNotification = (message, type, category = 'general') => {
    setNotification({ message, type, category });
    setTimeout(() => setNotification(null), 5000);
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification(t('settings.profile.passwordsDoNotMatch'), 'error', 'password');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        showNotification(t('settings.profile.notLoggedIn'), 'error', 'password');
        return;
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );

      try {
        await reauthenticateWithCredential(user, credential);
      } catch (error) {
        console.error('Reauthentication error:', error);
        if (error.code === 'auth/invalid-credential') {
          showNotification(t('settings.profile.incorrectCurrentPassword'), 'error', 'password');
          return;
        }
        throw error; // Re-throw other errors
      }

      // Update password
      await updatePassword(user, passwordData.newPassword);
      
      // Clear form and show success message
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      showNotification(t('settings.profile.passwordChanged'), 'success', 'profile');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/weak-password') {
        showNotification(t('settings.profile.weakPassword'), 'error', 'password');
      } else {
        showNotification(t('settings.profile.passwordChangeFailed'), 'error', 'password');
      }
    }
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

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.profile.title')}</h2>
      
      {/* Profile Notification */}
      {notification && notification.category === 'profile' && (
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
                  : ''}
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
            onClick={() => isEditingProfile ? handleCancelEdit() : setIsEditingProfile(true)}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                disabled
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
            {notification && notification.category === 'password' && (
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
            <div className="space-y-4">
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter your current password"
                label={t('settings.profile.currentPassword')}
                className="form-input mt-1 w-full"
              />
              <PasswordInput
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter your new password"
                label={t('settings.profile.newPassword')}
                className="form-input mt-1 w-full"
              />
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm your new password"
                label={t('settings.profile.confirmPassword')}
                className="form-input mt-1 w-full"
              />
            </div>
            <div className="flex justify-end mt-4">
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

      {/* Delete Account */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaUserShield className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.legal.deleteAccount')}</h3>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.legal.deleteAccountDescription')}
        </p>
        
        <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
          {t('settings.legal.deleteAccount')}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings; 