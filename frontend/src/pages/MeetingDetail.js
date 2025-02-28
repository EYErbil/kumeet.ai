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
  FaRegCommentDots,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaUser,
  FaUsers,
  FaRegChartBar,
  FaMicrophone
} from 'react-icons/fa';

// Collapsible section component
const CollapsibleSection = ({ icon, title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 rounded-md mb-4 bg-white">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon}
          <h3 className="font-medium text-gray-800 ml-2">{title}</h3>
        </div>
        <FaChevronDown 
          className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </div>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// Tab component
const Tab = ({ label, active, icon, onClick }) => {
  return (
    <button
      className={`px-4 py-3 flex items-center ${
        active 
          ? 'border-b-2 border-purple-600 text-purple-600 font-medium' 
          : 'text-gray-600 hover:text-gray-800'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
};

// Assignment badge with user avatar
const AssignmentBadge = ({ user }) => {
  return (
    <div className="flex items-center mb-4">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 overflow-hidden">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-700">{user.name.charAt(0)}</span>
        )}
      </div>
      <span className="text-sm font-medium">{user.name}</span>
      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{user.count || 1}</span>
    </div>
  );
};

// Video participant
const VideoParticipant = ({ participant, active }) => {
  return (
    <div className={`relative rounded-lg overflow-hidden ${active ? 'border-2 border-purple-500' : ''}`}>
      {participant.videoUrl ? (
        <img src={participant.videoUrl} alt={participant.name} className="w-full h-full object-cover" />
      ) : (
        <div className="bg-gray-200 w-full h-32 flex items-center justify-center">
          <FaUser size={24} className="text-gray-400" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white text-sm">
        {participant.name}
      </div>
    </div>
  );
};

const MeetingDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Sample meeting data
  const meeting = {
    id: 2,
    title: 'Weekly dev sync',
    date: 'Mon, April 29, 2024',
    time: '3:00 PM - 4:00 PM (60m)',
    participants: [
      { id: 1, name: 'Sarah Lee', role: 'UI Designer', videoUrl: null },
      { id: 2, name: 'John Doe', role: 'Team Leader', videoUrl: null },
      { id: 3, name: 'Alex Brown', role: 'QA Engineer', videoUrl: null },
      { id: 4, name: 'Michael Johnson', role: 'Frontend Developer', videoUrl: null },
      { id: 5, name: 'Jane Smith', role: 'Backend Developer', videoUrl: null }
    ],
    overview: 'The team discussed project progress, highlighting near-completion of backend and frontend development. They addressed challenges in integrating a third-party API. Action items include finalizing authentication, UI designs, and testing. Next step: mid-week progress check-in.',
    keyPoints: {
      projectProgress: [
        'Backend development progressing well, with significant contributions from Jane Smith.',
        'Frontend dashboard redesign nearing completion, ready for testing.',
        'Positive feedback received on UI designs by Sarah Lee.'
      ],
      challengesFaced: [
        'Difficulty integrating a third-party API for geolocation services.',
        'Discussion on potential solutions and collaborative efforts to overcome this obstacle.'
      ]
    },
    actionItems: [
      { user: { name: 'Jane', avatar: null }, task: 'Backend development tasks (authentication)' },
      { user: { name: 'Michael', avatar: null }, task: 'Frontend implementation tasks' }
    ],
    nextSteps: [
      'Mid-week check-in scheduled to review progress and address any emerging issues.',
      'Clear roadmap established for the week ahead, ensuring continued collaboration and project momentum.'
    ],
    speakerStats: [
      { user: 'John Doe', role: 'Team Leader', words: 182, talkTime: '28m', talkPercentage: 47, listenPercentage: 53 },
      { user: 'Alex Brown', role: 'QA Engineer', words: 194, talkTime: '15m', talkPercentage: 25, listenPercentage: 75 },
      { user: 'Michael Johnson', role: 'Frontend Developer', words: 172, talkTime: '6m', talkPercentage: 10, listenPercentage: 90 }
    ]
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center mb-4">
          <Link to="/meetings" className="text-gray-500 hover:text-gray-700 mr-4">
            <FaChevronLeft />
          </Link>
          <h1 className="text-xl font-semibold flex-1">{meeting.title}</h1>
          <button className="text-gray-600 hover:text-gray-800 mx-2">
            <FaShareAlt />
          </button>
          <button className="text-gray-600 hover:text-gray-800 mx-2">
            <FaEllipsisH />
          </button>
        </div>
        
        {/* Meeting details */}
        <div className="flex items-center text-sm text-gray-500 mb-6">
          <span className="mr-4">{meeting.date}</span>
          <span>{meeting.time}</span>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
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
            icon={<FaRegCommentDots size={14} />} 
            label="Snippets" 
            active={activeTab === 'snippets'} 
            onClick={() => setActiveTab('snippets')} 
          />
        </div>
        
        {/* Summary content */}
        {activeTab === 'summary' && (
          <div>
            {/* Overview section */}
            <CollapsibleSection icon={<FaFileAlt className="text-gray-500" />} title="Overview">
              <p className="text-gray-700">{meeting.overview}</p>
            </CollapsibleSection>
            
            {/* Key points section */}
            <CollapsibleSection icon={<FaList className="text-gray-500" />} title="Key points">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Project progress</h4>
                  <ul className="space-y-3">
                    {meeting.keyPoints.projectProgress.map((point, index) => (
                      <li key={index} className="flex">
                        <span className="text-purple-600 mr-2">■</span>
                        <span className="text-gray-700 text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Challenges faced</h4>
                  <ul className="space-y-3">
                    {meeting.keyPoints.challengesFaced.map((challenge, index) => (
                      <li key={index} className="flex">
                        <span className="text-purple-600 mr-2">■</span>
                        <span className="text-gray-700 text-sm">{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CollapsibleSection>
            
            {/* Action items section */}
            <CollapsibleSection icon={<FaList className="text-gray-500" />} title="Action items">
              <div className="grid grid-cols-2 gap-6">
                {meeting.actionItems.map((item, idx) => (
                  <div key={idx}>
                    <AssignmentBadge user={item.user} />
                    <ul className="ml-10">
                      <li className="flex">
                        <span className="text-purple-600 mr-2">■</span>
                        <span className="text-gray-700 text-sm">{item.task}</span>
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
            
            {/* Next steps section */}
            <CollapsibleSection icon={<FaList className="text-gray-500" />} title="Next steps">
              <ul className="space-y-3">
                {meeting.nextSteps.map((step, index) => (
                  <li key={index} className="flex">
                    <span className="text-purple-600 mr-2">■</span>
                    <span className="text-gray-700 text-sm">{step}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          </div>
        )}
        
        {/* Other tab contents would go here */}
        {activeTab === 'transcript' && (
          <div className="text-center p-8 text-gray-500">
            <p>Transcript content will appear here</p>
          </div>
        )}
        
        {activeTab === 'notes' && (
          <div className="text-center p-8 text-gray-500">
            <p>Notes content will appear here</p>
          </div>
        )}
        
        {activeTab === 'snippets' && (
          <div className="text-center p-8 text-gray-500">
            <p>Snippets content will appear here</p>
          </div>
        )}
      </div>
      
      {/* Right panel - Video and controls */}
      <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
        {/* Video grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {meeting.participants.slice(0, 4).map((participant, idx) => (
              <VideoParticipant 
                key={idx} 
                participant={participant} 
                active={idx === 0} 
              />
            ))}
          </div>
        </div>
        
        {/* Timeline and controls */}
        <div className="p-4 border-t border-gray-200">
          {/* Timeline */}
          <div className="mb-4">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '40%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0:00</span>
              <span>59:48</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-6 mb-6">
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
              {isMuted ? (
                <FaVolumeMute onClick={() => setIsMuted(false)} />
              ) : (
                <FaVolumeUp onClick={() => setIsMuted(true)} />
              )}
            </button>
            
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
              <span className="text-xs">1x</span>
            </button>
            
            <button className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700">
              {isPlaying ? (
                <FaPause onClick={() => setIsPlaying(false)} />
              ) : (
                <FaPlay onClick={() => setIsPlaying(true)} />
              )}
            </button>
            
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Participants and analytics */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button className="flex-1 py-2 px-4 text-sm text-center flex items-center justify-center text-purple-600 border-b-2 border-purple-600 font-medium">
              <FaUsers size={14} className="mr-2" /> Speakers
            </button>
            <button className="flex-1 py-2 px-4 text-sm text-center flex items-center justify-center text-gray-600 hover:text-gray-800">
              <FaRegChartBar size={14} className="mr-2" /> AI Filters
            </button>
            <button className="flex-1 py-2 px-4 text-sm text-center flex items-center justify-center text-gray-600 hover:text-gray-800">
              <FaMicrophone size={14} className="mr-2" /> Topics
            </button>
          </div>
          
          {/* Participants list */}
          <div>
            <div className="flex justify-between items-center mb-3 text-sm text-gray-500">
              <div className="w-1/3">Participants <span className="bg-gray-200 rounded-full px-1.5">{meeting.speakerStats.length}</span></div>
              <div className="w-1/6 text-center">WPM</div>
              <div className="w-1/6 text-center">Talk time</div>
              <div className="w-1/3 text-center">Talk %</div>
            </div>
            
            {meeting.speakerStats.map((speaker, idx) => (
              <div key={idx} className="flex items-center py-3 border-b border-gray-100">
                <div className="w-1/3 flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center overflow-hidden">
                    <span className="text-gray-700">{speaker.user.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{speaker.user}</div>
                    <div className="text-xs text-gray-500">{speaker.role}</div>
                  </div>
                </div>
                <div className="w-1/6 text-center">{speaker.words}</div>
                <div className="w-1/6 text-center">{speaker.talkTime}</div>
                <div className="w-1/3 px-2">
                  <div className="flex items-center">
                    <span className="text-xs w-8 text-right mr-2">{speaker.talkPercentage}%</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${speaker.talkPercentage}%` }}></div>
                    </div>
                    <span className="text-xs w-8 text-left ml-2">{speaker.listenPercentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;