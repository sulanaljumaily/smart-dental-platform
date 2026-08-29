import React from 'react';
import { useCommunity } from '../../../hooks/useCommunity';
import { useAuth } from '../../../contexts/AuthContext';
import { UserPlus, MessageCircle, Star, UserMinus, CheckCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { toast } from 'sonner';

// Compact Card for "People You May Know" (Horizontal List)
const MiniFriendCard = ({ friend, onClick }: any) => {
    const { followUser, amIFollowing } = useCommunity();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const isFollowing = amIFollowing(friend.id);

    return (
        <div
            className="min-w-[160px] w-[160px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition-all snap-start"
            onClick={onClick}
        >
            <div className="relative">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 overflow-hidden border-2 border-white shadow-sm">
                    {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xl">{friend.name?.[0] || 'U'}</span>
                    )}
                </div>
            </div>

            <div className="text-center w-full">
                <h3 className="font-bold text-gray-900 text-sm truncate w-full">{friend.name}</h3>
                <p className="text-[10px] text-gray-500 truncate w-full">{friend.specialty || 'طبيب أسنان'}</p>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthenticated) {
                        toast.error('يجب تسجيل الدخول لمتابعة الأطباء');
                        navigate('/login');
                        return;
                    }
                    followUser(friend.id);
                }}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1
                    ${isFollowing
                        ? 'bg-green-50 text-green-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
            >
                {isFollowing ? 'متابع' : 'متابعة'}
            </button>
        </div>
    );
};

// Standard Card for "Following" List
const FriendCard = ({ friend, onClick }: any) => {
    const { amIFollowing, followUser, unfollowUser, isCloseFriend, toggleCloseFriend } = useCommunity();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const isFollowing = amIFollowing(friend.id);
    const isClose = isCloseFriend(friend.id);

    return (
        <div
            className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                    {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                    ) : (
                        friend.name?.[0] || 'U'
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">{friend.name}</h3>
                    <p className="text-xs text-gray-500">{friend.specialty || 'طبيب أسنان'}</p>
                </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Close Friend Star - Only show if following */}
                {isFollowing && (
                    <button
                        onClick={() => {
                            if (!isAuthenticated) {
                                toast.error('يجب تسجيل الدخول');
                                return;
                            }
                            toggleCloseFriend(friend.id);
                        }}
                        className={`p-2.5 rounded-xl border-2 transition-colors ${isClose
                            ? 'bg-yellow-50 border-yellow-400 text-yellow-500'
                            : 'bg-white border-gray-100 text-gray-300 hover:text-yellow-400 hover:border-yellow-200'
                            }`}
                        title={isClose ? "صديق مقرب" : "إضافة للأصدقاء المقربين"}
                    >
                        <Star className={`w-5 h-5 ${isClose ? 'fill-current' : ''}`} />
                    </button>
                )}

                {/* Follow/Unfollow Button */}
                <Button
                    onClick={() => {
                        if (!isAuthenticated) {
                            toast.error('يجب تسجيل الدخول لمتابعة الأطباء');
                            navigate('/login');
                            return;
                        }
                        if (isFollowing) {
                            unfollowUser(friend.id);
                        } else {
                            followUser(friend.id);
                        }
                    }}
                    variant="primary"
                    className={`px-4 rounded-xl transition-all flex items-center gap-2 shadow-sm ${isFollowing
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-md ring-0 hover:text-white border-transparent'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-none'
                        }`}
                >
                    {isFollowing ? (
                        <>
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-xs font-bold">متابع</span>
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-5 h-5" />
                            <span className="text-xs font-bold">متابعة</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export const FriendsTab: React.FC = () => {
    const { users, amIFollowing, suggestedUsers } = useCommunity();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // 1. My Followers/Following (from Context)
    const followingIds = isAuthenticated ? users.filter(u => amIFollowing(u.id)).map(u => u.id) : [];
    const following = users.filter(u => followingIds.includes(u.id));

    // 2. Suggested Users (from Context)
    const displaySuggestions = (suggestedUsers && suggestedUsers.length > 0)
        ? suggestedUsers
        : users.filter(u => !followingIds.includes(u.id)).slice(0, 10);

    return (
        <div className="space-y-8 pb-24 pt-2">

            {/* Suggestions - Horizontal Scroll */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-4">
                    <h2 className="font-bold text-xl text-gray-900">أشخاص قد تعرفهم</h2>
                </div>

                <div className="flex overflow-x-auto pb-4 gap-3 px-4 snap-x scrollbar-hide">
                    {displaySuggestions.map(user => (
                        <MiniFriendCard
                            key={user.id}
                            friend={user}
                            onClick={() => navigate(`/community/user/${user.id}`)}
                        />
                    ))}
                    {displaySuggestions.length === 0 && (
                        <div className="w-full text-center py-8 text-gray-400 text-sm">لا توجد اقتراحات حالياً</div>
                    )}
                </div>
            </section>

            {/* People I Follow - Vertical List */}
            <section className="px-4 space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl text-gray-900">أتابعهم</h2>
                    {isAuthenticated && (
                        <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{following.length}</span>
                    )}
                </div>

                {isAuthenticated ? (
                    <div className="flex flex-col gap-3">
                        {following.map(user => (
                            <FriendCard
                                key={user.id}
                                friend={user}
                                onClick={() => navigate(`/community/user/${user.id}`)}
                            />
                        ))}
                        {following.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <UserPlus className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-gray-900 font-bold mb-1">لا تتابع أحداً بعد</p>
                                <p className="text-xs text-gray-500">تابع الأشخاص المقترحين أعلاه لرؤية منشوراتهم</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-[2rem] p-6 text-center border border-indigo-100 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200 mb-3">
                            <LogIn className="w-7 h-7" />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg mb-1">سجل دخولك لبناء شبكة علاقاتك الطبية</h3>
                        <p className="text-xs text-gray-600 max-w-md mb-4">
                            تابع أطباء الأسنان والزملاء لتبادل الخبرات ومتابعة أحدث الحالات السريرية والمناقشات.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all"
                        >
                            تسجيل الدخول الآن
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};
