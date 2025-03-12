import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  FaChevronLeft, 
  FaShareAlt, 
  FaEllipsisH,
  FaChevronDown,
  FaFileAlt,
  FaList,
  FaStickyNote,
  FaChartBar,
  FaUser
} from 'react-icons/fa';

// Collapsible section component
const CollapsibleSection = ({ icon, title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md mb-4 bg-white dark:bg-gray-800">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon}
          <h3 className="font-medium text-gray-800 dark:text-white ml-2">{title}</h3>
        </div>
        <FaChevronDown 
          className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </div>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

// Tab component
const Tab = ({ icon, label, active, onClick }) => {
  return (
    <button
      className={`px-4 py-3 flex items-center ${
        active 
          ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 font-medium' 
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
};

const MeetingDetail = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const { id } = useParams();

  // Sample meeting data
  const meetingData = {
    date: 'Mon, April 29, 2024',
    title: 'Weekly dev sync',
    time: '3:00 PM - 4:00 PM (60m)'
  };

  const { date, title, time } = meetingData;

  // Sample analytics data
  const speakerStats = [
    {
      name: 'John Doe',
      role: 'Team Leader',
      wpm: 182,
      talkTime: '28m',
      talkPercentage: 47,
      participationScore: 53
    },
    {
      name: 'Alex Brown',
      role: 'QA Engineer',
      wpm: 194,
      talkTime: '15m',
      talkPercentage: 25,
      participationScore: 75
    },
    {
      name: 'Michael Johnson',
      role: 'Frontend Developer',
      wpm: 172,
      talkTime: '6m',
      talkPercentage: 10,
      participationScore: 90
    }
  ];

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center mb-4">
            <Link to="/meetings" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              <FaChevronLeft size={16} />
            </Link>
            <div className="ml-4 flex-1">
              <div className="text-sm text-gray-500 dark:text-gray-400 ml-[2px]">{date}</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{title}</div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <FaShareAlt size={16} />
              </button>
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <FaEllipsisH size={16} />
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 ml-[calc(16px+1rem+2px)]">{time}</div>
        </div>
        
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <Tab 
            icon={<FaFileAlt size={14} />} 
            label="Summary" 
            active={activeTab === 'summary'} 
            onClick={() => setActiveTab('summary')} 
          />
          <Tab 
            icon={<FaList size={14} />} 
            label="Transcript" 
            active={activeTab === 'transcript'} 
            onClick={() => setActiveTab('transcript')} 
          />
          <Tab 
            icon={<FaStickyNote size={14} />} 
            label="Notes" 
            active={activeTab === 'notes'} 
            onClick={() => setActiveTab('notes')} 
          />
          <Tab 
            icon={<FaChartBar size={14} />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')} 
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <CollapsibleSection icon={<FaFileAlt size={16} className="text-gray-600 dark:text-gray-400" />} title="Overview">
              <p className="text-gray-700 dark:text-gray-300">
                The team discussed project progress, highlighting near-completion of backend and frontend development. 
                They addressed challenges in integrating a third-party API. Action items include finalizing authentication, 
                UI designs, and testing. Next step: mid-week progress check-in.
              </p>
            </CollapsibleSection>
            
            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Key points">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Project progress</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Backend development progressing well, with significant contributions from Jane Smith.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Frontend dashboard redesign nearing completion, ready for testing.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Positive feedback received on UI designs by Sarah Lee.</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Challenges faced</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Difficulty integrating a third-party API for geolocation services.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 mt-2 bg-purple-600 rounded-full mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">Discussion on potential solutions and collaborative efforts to overcome this obstacle.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection icon={<FaList size={16} className="text-gray-600 dark:text-gray-400" />} title="Action items">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">J</div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Jane</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Backend development tasks (authentication)</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">M</div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Michael</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Frontend implementation tasks</div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}
        
        {activeTab === 'transcript' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-700 dark:text-gray-300">Transcript content will be displayed here...</p>
          </div>
        )}
        
        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-700 dark:text-gray-300">Notes content will be displayed here...</p>
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Participation Analysis</h3>
                <div className="space-y-6">
                  {speakerStats.map((speaker, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FaUser className="text-gray-600 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{speaker.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{speaker.role}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{speaker.wpm} WPM</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{speaker.talkTime}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${speaker.talkPercentage}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{speaker.talkPercentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingDetail;