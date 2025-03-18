import React, { useState } from 'react';
import { FaCreditCard, FaCheck, FaExclamationTriangle, FaFileInvoiceDollar, FaChartBar, FaArrowUp } from 'react-icons/fa';

const BillingSettings = () => {
  // Billing state
  const [currentPlan, setCurrentPlan] = useState({
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
      showNotification(`Your plan has been updated to ${selectedPlan.name}`, 'success');
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
    
    showNotification('Payment method added successfully', 'success');
  };

  // Handle set default payment method
  const handleSetDefaultPaymentMethod = (id) => {
    const updatedPaymentMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id,
    }));
    
    setPaymentMethods(updatedPaymentMethods);
    showNotification('Default payment method updated', 'success');
  };

  // Handle remove payment method
  const handleRemovePaymentMethod = (id) => {
    const updatedPaymentMethods = paymentMethods.filter(method => method.id !== id);
    setPaymentMethods(updatedPaymentMethods);
    showNotification('Payment method removed', 'success');
  };

  // Handle download invoice
  const handleDownloadInvoice = (id) => {
    // Here you would generate and download the invoice
    showNotification('Invoice downloaded', 'success');
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

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Billing & Subscription</h2>
      
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Plan</h3>
        </div>
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{currentPlan.name}</h4>
              <p className="text-gray-600 dark:text-gray-400">
                {currentPlan.price} / {currentPlan.billingCycle}
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm">
              Active
            </span>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your next billing date is <span className="font-medium text-gray-900 dark:text-white">{currentPlan.nextBillingDate}</span>
            </p>
          </div>
          
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Plan Features:</h5>
            <ul className="space-y-1">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <FaCheck className="text-green-500 mr-2" size={12} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              Manage Subscription
            </button>
          </div>
        </div>
        
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Available Plans</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white dark:bg-gray-800 border rounded-lg p-4 relative ${
                plan.id === currentPlan.id 
                  ? 'border-purple-500 dark:border-purple-400' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
                  Recommended
                </div>
              )}
              
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{plan.name}</h5>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plan.price} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/ {plan.billingCycle}</span>
              </p>
              
              <ul className="mb-4 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <FaCheck className="text-green-500 mr-2 mt-1" size={10} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {plan.id === currentPlan.id ? (
                <button 
                  className="w-full py-2 border border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400 rounded-md font-medium"
                  disabled
                >
                  Current Plan
                </button>
              ) : (
                <button 
                  onClick={() => handlePlanChange(plan.id)}
                  className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                >
                  {plan.id === 'basic' ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Usage Statistics */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-4">
          <FaChartBar className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Usage Statistics</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Meetings This Month</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.meetingsThisMonth}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>20% from last month</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Meeting Minutes</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.meetingMinutes}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>15% from last month</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Action Items</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.actionItems}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>30% from last month</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transcription Minutes</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usageStats.transcriptionMinutes}</p>
            <div className="flex items-center text-green-600 text-xs mt-2">
              <FaArrowUp className="mr-1" />
              <span>10% from last month</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
            View Detailed Analytics
          </button>
        </div>
      </div>
      
      {/* Payment Methods */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaCreditCard className="text-gray-700 dark:text-gray-300 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment Methods</h3>
          </div>
          <button 
            onClick={() => setShowAddCard(!showAddCard)}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
          >
            {showAddCard ? 'Cancel' : 'Add Payment Method'}
          </button>
        </div>
        
        {showAddCard && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg mb-6 border border-gray-200 dark:border-gray-600">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Payment Method</h4>
            
            <form onSubmit={handleAddPaymentMethod}>
              <div className="mb-4">
                <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name on Card
                </label>
                <input
                  type="text"
                  id="cardName"
                  name="cardName"
                  value={newCard.cardName}
                  onChange={handleCardInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  id="cardNumber"
                  name="cardNumber"
                  value={newCard.cardNumber}
                  onChange={handleCardInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1234 5678 9012 3456"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    id="expiry"
                    name="expiry"
                    value={newCard.expiry}
                    onChange={handleCardInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="MM/YY"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    id="cvc"
                    name="cvc"
                    value={newCard.cvc}
                    onChange={handleCardInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="123"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        )}
        
        {paymentMethods.length > 0 ? (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div 
                key={method.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-between items-center"
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {method.type === 'Visa' ? (
                      <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">VISA</div>
                    ) : (
                      <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">MC</div>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {method.type} ending in {method.last4}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Expires {method.expiry}
                      {method.isDefault && (
                        <span className="ml-2 text-green-600 dark:text-green-400">Default</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleRemovePaymentMethod(method.id)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
            <p className="text-gray-600 dark:text-gray-400">No payment methods added yet.</p>
          </div>
        )}
      </div>
      
      {/* Billing History */}
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <FaFileInvoiceDollar className="text-gray-700 dark:text-gray-300 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Billing History</h3>
        </div>
        
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {invoice.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {invoice.date}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {invoice.amount}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-xs">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
            <p className="text-gray-600 dark:text-gray-400">No billing history available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingSettings; 