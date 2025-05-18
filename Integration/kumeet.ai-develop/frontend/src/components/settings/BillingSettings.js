import React, { useState } from 'react';
import { FaCreditCard, FaCheck, FaExclamationTriangle, FaFileInvoiceDollar, FaChartBar, FaArrowUp, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// PlanDetailsModal component
const PlanDetailsModal = ({ isOpen, onClose, plan }) => {
  const { t } = useTranslation();
  
  if (!isOpen || !plan) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('settings.billing.subscriptionDetails')} - {t(`settings.billing.plans.${plan.id}.name`)}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t(`settings.billing.plans.${plan.id}.name`)}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {t(`settings.billing.plans.${plan.id}.description`)}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan.price} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/ {t('settings.billing.monthlySubscription')}</span>
            </p>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('settings.billing.planFeatures')}:</h4>
            <ul className="space-y-2">
              {Object.keys(t(`settings.billing.plans.${plan.id}.features`, { returnObjects: true })).map((key) => (
                <li key={key} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                  <FaCheck className="text-green-500 mr-2 mt-1" size={10} />
                  <span>{t(`settings.billing.plans.${plan.id}.features.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BillingSettings = () => {
  const { t } = useTranslation();
  
  // Billing state
  const [currentPlan, setCurrentPlan] = useState({
    id: 'pro',
    name: 'Pro',
    price: '$15',
    billingCycle: 'monthly',
    features: [
      'Unlimited meetings',
      'Advanced AI summaries',
      'Action item tracking',
      'Calendar integrations',
      'Team collaboration',
    ],
    nextBillingDate: 'June 15, 2024',
  });

  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 'card-1',
      type: 'Visa',
      last4: '4242',
      expiry: '05/25',
      isDefault: true,
    },
  ]);

  const [invoices, setInvoices] = useState([
    {
      id: 'inv-001',
      date: 'May 15, 2024',
      amount: '$15.00',
      status: 'Paid',
    },
    {
      id: 'inv-002',
      date: 'April 15, 2024',
      amount: '$15.00',
      status: 'Paid',
    },
    {
      id: 'inv-003',
      date: 'March 15, 2024',
      amount: '$15.00',
      status: 'Paid',
    },
  ]);

  const [usageStats, setUsageStats] = useState({
    meetingsThisMonth: 12,
    meetingMinutes: 360,
    actionItems: 45,
    transcriptionMinutes: 240,
  });

  const [notification, setNotification] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvc: '',
  });

  // Available plans
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$0',
      billingCycle: 'monthly',
      features: [
        '5 meetings per month',
        'Basic AI summaries',
        'Action item tracking',
      ],
      recommended: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$15',
      billingCycle: 'monthly',
      features: [
        'Unlimited meetings',
        'Advanced AI summaries',
        'Action item tracking',
        'Calendar integrations',
        'Team collaboration',
      ],
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$49',
      billingCycle: 'monthly',
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated support',
        'SSO & advanced security',
      ],
      recommended: false,
    },
  ];

  // Handle plan change
  const handlePlanChange = (planId) => {
    const selectedPlan = plans.find(plan => plan.id === planId);
    if (selectedPlan) {
      setCurrentPlan(selectedPlan);
      showNotification(t('settings.billing.planUpdated'), 'success');
    }
  };

  // Handle add payment method
  const handleAddPaymentMethod = (e) => {
    e.preventDefault();
    
    // Here you would integrate with a payment processor like Stripe
    // For demo purposes, we'll just add a mock card
    
    const newPaymentMethod = {
      id: `card-${paymentMethods.length + 1}`,
      type: 'Mastercard',
      last4: '5678',
      expiry: newCard.expiry,
      isDefault: false,
    };
    
    setPaymentMethods([...paymentMethods, newPaymentMethod]);
    setShowAddCard(false);
    setNewCard({
      cardNumber: '',
      cardName: '',
      expiry: '',
      cvc: '',
    });
    
    showNotification(t('settings.billing.paymentMethodAdded'), 'success');
  };

  // Handle set default payment method
  const handleSetDefaultPaymentMethod = (id) => {
    const updatedPaymentMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id,
    }));
    
    setPaymentMethods(updatedPaymentMethods);
    showNotification(t('settings.billing.defaultPaymentMethodUpdated'), 'success');
  };

  // Handle remove payment method
  const handleRemovePaymentMethod = (id) => {
    const updatedPaymentMethods = paymentMethods.filter(method => method.id !== id);
    setPaymentMethods(updatedPaymentMethods);
    showNotification(t('settings.billing.paymentMethodRemoved'), 'success');
  };

  // Handle download invoice
  const handleDownloadInvoice = (id) => {
    // Here you would generate and download the invoice
    showNotification(t('settings.billing.invoiceDownloaded'), 'success');
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle card input change
  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    setNewCard({
      ...newCard,
      [name]: value,
    });
  };

  // Plan details modal state
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState(null);
  const [isPlanDetailsModalOpen, setIsPlanDetailsModalOpen] = useState(false);
  
  const openPlanDetailsModal = (plan) => {
    setSelectedPlanForDetails(plan);
    setIsPlanDetailsModalOpen(true);
  };
  
  const closePlanDetailsModal = () => {
    setIsPlanDetailsModalOpen(false);
    setSelectedPlanForDetails(null);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.billing.title')}</h2>
      
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
      
      {/* Current Plan */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaCreditCard className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.billing.currentPlan')}</h3>
        </div>
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{t(`settings.billing.plans.${currentPlan.id || 'pro'}.name`)}</h4>
              <p className="text-gray-600 dark:text-gray-400">
                {currentPlan.price} / {currentPlan.billingCycle === 'monthly' ? 
                  t('settings.billing.monthlySubscription') : 
                  t('settings.billing.annualSubscription')}
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm">
              {t('settings.billing.active')}
            </span>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.billing.nextBillingDate')} <span className="font-medium text-gray-900 dark:text-white">{currentPlan.nextBillingDate}</span>
            </p>
          </div>
          
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('settings.billing.planFeatures')}:</h5>
            <ul className="space-y-1">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <FaCheck className="text-green-500 mr-2" size={12} />
                  {t(`settings.billing.plans.${currentPlan.id || 'pro'}.features.${index}`, { defaultValue: feature })}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              {t('settings.billing.manageSubscription')}
            </button>
          </div>
        </div>
        
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.billing.availablePlans')}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white dark:bg-gray-800 border rounded-lg p-4 relative flex flex-col min-h-[400px] ${
                plan.id === currentPlan.id 
                  ? 'border-purple-500 dark:border-purple-400' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
                  {t('settings.billing.recommended')}
                </div>
              )}
              
              <div className="mb-4">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t(`settings.billing.plans.${plan.id}.name`)}</h5>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.price} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/ {plan.billingCycle === 'monthly' ? 
                    t('settings.billing.monthlySubscription') : 
                    t('settings.billing.annualSubscription')}</span>
                </p>
              </div>
              
              <div className="flex-grow mb-6">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                      <FaCheck className="text-green-500 mr-2 mt-1" size={10} />
                      <span>{t(`settings.billing.plans.${plan.id}.features.${index}`, { defaultValue: feature })}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto">
                <div className="mb-4 text-center">
                  <button 
                    onClick={() => openPlanDetailsModal(plan)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm inline-block"
                  >
                    {t('settings.billing.viewDetails')}
                  </button>
                </div>
                
                {plan.id === currentPlan.id ? (
                  <button 
                    className="w-full py-2 border border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 rounded-md font-medium"
                    disabled
                  >
                    {t('settings.billing.currentPlan')}
                  </button>
                ) : (
                  <button 
                    onClick={() => handlePlanChange(plan.id)}
                    className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                  >
                    {plan.id === 'basic' ? t('settings.billing.downgrade') : t('settings.billing.upgrade')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Plan Details Modal */}
      <PlanDetailsModal 
        isOpen={isPlanDetailsModalOpen}
        onClose={closePlanDetailsModal}
        plan={selectedPlanForDetails}
      />
      
      {/* Usage Statistics */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaChartBar className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.billing.usageStats.title')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.billing.usageStats.meetingsThisMonth')}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.meetingsThisMonth}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>{t('settings.billing.usageStats.increaseFromLastMonth', { percentage: 20 })}</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.billing.usageStats.meetingMinutes')}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.meetingMinutes}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>{t('settings.billing.usageStats.increaseFromLastMonth', { percentage: 15 })}</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.billing.usageStats.actionItems')}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.actionItems}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>{t('settings.billing.usageStats.increaseFromLastMonth', { percentage: 30 })}</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('settings.billing.usageStats.transcriptionMinutes')}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.transcriptionMinutes}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>{t('settings.billing.usageStats.increaseFromLastMonth', { percentage: 10 })}</span>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <a href="#" className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium">
            {t('settings.billing.usageStats.viewAnalytics')}
          </a>
        </div>
      </div>
      
      {/* Payment Methods */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaCreditCard className="text-gray-700 dark:text-gray-300 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.billing.paymentMethods')}</h3>
          </div>
          <button 
            onClick={() => setShowAddCard(true)} 
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {t('settings.billing.addPaymentMethod')}
          </button>
        </div>
        
        {showAddCard && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-5 mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.billing.cardInformation')}</h4>
            
            <form onSubmit={handleAddPaymentMethod}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="card-number">
                    {t('settings.billing.cardNumber')}
                  </label>
                  <input 
                    type="text" 
                    id="card-number" 
                    name="cardNumber"
                    value={newCard.cardNumber}
                    onChange={handleCardInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="card-name">
                    {t('settings.billing.nameOnCard')}
                  </label>
                  <input 
                    type="text" 
                    id="card-name" 
                    name="cardName"
                    value={newCard.cardName}
                    onChange={handleCardInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="card-expiry">
                    {t('settings.billing.expiryDate')}
                  </label>
                  <input 
                    type="text" 
                    id="card-expiry" 
                    name="expiry"
                    value={newCard.expiry}
                    onChange={handleCardInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="MM/YY"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="card-cvc">
                    {t('settings.billing.cvc')}
                  </label>
                  <input 
                    type="text" 
                    id="card-cvc" 
                    name="cvc"
                    value={newCard.cvc}
                    onChange={handleCardInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="123"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddCard(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  {t('settings.billing.saveCard')}
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div 
              key={method.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="mr-3">
                  {method.type === 'Visa' ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">VISA</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-semibold">MC</span>
                  )}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white">•••• •••• •••• {method.last4}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.billing.expires')} {method.expiry}
                    {method.isDefault && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-0.5 rounded-full">
                        {t('settings.billing.default')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!method.isDefault && (
                  <button 
                    onClick={() => handleSetDefaultPaymentMethod(method.id)}
                    className="px-3 py-1 text-xs text-purple-600 dark:text-purple-400 border border-purple-600 dark:border-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900"
                  >
                    {t('settings.billing.makeDefault')}
                  </button>
                )}
                <button 
                  onClick={() => handleRemovePaymentMethod(method.id)}
                  className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900"
                >
                  {t('settings.billing.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Billing History */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaFileInvoiceDollar className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.billing.billingHistory')}</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 text-sm">
                <th className="pb-3">{t('settings.billing.date')}</th>
                <th className="pb-3">{t('settings.billing.amount')}</th>
                <th className="pb-3">{t('settings.billing.status')}</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-200 dark:border-gray-600">
                  <td className="py-3 text-gray-900 dark:text-white">{invoice.date}</td>
                  <td className="py-3 text-gray-900 dark:text-white">{invoice.amount}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      invoice.status === 'Paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    }`}>
                      {invoice.status === 'Paid' ? t('settings.billing.paid') : t('settings.billing.pending')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button 
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm"
                    >
                      {t('settings.billing.download')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings; 