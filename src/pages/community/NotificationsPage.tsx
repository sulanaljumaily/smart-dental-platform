import React, { useEffect, useMemo, useState } from 'react';
import { useCommunityContext, COMMUNITY_NOTIFICATION_TYPES } from '../../contexts/CommunityContext';
import { ArrowRight, Bell, Check, Heart, MessageCircle, UserPlus, Info, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';

const COMMUNITY_ALLOWED_SET = new Set<string>(COMMUNITY_NOTIFICATION_TYPES);

export const NotificationsPage: React.FC = () => {
    const { notifications, markAllNotificationsAsRead, markNotificationAsRead } = useCommunityContext();
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<'all' | 'follow' | 'comment' | 'like' | 'events'>('all');

    // Strictly ensure ONLY community notifications are shown here
    const communityOnlyNotifications = useMemo(() => {
        return (notifications || []).filter((n) => COMMUNITY_ALLOWED_SET.has(String(n.type || '')));
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        return communityOnlyNotifications.filter((n) => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'follow') return n.type === 'follow';
            if (activeFilter === 'comment') return n.type === 'comment' || n.type === 'reply';
            if (activeFilter === 'like') return n.type === 'like';
            if (activeFilter === 'events') return n.type === 'course_new' || n.type === 'webinar_new';
            return true;
        });
    }, [communityOnlyNotifications, activeFilter]);

    // Auto-mark visible unread community notifications as read upon opening & viewing
    useEffect(() => {
        const hasUnread = communityOnlyNotifications.some((n) => !n.isRead);
        if (!hasUnread) return;
        const timer = setTimeout(() => {
            markAllNotificationsAsRead();
        }, 800);
        return () => clearTimeout(timer);
    }, [communityOnlyNotifications.length, markAllNotificationsAsRead]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return <Heart className="w-5 h-5 text-red-500 fill-current" />;
            case 'comment':
            case 'reply': return <MessageCircle className="w-5 h-5 text-blue-500" />;
            case 'follow': return <UserPlus className="w-5 h-5 text-purple-500" />;
            case 'course_new':
            case 'webinar_new': return <Calendar className="w-5 h-5 text-orange-500" />;
            case 'group_request':
            case 'group_approve': return <Info className="w-5 h-5 text-indigo-500" />;
            default: return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    const handleClick = (notification: any) => {
        if (!notification.isRead) {
            markNotificationAsRead(notification.id);
        }
        if (notification.link) navigate(notification.link);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/community?tab=profile')}
                        className="bg-white p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">إشعارات المجتمع</h1>
                        <p className="text-xs text-gray-500 mt-0.5">المتابعات والتعليقات والإعجابات والدورات العلمية</p>
                    </div>
                    <div className="flex-1" />
                    {communityOnlyNotifications.some((n) => !n.isRead) && (
                        <Button
                            onClick={markAllNotificationsAsRead}
                            className="bg-white text-blue-600 border border-blue-100 hover:bg-blue-50"
                        >
                            <Check className="w-4 h-4 ml-2" />
                            تحديد الكل كمقروء
                        </Button>
                    )}
                </div>

                {/* Community Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                    {[
                        { id: 'all', label: 'الكل' },
                        { id: 'follow', label: 'المتابعات' },
                        { id: 'comment', label: 'التعليقات' },
                        { id: 'like', label: 'الإعجابات' },
                        { id: 'events', label: 'الدورات والندوات' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveFilter(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                activeFilter === tab.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
                    {filteredNotifications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {filteredNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`p-5 md:p-6 hover:bg-gray-50 cursor-pointer transition-colors flex gap-4 ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={n.actorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.actorName || 'S')}&background=random`}
                                            alt={n.actorName}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm text-xs border border-gray-100">
                                            {getIcon(n.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <p className="text-gray-900 text-sm md:text-base">
                                                <span className="font-bold">{n.actorName}</span>{' '}
                                                <span className="text-gray-700">{n.content}</span>
                                            </p>
                                            {!n.isRead && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>}
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">
                                            {new Date(n.createdAt).toLocaleDateString('ar-EG', {
                                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Bell className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد إشعارات مجتمعية</h3>
                            <p className="text-gray-500">سوف تظهر هنا المتابعات والتعليقات والإعجابات والدورات الجديدة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
