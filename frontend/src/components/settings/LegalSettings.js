import React from 'react';
import { FaFileContract, FaShieldAlt, FaCookieBite, FaUserShield } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const LegalSettings = () => {
  const { t } = useTranslation();
  
  // Legal documents
  const legalDocuments = [
    {
      id: 'terms',
      title: t('settings.legal.termsAndConditions'),
      icon: <FaFileContract />,
      description: t('settings.legal.termsDescription'),
      lastUpdated: 'May 1, 2024',
    },
    {
      id: 'privacy',
      title: t('settings.legal.privacyPolicy'),
      icon: <FaShieldAlt />,
      description: t('settings.legal.privacyDescription'),
      lastUpdated: 'May 1, 2024',
    },
    {
      id: 'cookies',
      title: t('settings.legal.cookiePolicy'),
      icon: <FaCookieBite />,
      description: t('settings.legal.cookieDescription'),
      lastUpdated: 'April 15, 2024',
    },
    {
      id: 'data-processing',
      title: t('settings.legal.dataProcessing'),
      icon: <FaUserShield />,
      description: t('settings.legal.dataProcessingDescription'),
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
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('settings.legal.lastUpdated')} {lastUpdated}</span>
          <a 
            href="#" 
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
          >
            {t('settings.legal.view')}
          </a>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.legal.title')}</h2>
      
      {/* Legal Documents */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaFileContract className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.legal.documents.title')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('settings.legal.documents.description')}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.legal.dataExport.title')}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('settings.legal.dataExport.description')}
        </p>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('settings.legal.dataExport.title')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.legal.dataExport.description')}
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              {t('settings.legal.dataExport.request')}
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('settings.legal.deleteAccount')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.legal.deleteAccountDescription')}
            </p>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              {t('settings.legal.deleteAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalSettings; 