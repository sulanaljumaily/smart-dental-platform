import React, { useState, useEffect } from 'react';
import { useCommunity } from '../../../hooks/useCommunity';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import {
    Heart, MessageCircle, Share2, Bookmark,
    MoreVertical, Send, CheckCircle
} from 'lucide-react';

interface PostDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ isOpen, onClose, post }) => {
    const { likePost, addComment, toggleSave, isSaved } = useCommunity();
    const { user: currentUser } = useAuth();
    const [commentText, setCommentText] = useState('');
    const [localComments, setLocalComments] = useState<any[]>([]);

    // Sync comments when post changes or opens
    useEffect(() => {
        if (post?.comments) {
            setLocalComments(post.comments);
        }
    }, [post]);

    if (!post) return null;

    const postSaved = isSaved(post.id);

    const handleComment = async () => {
        if (!commentText.trim()) return;

        // Optimistic UI Update
        const newComment = {
            id: `temp-${Date.now()}`,
            authorId: currentUser?.id,
            authorName: currentUser?.name || 'Me',
            content: commentText,
            date: 'الآن'
        };

        setLocalComments(prev => [...prev, newComment]);
        const textToSend = commentText;
        setCommentText('');

        // Actual API Call
        await addComment(post.id, textToSend);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="المنشور"
            size="2xl"
        >
            <div className="space-y-6">
                {/* POST CONTENT */}
                <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-gray-100">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center font-bold text-gray-700 shadow-inner">
                                {post.authorName?.[0] || '?'}
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 align-middle">
                                    <h3 className="font-bold text-gray-900">{post.authorName}</h3>
                                    {post.isElite && <CheckCircle className="w-4 h-4 text-amber-500 fill-amber-500" />}
                                </div>
                                <p className="text-xs font-medium text-gray-400">{post.authorRole} • {post.date}</p>
                            </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Text */}
                    <p className="text-gray-800 text-lg leading-relaxed mb-4 whitespace-pre-line">
                        {post.content}
                    </p>

                    {/* Image */}
                    {post.image && (
                        <div className="rounded-3xl overflow-hidden mb-5 border border-gray-100 shadow-sm">
                            <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => likePost(post.id)}
                                className={`rounded-xl px-4 py-2 flex items-center gap-2 ${post.likedByMe ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                            >
                                <Heart className={`w-5 h-5 ${post.likedByMe ? 'fill-current' : ''}`} />
                                <span>{post.likes}</span>
                            </Button>
                            <Button className="rounded-xl px-4 py-2 flex items-center gap-2 bg-blue-50 text-blue-600">
                                <MessageCircle className="w-5 h-5" />
                                <span>{localComments.length}</span>
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="rounded-xl">
                                <Share2 className="w-5 h-5 text-gray-400" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="rounded-xl"
                                onClick={() => toggleSave(post, 'post')}
                            >
                                <Bookmark className={`w-5 h-5 ${postSaved ? 'text-orange-500 fill-current' : 'text-gray-400'}`} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* COMMENTS SECTION */}
                <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        التعليقات
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-xs">
                            {localComments.length}
                        </span>
                    </h3>

                    {/* Input Area */}
                    <div className="flex gap-4 mb-6">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                            {currentUser?.name?.[0] || 'ME'}
                        </div>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="اكتب تعليقاً..."
                                className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 transition-all pl-12" // Increased LEFT padding if button is on LEFT? No, user wants RIGHT.
                                // If User wants button on RIGHT:
                                // In LTR: Right is end. In RTL: Right is start.
                                // Assuming Visual Right side.
                                // style={{ paddingRight: '3.5rem' }} 
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                            />
                            {/* Send Button Positioned Physically Right */}
                            <button
                                onClick={handleComment}
                                disabled={!commentText.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all z-10"
                            >
                                <Send className="w-4 h-4 rtl:rotate-180" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {localComments.length > 0 ? (
                            localComments.map((comment: any, idx: number) => (
                                <div key={comment.id || idx} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                                        {comment.authorName?.[0]}
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-3 rounded-tr-none flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-900 text-xs">{comment.authorName}</h4>
                                            <span className="text-[10px] text-gray-400">{comment.date}</span>
                                        </div>
                                        <p className="text-gray-700 text-xs leading-relaxed">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-xs">
                                كن أول من يعلق على هذا المنشور
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
