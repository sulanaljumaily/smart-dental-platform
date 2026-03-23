import React from 'react';
import { useCommunity } from '../../../hooks/useCommunity';
import { useAuth } from '../../../contexts/AuthContext';
import {
    Bookmark, Calendar, MessageSquare,
    Users, Award, ChevronLeft, Bell, Video, BookOpen,
    CheckCircle, Briefcase, MapPin, Grid, ArrowRight, User, UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Card';

export const ProfileTab: React.FC = () => {
    const { savedItems, groups, friends } = useCommunity();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = React.useState(false);

    // Notification Type Definition
    type NotificationType = 'like' | 'comment' | 'follow' | 'message' | 'course' | 'webinar' | 'reply' | 'group_approval';

    interface CommunityNotification {
        id: string;
        type: NotificationType;
        title: string;
        message: string;
        time: string;
        read: boolean;
        targetId?: string; // ID of post, user, course, etc.
        avatar?: string;
    }

    // Interactive Handler
    const handleNotificationClick = (notif: CommunityNotification) => {
        switch (notif.type) {
            case 'like':
            case 'comment':
            case 'reply':
                navigate(`/community/posts/${notif.targetId}`); // Go to Post
                break;
            case 'follow':
                navigate(`/community/user/${notif.targetId}`); // Go to User Profile
                break;
            case 'message':
                navigate(`/community/messages/${notif.targetId}`); // Go to Messages
                break;
            case 'course':
                navigate(`/community/courses/${notif.targetId}`); // Go to Course
                break;
            case 'webinar':
                navigate(`/community/webinars/${notif.targetId}`); // Go to Webinar
                break;
            case 'group_approval':
                navigate(`/community/groups/${notif.targetId}`); // Go to Group
                break;
            default:
                break; // Do nothing
        }
        setShowNotifications(false);
    };

    // Enhanced Mock Data
    const notifications: CommunityNotification[] = [
        { id: '1', type: 'like', title: 'إعجاب جديد', message: 'حصل منشورك على 150 إعجاب', time: 'منذ 5 دقائق', read: false, targetId: 'post-123', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' },
        { id: '2', type: 'comment', title: 'تعليق جديد', message: 'علق د. أحمد علي: "معلومات قيمة جداً شكراً لك"', time: 'منذ 15 دقيقة', read: false, targetId: 'post-123', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100' },
        { id: '3', type: 'follow', title: 'متابع جديد', message: 'لقد تابعك د. سارة محمد', time: 'منذ ساعة', read: true, targetId: 'user-456', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
        { id: '4', type: 'message', title: 'رسالة جديدة', message: 'رسالة من د. علي: "هل يمكنك إرسال الملف؟"', time: 'منذ ساعتين', read: true, targetId: 'convo-789', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
        { id: '5', type: 'course', title: 'دورة مقترحة', message: 'دورة جديدة قد تهمك: "تقنيات زراعة الأسنان المتقدمة"', time: 'أمس', read: false, targetId: 'course-101', avatar: undefined },
        { id: '6', type: 'webinar', title: 'ندوة قادمة', message: 'ندوة جديدة قد تهمك: "مستقبل طب الأسنان الرقمي"', time: 'أمس', read: false, targetId: 'web-202', avatar: undefined },
        { id: '7', type: 'reply', title: 'رد على تعليق', message: 'ورد رد على تعليقك في منشور د. ياسر', time: 'منذ يومين', read: true, targetId: 'post-999', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
        { id: '8', type: 'group_approval', title: 'موافقة انضمام', message: 'تمت الموافقة على انضمامك لمجموعة "أطباء كربلاء"', time: 'منذ 3 أيام', read: true, targetId: 'group-555', avatar: undefined },
    ];

    // Stats
    const activeGroups = groups.filter(g => g.isJoined).length;

    // Mock counts for now 
    const registeredCourses = 3;
    const registeredWebinars = 2;

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 pb-24">

            {/* Header / Title */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">لوحة التحكم</h2>
                    <p className="text-gray-500 text-sm font-medium">مرحباً بك، دكتور {user?.name?.split(' ')[0]}</p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors relative z-50"
                    >
                        <Bell className="w-5 h-5 text-gray-600" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>

                    {/* Notifications Popup - Fixed Mobile Positioning */}
                    {showNotifications && (
                        <>
                            {/* Backdrop for mobile */}
                            <div
                                className="fixed inset-0 bg-black/5 z-40 md:hidden"
                                onClick={() => setShowNotifications(false)}
                            />

                            <div className={`
                                z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 
                                animate-in fade-in slide-in-from-top-2
                                
                                /* Mobile: Fixed Positioning (Centered Top) */
                                fixed inset-x-4 top-24
                                
                                /* Desktop: Absolute Positioning (Dropdown) */
                                md:absolute md:inset-x-auto md:top-full md:mt-3 md:w-96 md:left-0 md:bg-white
                            `}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900">إشعارات المجتمع</h3>
                                    <button className="text-xs text-blue-600 hover:underline">تحديد الكل كمقروء</button>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-200">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`flex gap-3 items-start p-3 rounded-xl transition-all cursor-pointer hover:bg-gray-50 ${!notif.read ? 'bg-blue-50/50' : 'bg-white'}`}
                                        >
                                            {/* Icon/Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-100 overflow-hidden ${!notif.read ? 'ring-2 ring-blue-100' : ''}`}>
                                                {notif.avatar ? (
                                                    <img src={notif.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    // Fallback Icons based on type
                                                    <div className={`w-full h-full flex items-center justify-center ${notif.type === 'like' ? 'bg-red-50 text-red-500' :
                                                        notif.type === 'course' ? 'bg-indigo-50 text-indigo-500' :
                                                            notif.type === 'webinar' ? 'bg-purple-50 text-purple-500' :
                                                                notif.type === 'group_approval' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {notif.type === 'like' && <Award className="w-5 h-5" />}
                                                        {(notif.type === 'course' || notif.type === 'webinar') && <BookOpen className="w-5 h-5" />}
                                                        {notif.type === 'group_approval' && <CheckCircle className="w-5 h-5" />}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 font-bold leading-tight mb-0.5">{notif.title}</p>
                                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{notif.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                                    {notif.time}
                                                    {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => navigate('/community/notifications')}
                                    className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                                >
                                    عرض كل الإشعارات
                                    <ArrowRight className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MASONRY GRID DASHBOARD */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-max">

                {/* 1. IDENTITY CARD (Full Width on Mobile, Col-span-2 on Desktop) */}
                <div
                    onClick={() => navigate(user?.id ? `/community/user/${user.id}` : '/doctor/profile')}
                    className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                >
                    {/* Decor */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>

                    <div className="relative z-10 flex items-center gap-5">
                        <div className="relative">
                            <img
                                src={user?.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'}
                                className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover bg-gray-100"
                                alt="Profile"
                            />
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white">
                                <CheckCircle className="w-3 h-3 fill-current" />
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xl font-black text-gray-900 mb-1">{user?.name || 'د. محمد علي'}</h3>
                            <p className="text-gray-500 text-sm font-medium mb-2">{user?.role === 'doctor' ? 'طبيب أسنان • جراحة وجه وفكين' : user?.role}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-400 font-bold">
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {friends.length} متابع</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> بغداد</span>
                            </div>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* 2. MESSAGES (Col-span-1) */}
                <div
                    onClick={() => navigate('/community/messages')}
                    className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group h-48"
                >
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-lg">5 جديد</span>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900 mb-1">الرسائل</div>
                        <div className="text-xs text-gray-500 font-bold">لديك 5 رسائل غير مقروءة</div>
                    </div>
                </div>

                {/* 3. GROUPS (Col-span-1) */}
                <div
                    onClick={() => navigate('/community?tab=groups')}
                    className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group h-48"
                >
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900 mb-1">المجموعات</div>
                        <div className="text-xs text-gray-500 font-bold">{activeGroups} مجموعة نشطة</div>
                    </div>
                </div>

                {/* 4. MY LEARNING (Wide Card - 2x1) */}
                <div
                    onClick={() => navigate('/community/learning')}
                    className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-lg">تعليمي</h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">{registeredCourses + registeredWebinars} دورات وندوات مسجلة</p>
                        </div>
                    </div>
                    <div className="flex -space-x-3 space-x-reverse pl-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200" />
                        ))}
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">+2</div>
                    </div>
                </div>

                {/* 5. SAVED ITEMS (Col-span-1) */}
                <div
                    onClick={() => navigate('/community/saved')}
                    className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group h-48"
                >
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                        <Bookmark className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900 mb-1">المحفوظات</div>
                        <div className="text-xs text-gray-500 font-bold">{savedItems.length} عنصر محفوظ</div>
                    </div>
                </div>

                {/* 6. QUICK ACTION (Col-span-1) */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between h-48 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="font-bold text-lg leading-tight mb-1">دعوة صديق</div>
                        <div className="text-xs text-gray-400">ارسل دعوة لزملائك</div>
                    </div>
                </div>

            </div>

        </div>
    );
};
