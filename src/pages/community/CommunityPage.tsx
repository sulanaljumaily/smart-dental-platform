import React, { useState } from 'react';
import { LayoutDashboard, BookOpen, Users, UserPlus, User } from 'lucide-react';
import { OverviewTab } from './tabs/OverviewTab';
import { EducationTab } from './tabs/EducationTab';
import GroupsTab from './tabs/GroupsTab';
import { FriendsTab } from './tabs/FriendsTab';
import { ProfileTab } from './tabs/ProfileTab';

export const CommunityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'education' | 'groups' | 'friends' | 'profile'>('overview');

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'education', label: 'التعليم', icon: BookOpen },
    { id: 'groups', label: 'المجموعات', icon: Users },
    { id: 'friends', label: 'الأصدقاء', icon: UserPlus },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top)] transition-all duration-300">
        <div className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto no-scrollbar py-1.5 sm:py-2 px-1 sm:px-4 mask-linear-fade flex-nowrap justify-start lg:justify-center">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 group shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
                </div>
                <span className="font-medium text-[10px] sm:text-sm">{tab.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-sm animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Application Content */}
      <div className="max-w-3xl mx-auto min-h-[calc(100vh-120px)]">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'education' && <EducationTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'friends' && <FriendsTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>
    </div>
  );
};
