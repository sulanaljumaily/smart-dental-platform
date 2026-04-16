import React, { useState, useEffect } from 'react';
import { Send, Paperclip, MoreVertical, User, Building2, MessageCircle, ChevronRight } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../../hooks/useStaff';
import { useDoctorContext } from '../../contexts/DoctorContext';
import { useLocation } from 'react-router-dom';
import { useMessages } from '../../hooks/useMessages';

export const DoctorMessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedClinicId, clinics } = useDoctorContext();
  
  // Fetch staff across appropriate clinics to enable horizontal grouping
  const { staff } = useStaff(selectedClinicId === 'all' ? undefined : selectedClinicId || undefined);

  // Custom Hooks
  const { conversations, sendMessage: sendDirectMessage } = useMessages();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [expandedClinicId, setExpandedClinicId] = useState<string | null>('all');

  const location = useLocation();

  useEffect(() => {
    if (location.state?.startConversationWith) {
      const targetUser = location.state.startConversationWith;
      setSelectedConversationId(targetUser.id);
    } else if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [location.state, conversations]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId) return;

    const success = await sendDirectMessage(selectedConversationId, messageText);
    if (success) {
      setMessageText('');
    }
  };

  const startNewConversation = (member: any) => {
    const targetId = member.userId || member.id;
    setSelectedConversationId(targetId);
    setExpandedClinicId(null); // Auto hide staff list
  };

  const currentPartnerStaff = staff.find(s => (s.userId === selectedConversationId || s.id === selectedConversationId));
  const currentChatPartnerInfo = conversations.find(c => c.id === selectedConversationId) || {
    partnerName: currentPartnerStaff?.name || 'مستخدم',
    messages: []
  };

  const handleBackToStaffList = () => {
    setSelectedConversationId(null);
    if (currentPartnerStaff?.clinicId) {
      setExpandedClinicId(currentPartnerStaff.clinicId);
    }
  };

  // Helper maps for unread counts
  const staffUnreadMap = new Map();
  
  conversations.forEach(conv => {
    if (conv.unreadCount > 0) {
      staffUnreadMap.set(conv.id, conv.unreadCount);
    }
  });

  const getClinicUnreadCount = (clinicId: string) => {
    if (clinicId === 'all') {
      let total = 0;
      clinics.forEach(c => {
        total += getClinicUnreadCount(c.id);
      });
      return total;
    }
    const clinicStaff = staff.filter(s => s.clinicId === clinicId);
    let count = 0;
    clinicStaff.forEach(s => {
      const staffId = s.userId || s.id;
      if (staffUnreadMap.has(staffId)) {
        count += staffUnreadMap.get(staffId);
      }
    });
    return count;
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      {/* Top Clinic & Staff Horizontal Selector */}
      {user?.role === 'doctor' && clinics.length > 0 && (
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {/* All Clinics Button */}
            <button
              onClick={() => setExpandedClinicId('all')}
              className={`relative min-w-[140px] px-4 py-3 shrink-0 rounded-xl flex items-center justify-between gap-3 transition-all duration-300 border shadow-sm ${
                expandedClinicId === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-700 shadow-md ring-2 ring-purple-600/20 transform -translate-y-0.5'
                  : 'bg-white border-purple-100 hover:border-purple-200 hover:shadow-md'
              }`}
            >
              {getClinicUnreadCount('all') > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[18px] text-center z-10">
                  {getClinicUnreadCount('all')}
                </span>
              )}
              <span className={`text-[12px] font-bold text-right line-clamp-2 leading-tight flex-1 ${expandedClinicId === 'all' ? 'text-white' : 'text-purple-900'}`}>
                جميع العيادات
              </span>
              <div className={`p-2 rounded-lg shrink-0 ${expandedClinicId === 'all' ? 'bg-white/20' : 'bg-purple-50 text-purple-600'}`}>
                <Building2 className={`w-5 h-5 ${expandedClinicId === 'all' ? 'text-white' : ''}`} />
              </div>
            </button>

            {clinics.map(clinic => {
              const unreadCount = getClinicUnreadCount(clinic.id);
              return (
                <button
                  key={clinic.id}
                  onClick={() => setExpandedClinicId(expandedClinicId === clinic.id ? null : clinic.id)}
                  className={`relative min-w-[140px] px-4 py-3 shrink-0 rounded-xl flex items-center justify-between gap-3 transition-all duration-300 border shadow-sm ${
                    expandedClinicId === clinic.id 
                      ? 'bg-blue-600 border-blue-700 shadow-md ring-2 ring-blue-600/20 transform -translate-y-0.5' 
                      : 'bg-white border-blue-100 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[18px] text-center z-10">
                      {unreadCount}
                    </span>
                  )}
                  <span className={`text-[12px] font-bold text-right line-clamp-2 leading-tight flex-1 ${expandedClinicId === clinic.id ? 'text-white' : 'text-blue-900'}`}>
                    {clinic.name}
                  </span>
                  <div className={`p-2 rounded-lg shrink-0 ${expandedClinicId === clinic.id ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                    <Building2 className={`w-5 h-5 ${expandedClinicId === clinic.id ? 'text-white' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {expandedClinicId && (
            <div className="bg-white/90 px-4 py-3 rounded-xl border border-blue-100 shadow-sm overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
              <div className="flex gap-4 overflow-x-auto pb-1 custom-scrollbar">
                {staff
                  .filter(s => 
                    (expandedClinicId === 'all' ? clinics.some(c => c.id === s.clinicId) : s.clinicId === expandedClinicId) 
                    && (s.userId !== user?.id && s.id !== user?.id)
                  )
                  .length > 0 ? (
                  staff
                    .filter(s => 
                      (expandedClinicId === 'all' ? clinics.some(c => c.id === s.clinicId) : s.clinicId === expandedClinicId) 
                      && (s.userId !== user?.id && s.id !== user?.id)
                    )
                    .map(member => {
                    const staffId = member.userId || member.id;
                    const unreadCount = staffUnreadMap.get(staffId) || 0;
                    const memberClinic = clinics.find(c => c.id === member.clinicId);
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => startNewConversation(member)}
                        className="relative flex flex-col items-center gap-1.5 shrink-0 group transition-transform hover:-translate-y-1 w-[80px]"
                      >
                         {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 border-2 border-white">
                            {unreadCount}
                          </span>
                        )}
                        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center p-0.5 transition-colors ${selectedConversationId === staffId ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/20' : 'border-gray-200 group-hover:border-blue-400 bg-white'}`}>
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 font-bold text-sm flex items-center justify-center">
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {expandedClinicId === 'all' && memberClinic && (
                          <span className="absolute top-8 -right-1 bg-blue-100 text-blue-700 text-[8px] px-1 rounded-sm border border-blue-200 font-bold max-w-[50px] truncate shadow-sm">
                            {memberClinic.name}
                          </span>
                        )}
                        <div className="text-center w-full">
                          <p className={`text-[10px] font-bold truncate w-full transition-colors ${selectedConversationId === staffId ? 'text-blue-700' : 'text-gray-800 group-hover:text-blue-600'}`}>{member.name}</p>
                          <p className="text-[9px] text-gray-500 truncate w-full mt-0.5">{member.role_title || member.position || 'طاقم'}</p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full text-center py-2 text-xs text-gray-500 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">لا يوجد طاقم مسجل في العيادة</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Layout */}
      <div className="flex-1 overflow-hidden min-h-[400px]">
        {/* Chat Area */}
        <Card className="border-gray-200 shadow-sm overflow-hidden flex flex-col h-full bg-slate-50/50">
          {selectedConversationId ? (
            <div className="flex flex-col h-full flex-1 min-h-0">
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                   {/* Back Button to show staff list */}
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToStaffList}
                    className="p-1.5 hover:bg-gray-100 text-gray-500 ml-1 block"
                    title="العودة لطاقم العيادة"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-600 shrink-0 overflow-hidden">
                    {currentPartnerStaff?.avatar ? (
                      <img src={currentPartnerStaff.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {currentChatPartnerInfo.partnerName}
                    </h3>
                    <p className="text-[10px] text-green-600 flex items-center gap-1 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span> متاح للمراسلة
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-gray-100 text-gray-400 p-1.5 hidden sm:block">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed custom-scrollbar">
                {currentChatPartnerInfo.messages.length > 0 ? currentChatPartnerInfo.messages.map((msg: any, idx: number) => (
                  <div key={idx} className={`flex gap-3 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    {!msg.isMe && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 text-xs font-bold text-blue-700 shadow-sm overflow-hidden`}>
                         {currentPartnerStaff?.avatar ? (
                          <img src={currentPartnerStaff.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          msg.senderName ? msg.senderName.charAt(0) : <User className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 max-w-[85%] md:max-w-md">
                      <div className={`${msg.isMe ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-xl rounded-tl-xl rounded-bl-xl' : 'bg-white border border-gray-100 rounded-tr-xl rounded-tl-xl rounded-br-xl'} shadow-sm p-3`}>
                        <p className={`text-[13px] sm:text-sm ${msg.isMe ? 'text-white' : 'text-gray-800'} leading-relaxed whitespace-pre-wrap break-words`}>{msg.content}</p>
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-1.5 ${msg.isMe ? 'mr-1 text-left' : 'ml-1'}`}>
                        {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-70 mt-4 sm:mt-10">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 font-medium">ابدأ المحادثة مع {currentChatPartnerInfo.partnerName}</p>
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-1 max-w-[250px]">يمكنك الآن مراسلة زميلك بسهولة وبشكل مباشر!</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-2 sm:p-3 border-t border-gray-100 bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="ghost" size="sm" className="hover:bg-gray-100 p-2 rounded-xl text-gray-400 shrink-0">
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="اكتب رسالة..."
                    className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-[13px] sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md p-2 sm:p-2.5 h-auto rounded-xl shrink-0 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-4 bg-gray-50/50 p-6">
              <div className="w-20 h-20 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-2">
                <MessageCircle className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-600 mb-1 text-sm">صندوق الرسائل المباشرة</p>
                <p className="text-xs text-gray-400 max-w-[220px] mx-auto leading-relaxed">اختر العيادة من الشريط العلوي وانقر على الموظف للبدء والمراسلة والتواصل المستمر</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
