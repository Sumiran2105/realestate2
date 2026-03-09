import React from 'react';

const RecentActivity = ({ role }) => {
  const activities = {
    agent: [
      { id: 1, action: 'New lead received', description: 'Rahul Sharma interested in 3BHK', time: '5 min ago', icon: '👥' },
      { id: 2, action: 'Property verified', description: 'Sunshine Apartments verification completed', time: '1 hour ago', icon: '✓' },
      { id: 3, action: 'Deal closed', description: '2BHK at Gachibowli - ₹85L', time: '3 hours ago', icon: '💰' },
      { id: 4, action: 'New rating received', description: '5 stars from Priya Patel', time: '5 hours ago', icon: '⭐' }
    ],
    user: [
      { id: 1, action: 'Saved search alert', description: '5 new properties in Gachibowli', time: '15 min ago', icon: '🔍' },
      { id: 2, action: 'Price drop', description: '3BHK in Hitech City reduced by ₹5L', time: '1 hour ago', icon: '📉' },
      { id: 3, action: 'Site visit scheduled', description: 'Sunrise Apartments tomorrow 4PM', time: '3 hours ago', icon: '📅' }
    ]
  };

  const currentActivities = activities[role] || activities.user;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {currentActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span>{activity.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{activity.action}</p>
              <p className="text-xs text-gray-600">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-800">
        View All Activity →
      </button>
    </div>
  );
};

export default RecentActivity;
