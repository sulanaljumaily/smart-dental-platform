import React from 'react';
import { useCommunity } from '../../../hooks/useCommunity';
import { UserPlus, MessageCircle, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FriendCard = ({ friend, isFriend, onAdd, onClick }: any) => (
    <div
        className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
    >
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                {friend.name[0]}
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-lg">{friend.name}</h3>
                <p className="text-xs text-gray-500">{friend.specialty || 'طبيب أسنان'}</p>
            </div>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {isFriend ? (
                <button className="p-3 bg-gray-50 text-blue-600 rounded-xl hover:bg-gray-100 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                </button>
            ) : (
                <button
                    onClick={() => onAdd(friend.id)}
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            )}
        </div>
    </div>
);

export const FriendsTab: React.FC = () => {
    const { friends, users, addFriend } = useCommunity();
    const navigate = useNavigate();

    // In context, 'friends' are people I've added.
    // 'users' are everyone.
    // Suggestions are users who are NOT in friends list.
    const friendIds = friends.map(f => f.id);
    const suggestions = users.filter(u => !friendIds.includes(u.id));

    return (
        <div className="p-4 space-y-6 pb-24">
            <section>
                <h2 className="font-bold text-xl mb-4 px-2 text-gray-900">الأصدقاء ({friends.length})</h2>
                <div className="flex flex-col gap-3">
                    {friends.map(friend => (
                        <FriendCard
                            key={friend.id}
                            friend={friend}
                            isFriend={true}
                            onClick={() => navigate(`/community/user/${friend.id}`)}
                        />
                    ))}
                    {friends.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                            <p className="text-gray-400 font-bold">لا يوجد أصدقاء بعد</p>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="font-bold text-xl mb-4 px-2 text-gray-900">أشخاص قد تعرفهم</h2>
                <div className="flex flex-col gap-3">
                    {suggestions.slice(0, 5).map(user => (
                        <FriendCard
                            key={user.id}
                            friend={user}
                            isFriend={false}
                            onAdd={addFriend}
                            onClick={() => navigate(`/community/user/${user.id}`)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
