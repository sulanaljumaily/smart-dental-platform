import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Paperclip, Loader2, Check, CheckCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Message {
    id: number;
    sender_id: string;
    message_type: 'text' | 'price' | 'image' | 'file';
    message_content: string;
    file_url?: string;
    is_read: boolean;
    created_at: string;
    sender_name: string;
}

interface DoctorLabChatProps {
    orderId: string;
    labName: string;
    onClose?: () => void;
}

export const DoctorLabChat: React.FC<DoctorLabChatProps> = ({ orderId, labName, onClose }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize Chat
    useEffect(() => {
        const initChat = async () => {
            if (!user || !orderId) return;
            try {
                setLoading(true);
                // 1. Get or Create Conversation for this Order
                const { data: convId, error } = await supabase.rpc('create_conversation_for_order', {
                    p_order_id: orderId,
                    p_doctor_id: user.id
                });

                if (error) throw error;
                setConversationId(convId);

                // 2. Fetch Messages
                if (convId) {
                    fetchMessages(convId);
                }
            } catch (err) {
                console.error('Error initializing chat:', err);
            } finally {
                setLoading(false);
            }
        };

        initChat();
    }, [user, orderId]);

    // Fetch Messages Function
    const fetchMessages = async (convId: number) => {
        try {
            const { data, error } = await supabase.rpc('get_conversation_messages', {
                p_conversation_id: convId
            });

            if (error) throw error;
            setMessages(data || []);

            // Mark as read immediately when viewing
            if (user) {
                await supabase.rpc('mark_messages_as_read', {
                    p_conversation_id: convId,
                    p_user_id: user.id
                });
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    // Real-time Subscription
    useEffect(() => {
        if (!conversationId) return;

        // Fetch initial
        fetchMessages(conversationId);

        const channel = supabase
            .channel(`lab_chat_${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'lab_messages', // Assuming table name based on RPC convention
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    // Map to Message interface if needed, or if structure matches
                    // We might need to fetch the sender name if it's not in the payload (usually it's not)
                    // For now, let's just re-fetch to be safe and get joined data (sender name)
                    fetchMessages(conversationId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !conversationId || !user) return;
        const file = e.target.files[0];

        try {
            setSending(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments') // Needs to exist
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            // Determine Type
            const msgType = file.type.startsWith('image/') ? 'image' : 'file';

            // Send Message RPC
            const { error: sendError } = await supabase.rpc('send_lab_message', {
                p_conversation_id: conversationId,
                p_sender_id: user.id,
                p_message_type: msgType,
                p_message_content: msgType === 'image' ? 'Image Attachment' : file.name,
                p_file_url: publicUrl // Try to pass this. If RPC ignores it, we might need a backup plan.
            });

            if (sendError) {
                // Fallback: If p_file_url param doesn't exist, maybe append to content?
                // But better to throw to catch block
                throw sendError;
            }

            // fetchMessages(conversationId); // Realtime should handle it
        } catch (err: any) {
            console.error('Upload/Send Error:', err);
            // toast.error('Fails to send file');
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!newMessage.trim() && !sending) || !conversationId || !user) return;

        try {
            setSending(true);
            const { error } = await supabase.rpc('send_lab_message', {
                p_conversation_id: conversationId,
                p_sender_id: user.id,
                p_message_type: 'text',
                p_message_content: newMessage
            });

            if (error) throw error;

            setNewMessage('');
            fetchMessages(conversationId); // Refresh immediately
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[500px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {labName}
                    </h3>
                    <p className="text-xs text-gray-500">محادثة مباشرة بخصوص الطلب</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Send className="w-8 h-8" />
                        </div>
                        <p>لا توجد رسائل سابقة. ابدأ المحادثة الآن</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id; // Or compare closer if needed
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl p-3 shadow-sm relative group ${isMe
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                        }`}
                                >
                                    <div className="flex flex-col gap-2">
                                        {msg.message_type === 'text' && (
                                            <p className="text-sm whitespace-pre-wrap">{msg.message_content}</p>
                                        )}

                                        {/* Image Display */}
                                        {msg.message_type === 'image' && (
                                            <div className="rounded-lg overflow-hidden border border-gray-200 mt-1">
                                                <a href={msg.file_url || msg.message_content} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={msg.file_url || msg.message_content}
                                                        alt="attachment"
                                                        className="max-w-[200px] h-auto object-cover hover:opacity-90 transition-opacity"
                                                        loading="lazy"
                                                    />
                                                </a>
                                            </div>
                                        )}

                                        {/* File Display */}
                                        {msg.message_type === 'file' && (
                                            <a
                                                href={msg.file_url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-2 p-2 rounded-lg mt-1 ${isMe ? 'bg-blue-500/20 text-white hover:bg-blue-500/30' : 'bg-gray-100 text-blue-600 hover:bg-gray-200'} transition-colors`}
                                            >
                                                <Paperclip className="w-4 h-4" />
                                                <span className="text-xs underline truncate max-w-[150px]">{msg.message_content || 'ملف مرفق'}</span>
                                            </a>
                                        )}

                                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                            <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                                            {isMe && (
                                                <span>
                                                    {msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    disabled={sending}
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx"
                />

                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                />

                <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className={`p-2.5 rounded-full text-white shadow-md transition-all ${!newMessage.trim() || sending
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'
                        }`}
                >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
        </div >
    );
};
