
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowRight, MapPin, Phone,
    UserPlus, Edit, CheckCircle, GraduationCap,
    Grid, Calendar, Shield, Users, User, X, MessageCircle, Loader2,
    Camera, Save, Building2, Briefcase, Stethoscope
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useCommunity } from '../../hooks/useCommunity';
import { useAuth } from '../../contexts/AuthContext';
import { PremiumPostCard } from './components/PremiumPostCard';
import { Modal } from '../../components/common/Modal';
import { NotificationPopover } from './components/NotificationPopover';
import { PostDetailModal } from './components/PostDetailModal';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export const UserProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { posts, banUser, likePost, toggleSave, isSaved, reportPost, updatePost, deletePost } = useCommunity();
    const { user: currentUser } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState<'posts'>('posts');
    const [showConnectionsModal, setShowConnectionsModal] = useState<'followers' | 'following' | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const postId = searchParams.get('postId');
    const selectedPost = postId ? posts.find(p => p.id === postId) : null;

    // Real Profile State
    const [profileData, setProfileData] = useState<any>(null);
    const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        bio: '',
        specialty: '',
        specialties: [] as string[],
        phone: '',
        address: '',
        university: '',
        graduation_year: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const isMe = currentUser?.id === id || id === 'me';
    const targetUserId = isMe ? currentUser?.id : id;

    // Fetch Profile from Supabase
    useEffect(() => {
        const fetchProfile = async () => {
            if (!targetUserId) return;
            try {
                setLoading(true);

                // 1. Fetch Profile
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', targetUserId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                setProfileData(profile);

                // 2. Fetch Stats
                const { count: friendsCount } = await supabase
                    .from('friendships')
                    .select('*', { count: 'exact', head: true })
                    .or(`user_id_1.eq.${targetUserId},user_id_2.eq.${targetUserId}`);

                const { count: postsCount } = await supabase
                    .from('community_posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', targetUserId);

                setStats({
                    followers: friendsCount || 0,
                    following: friendsCount || 0,
                    posts: postsCount || 0
                });

            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [targetUserId]);

    // Display fallback
    const displayUser = profileData || {
        full_name: 'مستخدم غير موجود',
        role: 'غير معروف',
        avatar_url: undefined,
        governorate: 'غير معروف',
        specialty: 'عام'
    };

    const userPosts = posts.filter(p => p.authorId === targetUserId);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }


    // --- Role Based Theme Helper ---
    const getRoleTheme = (role: string) => {
        switch (role) {
            case 'doctor':
                return {
                    primary: 'blue',
                    bg: 'bg-blue-50',
                    text: 'text-blue-700',
                    border: 'border-blue-100',
                    ring: 'ring-blue-50',
                    accent: 'bg-blue-600',
                    gradient: 'from-blue-500 to-blue-600'
                };
            case 'lab':
                return {
                    primary: 'orange',
                    bg: 'bg-orange-50',
                    text: 'text-orange-700',
                    border: 'border-orange-100',
                    ring: 'ring-orange-50',
                    accent: 'bg-orange-500',
                    gradient: 'from-orange-500 to-orange-600'
                };
            case 'supplier':
                return {
                    primary: 'green',
                    bg: 'bg-green-50',
                    text: 'text-green-700',
                    border: 'border-green-100',
                    ring: 'ring-green-50',
                    accent: 'bg-green-600',
                    gradient: 'from-green-500 to-green-600'
                };
            case 'admin':
                return {
                    primary: 'purple',
                    bg: 'bg-purple-50',
                    text: 'text-purple-700',
                    border: 'border-purple-100',
                    ring: 'ring-purple-50',
                    accent: 'bg-purple-600',
                    gradient: 'from-purple-500 to-purple-600'
                };
            default:
                return {
                    primary: 'gray',
                    bg: 'bg-gray-50',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    ring: 'ring-gray-50',
                    accent: 'bg-gray-600',
                    gradient: 'from-gray-500 to-gray-600'
                };
        }
    };

    const theme = getRoleTheme(displayUser.role || 'user');

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 pb-24">

            {/* Nav Back */}
            {/* Nav Back & Notifications */}
            <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm"
                >
                    <ArrowRight className="w-5 h-5" />
                    <span className="font-bold text-sm">رجوع</span>
                </button>

                <NotificationPopover />
            </div>

            {/* MASONRY GRID CONTAINER */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">

                {/* 1. IDENTITY CARD (Large - 2x2) */}
                <div className="md:col-span-2 md:row-span-2 bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    {/* Decor */}
                    <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 ${theme.bg}`}></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="relative">
                                <img
                                    src={displayUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.full_name || 'User')}&background=random`}
                                    alt={displayUser.full_name}
                                    className={`w-24 h-24 rounded-full border-4 border-white shadow-md object-cover ${theme.bg}`}
                                />
                                {displayUser.role !== 'admin' && ( // Optional: Hide check for admin or keep it
                                    <div className={`absolute bottom-1 right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white ${theme.accent}`} title="Verified">
                                        <CheckCircle className="w-3.5 h-3.5 fill-current" />
                                    </div>
                                )}
                            </div>
                            <span className={`${theme.bg} ${theme.text} text-xs px-3 py-1.5 rounded-full border ${theme.border} font-bold uppercase tracking-wide`}>
                                {displayUser.isSyndicate ? 'عضو نقابة' : getRoleLabel(displayUser.role)}
                            </span>
                        </div>

                        <h1 className="text-3xl font-black text-gray-900 mb-2">{displayUser.full_name}</h1>
                        <p className="text-gray-500 font-medium text-lg mb-4 flex items-center gap-2">
                            {displayUser.specialty || getRoleLabel(displayUser.role)}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {(profileData?.specialties || []).map((tag: string) => (
                                <span key={tag} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${theme.bg} ${theme.text}`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 pt-6 border-t border-gray-100 flex gap-3">
                        {isMe ? (
                            <Button
                                onClick={() => {
                                    setEditForm({
                                        full_name: profileData?.full_name || '',
                                        bio: profileData?.bio || '',
                                        specialty: profileData?.specialty || '',
                                        specialties: profileData?.specialties || [],
                                        phone: profileData?.phone || '',
                                        address: profileData?.address || '',
                                        university: profileData?.university || '',
                                        graduation_year: profileData?.graduation_year?.toString() || ''
                                    });
                                    setAvatarPreview(null);
                                    setSelectedAvatar(null);
                                    setIsEditModalOpen(true);
                                }}
                                className={`flex-1 text-white rounded-xl py-3 shadow-lg shadow-gray-200 ${theme.accent}`}
                            >
                                <Edit className="w-4 h-4 ml-2" />
                                تعديل الملف
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => navigate('/community/messages', { state: { startConversationWith: profileData } })}
                                    className={`flex-1 text-white rounded-xl py-3 shadow-lg ${theme.accent} shadow-blue-200`}
                                >
                                    <MessageCircle className="w-4 h-4 ml-2" />
                                    مراسلة
                                </Button>
                                <Button variant="outline" className="px-4 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700">
                                    <UserPlus className="w-5 h-5" />
                                </Button>
                                {currentUser?.role === 'admin' && (
                                    <Button
                                        onClick={() => {
                                            if (id && window.confirm('هل أنت متأكد من حظر هذا المستخدم؟ سيتم إخفاء جميع محتوياته.')) {
                                                banUser(id);
                                            }
                                        }}
                                        className="px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl border border-red-100"
                                    >
                                        <Shield className="w-5 h-5" />
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 2. STATS CARD 1 (Followers - 1x1) */}
                <button
                    onClick={() => setShowConnectionsModal('followers')}
                    className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group"
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${theme.bg} ${theme.text}`}>
                        <Users className="w-6 h-6" />
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-1">{stats.followers}</div>
                    <div className="text-sm text-gray-500 font-bold">صديق</div>
                </button>

                {/* 3. STATS CARD 2 (Posts Count - 1x1) */}
                <button
                    onClick={() => { }}
                    className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group"
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${theme.bg} ${theme.text}`}>
                        <Grid className="w-6 h-6" />
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-1">{stats.posts}</div>
                    <div className="text-sm text-gray-500 font-bold">منشور</div>
                </button>

                {/* 4. USER INFO (Wide - 2x1) */}
                <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-center">
                    <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        تفاصيل المستخدم
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 shadow-sm"><MapPin className="w-4 h-4" /></div>
                                <span className="text-sm font-bold text-gray-700">{profileData?.address || profileData?.city || 'غير محدد'}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 shadow-sm"><Phone className="w-4 h-4" /></div>
                                <span className="text-sm font-bold text-gray-700">{profileData?.phone || 'غير محدد'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. BIO / ABOUT (Full Width or 2x1 based on content) */}
                <div className="md:col-span-4 bg-white rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-3 text-lg">نبذة تعريفية</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {profileData?.bio || `${getRoleLabel(profileData?.role)} متخصص في مجال طب الأسنان. مهتم بأحدث التقنيات والتطورات في المجال.`}
                            </p>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="px-4 py-3 bg-gray-50 rounded-2xl flex items-center gap-3">
                                <GraduationCap className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="text-xs text-gray-500 font-bold">{profileData?.university || 'سنة التخرج'}</div>
                                    <div className="text-sm font-black text-gray-900">{profileData?.graduation_year || '-'}</div>
                                </div>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 rounded-2xl flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="text-xs text-gray-500 font-bold">عضو منذ</div>
                                    <div className="text-sm font-black text-gray-900">{profileData?.created_at ? new Date(profileData.created_at).getFullYear() : '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6. CONTENT FEED (Single Tab) */}
                <div className="md:col-span-4 mt-4">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Grid className="w-5 h-5" />
                            المنشورات ({userPosts.length})
                        </h2>
                    </div>

                    {/* Feed Content */}
                    <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                        {userPosts.length > 0 ? (
                            userPosts.map(post => (
                                <PremiumPostCard
                                    key={post.id}
                                    post={post}
                                    onLike={() => likePost(post.id)}
                                    onSave={() => toggleSave(post, 'post')}
                                    isSaved={isSaved(post.id)}
                                    onProfileClick={() => { }} // Already on profile
                                    onReport={(reason: string) => reportPost(post.id, reason)}
                                    isMe={isMe}
                                    onEdit={() => {
                                        const newContent = window.prompt('تعديل المنشور:', post.content);
                                        if (newContent && newContent !== post.content) {
                                            updatePost(post.id, newContent);
                                        }
                                    }}
                                    onDelete={() => {
                                        if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
                                            deletePost(post.id);
                                        }
                                    }}
                                    onCommentClick={() => setSearchParams({ postId: post.id })}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 border-dashed">
                                <p className="text-gray-400 font-bold">لا يوجد منشورات لعرضها</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* POST DETAIL MODAL */}
            <PostDetailModal
                isOpen={!!selectedPost}
                onClose={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('postId');
                    setSearchParams(newParams);
                }}
                post={selectedPost}
            />

            {/* CONNECTIONS MODAL (Followers/Following) */}
            <Modal
                isOpen={!!showConnectionsModal}
                onClose={() => setShowConnectionsModal(null)}
                title={showConnectionsModal === 'followers' ? 'المتابعون' : 'يتابع'}
            >
                <div className="min-h-[400px]">
                    {/* Mock Data for now - ideally this comes from hook */}
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="text-right">
                                        <h4 className="font-bold text-gray-900 text-sm">د. مستخدم {i}</h4>
                                        <p className="text-xs text-gray-500">طبيب أسنان</p>
                                    </div>
                                </div>
                                <Button size="sm" variant={showConnectionsModal === 'following' ? 'outline' : 'primary'}>
                                    {showConnectionsModal === 'following' ? 'إلغاء المتابعة' : 'متابعة'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* PROFILE EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="تعديل الملف الشخصي"
            >
                <div className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <img
                                src={avatarPreview || profileData?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.full_name || 'User')}&background=random`}
                                alt="Avatar"
                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                            />
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                type="file"
                                ref={avatarInputRef}
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setSelectedAvatar(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () => setAvatarPreview(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">انقر لتغيير الصورة</p>
                    </div>


                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل</label>
                        <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${theme.primary}-100 focus:border-${theme.primary}-500`}
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">نبذة تعريفية</label>
                        <textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            rows={3}
                            className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${theme.primary}-100 focus:border-${theme.primary}-500`}
                            placeholder="اكتب نبذة عنك..."
                        />
                    </div>

                    {/* Specialty - Dynamic Label based on Role */}
                    {(profileData?.role !== 'admin') && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                {profileData?.role === 'supplier' || profileData?.role === 'lab' ? 'التصنيف الرئيسي' : 'التخصص الرئيسي'}
                            </label>
                            <input
                                type="text"
                                value={editForm.specialty}
                                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${theme.primary}-100 focus:border-${theme.primary}-500`}
                                placeholder={profileData?.role === 'doctor' ? "مثال: طبيب أسنان" : "مثال: مواد طبية / سيراميك"}
                            />
                        </div>
                    )}

                    {/* Specialties Tags - Only for Doctor/Lab */}
                    {['doctor', 'lab'].includes(profileData?.role) && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                {profileData?.role === 'lab' ? 'الخدمات المتوفرة' : 'التخصصات الفرعية'}
                            </label>
                            <input
                                type="text"
                                placeholder="اكتب واضغط Enter..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const input = e.target as HTMLInputElement;
                                        const value = input.value.trim();
                                        if (value && !editForm.specialties.includes(value)) {
                                            setEditForm({ ...editForm, specialties: [...editForm.specialties, value] });
                                            input.value = '';
                                        }
                                    }
                                }}
                                className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${theme.primary}-100 focus:border-${theme.primary}-500`}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {editForm.specialties.map((tag, idx) => (
                                    <span key={idx} className={`${theme.bg} ${theme.text} px-3 py-1 rounded-full text-xs flex items-center gap-1`}>
                                        {tag}
                                        <button onClick={() => setEditForm({ ...editForm, specialties: editForm.specialties.filter((_, i) => i !== idx) })}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phone & Address - Common */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">الهاتف</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                                placeholder="07XX XXX XXXX"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">العنوان</label>
                            <input
                                type="text"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                                placeholder="المدينة، المنطقة"
                            />
                        </div>
                    </div>

                    {/* University & Graduation - Only for Doctor */}
                    {profileData?.role === 'doctor' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الجامعة</label>
                                <input
                                    type="text"
                                    value={editForm.university}
                                    onChange={(e) => setEditForm({ ...editForm, university: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                                    placeholder="جامعة بغداد"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">سنة التخرج</label>
                                <input
                                    type="text"
                                    value={editForm.graduation_year}
                                    onChange={(e) => setEditForm({ ...editForm, graduation_year: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
                                    placeholder="2020"
                                />
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <Button
                        onClick={async () => {
                            setIsSaving(true);
                            try {
                                let avatarUrl = profileData?.avatar_url;

                                // Upload new avatar if selected
                                if (selectedAvatar) {
                                    const fileExt = selectedAvatar.name.split('.').pop();
                                    const fileName = `${targetUserId}/${Date.now()}.${fileExt}`;

                                    const { error: uploadError } = await supabase.storage
                                        .from('avatars')
                                        .upload(fileName, selectedAvatar, { upsert: true });

                                    if (!uploadError) {
                                        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                                        avatarUrl = urlData.publicUrl;
                                    }
                                }

                                // Update profile
                                const { error } = await supabase.from('profiles').update({
                                    full_name: editForm.full_name,
                                    bio: editForm.bio,
                                    specialty: editForm.specialty,
                                    specialties: editForm.specialties,
                                    phone: editForm.phone,
                                    address: editForm.address,
                                    university: editForm.university,
                                    graduation_year: editForm.graduation_year ? parseInt(editForm.graduation_year) : null,
                                    avatar_url: avatarUrl
                                }).eq('id', targetUserId);

                                if (error) throw error;

                                // Refresh profile data
                                const { data: updated } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
                                setProfileData(updated);
                                setIsEditModalOpen(false);
                                toast.success('تم تحديث الملف الشخصي بنجاح');
                            } catch (error) {
                                console.error('Error updating profile:', error);
                                toast.error('حدث خطأ أثناء الحفظ');
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        disabled={isSaving}
                        className={`w-full text-white py-3 ${theme.accent} hover:opacity-90`}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                            <>
                                <Save className="w-4 h-4 ml-2" />
                                حفظ التغييرات
                            </>
                        )}
                    </Button>
                </div>
            </Modal>
        </div >
    );
};

// Helper function to get role label
const getRoleLabel = (role: string): string => {
    const roles: Record<string, string> = {
        doctor: 'طبيب أسنان',
        supplier: 'مورد',
        lab: 'معمل أسنان',
        admin: 'مدير المنصة',
        staff: 'طاقم العيادة'
    };
    return roles[role] || 'مستخدم';
};

