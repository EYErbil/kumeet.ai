import React from 'react';
import { FaFileContract, FaShieldAlt, FaCookieBite, FaUserShield } from 'react-icons/fa';

const LegalSettings = () => {
  // Legal documents
  const legalDocuments = [
    {
      id: 'terms',
      title: 'Terms and Conditions',
      icon: <FaFileContract />,
      description: 'The terms and conditions that govern your use of kumeet.ai',
      lastUpdated: 'May 1, 2024',
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: <FaShieldAlt />,
      description: 'How we collect, use, and protect your personal information',
      lastUpdated: 'May 1, 2024',
    },
    {
      id: 'cookies',
      title: 'Cookie Policy',
      icon: <FaCookieBite />,
      description: 'How we use cookies and similar technologies',
      lastUpdated: 'April 15, 2024',
    },
    {
      id: 'data-processing',
      title: 'Data Processing Agreement',
      icon: <FaUserShield />,
      description: 'How we process and protect your data in compliance with regulations',
      lastUpdated: 'April 10, 2024',
    },
  ];

  // Legal document card component
  const LegalDocumentCard = ({ title, icon, description, lastUpdated }) => {
    return (
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-3">
          <div className="text-xl text-gray-700 dark:text-gray-300 mr-3">{icon}</div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h4>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Last updated: {lastUpdated}</span>
          <a 
            href="#" 
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
          >
            View
          </a>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Legal Information</h2>
      
      {/* Legal Documents */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaFileContract className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Legal Documents</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Review our legal documents to understand your rights and responsibilities when using kumeet.ai.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {legalDocuments.map((document) => (
            <LegalDocumentCard
              key={document.id}
              title={document.title}
              icon={document.icon}
              description={document.description}
              lastUpdated={document.lastUpdated}
            />
          ))}
        </div>
      </div>
      
      {/* Data Export */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaUserShield className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Data Rights</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You have the right to access, export, or delete your personal data. Use the options below to manage your data.
        </p>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Export Your Data</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download a copy of all your personal data that we store, including your profile information, meetings, notes, and action items.
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              Request Data Export
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Delete Your Account</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalSettings; 