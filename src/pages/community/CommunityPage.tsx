import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LayoutDashboard, BookOpen, Users, UserPlus, User, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { OverviewTab } from './tabs/OverviewTab';
import { EducationTab } from './tabs/EducationTab';
import GroupsTab from './tabs/GroupsTab';
import { FriendsTab } from './tabs/FriendsTab';
import { ProfileTab } from './tabs/ProfileTab';

export const CommunityPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const rawTab = searchParams.get('tab') as 'overview' | 'education' | 'groups' | 'friends' | 'profile' || 'overview';
  const defaultTab = (!isAuthenticated && rawTab === 'profile') ? 'overview' : rawTab;
  const [activeTab, setActiveTab] = useState<'overview' | 'education' | 'groups' | 'friends' | 'profile'>(defaultTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'education', 'groups', 'friends', 'profile'].includes(tab)) {
      if (!isAuthenticated && tab === 'profile') {
        setActiveTab('overview');
      } else {
        setActiveTab(tab as any);
      }
    }
  }, [searchParams, isAuthenticated]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    setSearchParams(prev => {
      prev.set('tab', tabId);
      return prev;
    }, { replace: true });
  };

  const baseTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'education', label: 'التعليم', icon: BookOpen },
    { id: 'groups', label: 'المجموعات', icon: Users },
    { id: 'friends', label: 'الأصدقاء', icon: UserPlus },
  ];

  const tabs = isAuthenticated
    ? [...baseTabs, { id: 'profile', label: 'الملف الشخصي', icon: User }]
    : baseTabs;

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans w-full pb-20 md:pb-0" dir="rtl">
      <Helmet>
        <title>المجتمع الطبي لأطباء الأسنان | Dental Platform</title>
        <meta name="description" content="المجتمع الطبي التفاعلي لأطباء الأسنان — مقالات، نقاشات سريرية، دورات تدريبية، ونماذج ثلاثية الأبعاد." />
        <link rel="canonical" href="https://dental-platform.com/community" />
        <meta property="og:title" content="المجتمع الطبي لأطباء الأسنان | Dental Platform" />
        <meta property="og:description" content="المجتمع الطبي التفاعلي لأطباء الأسنان." />
        <meta property="og:url" content="https://dental-platform.com/community" />
      </Helmet>

      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm pt-[calc(env(safe-area-inset-top)*0.75)] transition-all duration-300">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-2 px-2 mask-linear-fade flex-nowrap justify-start lg:justify-center">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all duration-300 group shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
                </div>
                <span className="font-semibold text-[11px] sm:text-[13px] tracking-tight">{tab.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-sm animate-pulse" />
                )}
              </button>
            );
          })}

          {/* Login Button for Guests in Top Bar */}
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login')}
              className="relative flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-[11px] sm:text-[13px] shadow-sm hover:shadow-md hover:scale-105 transition-all shrink-0 whitespace-nowrap mr-auto sm:mr-2"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Application Content */}
      <div className="max-w-3xl mx-auto w-full flex-1 pt-4 pb-20">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'education' && <EducationTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'friends' && <FriendsTab />}
        {activeTab === 'profile' && isAuthenticated && <ProfileTab />}
      </div>
    </div>
  );
};

