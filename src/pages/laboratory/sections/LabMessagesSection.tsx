import { formatNumericDate } from '../../../lib/date';
import React, { useState } from 'react';
import {
  MessageCircle, Send, Search, Phone, Video, MoreVertical,
  Paperclip, Image, Star, Clock, Check, CheckCheck,
  Building2, User, Headphones
} from 'lucide-react';
import { Card } from '../../../components/common/Card';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'clinic' | 'lab' | 'system' | 'support';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachments?: string[];
  isUrgent?: boolean;
  ticketId?: string;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'clinic' | 'support' | 'system';
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
  isStarred: boolean;
  isArchived: boolean;
  type: 'conversation' | 'support_ticket';
}



export const LabMessagesSection: React.FC = () => {

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'clinic' | 'support'>('all');

  // بيانات وهمية للمحادثات
  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      participantId: 'clinic-1',
      participantName: 'عيادة د. سارة أحمد للأسنان',
      participantType: 'clinic',
      lastMessage: 'شكراً لكم على سرعة في النتائج، هل يمكن إعادة إرسال التقرير؟',
      lastMessageTime: '2025-11-16 14:30',
      unreadCount: 2,
      isOnline: true,
      isStarred: true,
      isArchived: false,
      type: 'conversation',
      messages: [
        {
          id: 'msg-1',
          senderId: 'clinic-1',
          senderName: 'د. سارة أحمد',
          senderType: 'clinic',
          content: 'مرحباً، أرجو منكم إرسال نتائج أشعة بانوراما للمريض أحمد محمد',
          timestamp: '2025-11-16 10:00',
          status: 'read'
        },
        {
          id: 'msg-2',
          senderId: 'lab-1',
          senderName: 'مختبر الأضواء',
          senderType: 'lab',
          content: 'تم إرسال النتائج، شكراً لثقتكم بنا',
          timestamp: '2025-11-16 10:15',
          status: 'read'
        },
        {
          id: 'msg-3',
          senderId: 'clinic-1',
          senderName: 'د. سارة أحمد',
          senderType: 'clinic',
          content: 'شكراً لكم على سرعة في النتائج، هل يمكن إعادة إرسال التقرير؟',
          timestamp: '2025-11-16 14:30',
          status: 'delivered',
          isUrgent: true
        }
      ]
    },
    {
      id: 'conv-2',
      participantId: 'support-1',
      participantName: 'فريق الدعم الفني',
      participantType: 'support',
      lastMessage: 'تم حل المشكلة، يمكنكم الآن تسجيل الدخول بشكل طبيعي',
      lastMessageTime: '2025-11-16 09:15',
      unreadCount: 0,
      isOnline: true,
      isStarred: true,
      isArchived: false,
      type: 'support_ticket',
      messages: [
        {
          id: 'msg-4',
          senderId: 'lab-1',
          senderName: 'مختبر الأضواء',
          senderType: 'lab',
          content: 'لدي مشكلة في رفع الصور، لا تظهر في النظام',
          timestamp: '2025-11-16 08:30',
          status: 'read',
          ticketId: 'TKT-001'
        },
        {
          id: 'msg-5',
          senderId: 'support-1',
          senderName: 'فريق الدعم الفني',
          senderType: 'support',
          content: 'تم حل المشكلة، يمكنكم الآن تسجيل الدخول بشكل طبيعي',
          timestamp: '2025-11-16 09:15',
          status: 'read',
          ticketId: 'TKT-001'
        }
      ]
    }
  ];



  // تصفية المحادثات
  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch =
      conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || conv.participantType === filterType;

    return matchesSearch && matchesType;
  });

  const selectedConv = selectedConversation
    ? mockConversations.find(c => c.id === selectedConversation)
    : null;

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'clinic':
        return Building2;
      case 'support':
        return User;
      case 'system':
        return Headphones;
      default:
        return MessageCircle;
    }
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-purple-200" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-purple-200" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-white" />;
      default:
        return <Clock className="w-3 h-3 text-purple-200" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'الآن';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} ساعة`;
    } else {
      return formatNumericDate(date);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConv) {

      setNewMessage('');
    }
  };

  const renderConversationList = () => (
    <div className="w-full lg:w-1/3 bg-white border-l border-gray-100 flex flex-col h-full lg:rounded-r-[2rem] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900 mb-4">الرسائل والدعم</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="البحث في المحادثات..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filterType === 'all'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('clinic')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filterType === 'clinic'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            العيادات
          </button>
          <button
            onClick={() => setFilterType('support')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filterType === 'support'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            الدعم
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredConversations.map((conversation) => {
          const ParticipantIcon = getParticipantIcon(conversation.participantType);
          return (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${selectedConversation === conversation.id ? 'bg-purple-50/50 border-r-4 border-r-purple-500 pl-3' : 'border-r-4 border-r-transparent'
                }`}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${conversation.type === 'support_ticket' ? 'bg-orange-100 text-orange-600' : 'bg-white border border-gray-100 text-purple-600'
                    }`}>
                    <ParticipantIcon className="w-6 h-6" />
                  </div>
                  {conversation.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {conversation.participantName}
                    </h3>
                    <div className="flex items-center gap-1">
                      {conversation.isStarred && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      )}
                      <span className="text-xs text-gray-400 font-medium">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                  </div>

                  <p className={`text-sm truncate mb-2 ${conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {conversation.lastMessage}
                  </p>

                  <div className="flex justify-between items-center">
                    {conversation.type === 'support_ticket' && (
                      <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold">
                        تذكرة دعم
                      </span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-bold shadow-sm shadow-purple-200">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMessageView = () => (
    <div className="flex-1 flex flex-col bg-gray-50/50 lg:rounded-l-[2rem] overflow-hidden">
      {selectedConv ? (
        <>
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${selectedConv.type === 'support_ticket' ? 'bg-orange-100 text-orange-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                    {React.createElement(getParticipantIcon(selectedConv.participantType), { className: "w-6 h-6" })}
                  </div>
                  {selectedConv.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedConv.participantName}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedConv.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <p className="text-sm text-gray-500 font-medium">
                      {selectedConv.isOnline ? 'متصل الآن' : 'غير متصل'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {selectedConv.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'lab' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] lg:max-w-[70%] px-5 py-3.5 rounded-[1.5rem] shadow-sm relative ${message.senderType === 'lab'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-bl-sm'
                  : 'bg-white text-gray-900 border border-gray-100 rounded-br-sm'
                  } ${message.isUrgent ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>

                  {message.isUrgent && (
                    <div className="flex items-center gap-1.5 mb-2 bg-white/10 w-fit px-2 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-red-200" />
                      <span className="text-xs text-red-100 font-bold">عاجل</span>
                    </div>
                  )}

                  <p className="text-sm leading-relaxed">{message.content}</p>

                  <div className={`flex items-center justify-end gap-1.5 mt-2 ${message.senderType === 'lab' ? 'text-purple-200' : 'text-gray-400'
                    }`}>
                    <span className="text-[10px] font-medium opacity-80">{formatTime(message.timestamp)}</span>
                    {message.senderType === 'lab' && getMessageStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200/50 bg-white">
            <div className="flex items-end gap-3">
              <div className="flex gap-1 pb-1">
                <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                  <Image className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="اكتب رسالتك..."
                  className="w-full pl-5 pr-14 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 focus:bg-white transition-all shadow-inner"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <MessageCircle className="w-12 h-12 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">اختر محادثة</h3>
            <p className="text-gray-500 max-w-xs mx-auto">اختر محادثة من القائمة لبدء المراسلة مع العيادات أو الدعم الفني</p>
          </div>
        </div>
      )}
    </div>
  );



  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 p-1">
      {/* Main Content Area */}
      <div className="flex-1 flex h-full bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden">
        {renderConversationList()}
        {renderMessageView()}
      </div>
    </div>
  );
};