import React, { useState, useEffect } from 'react';
import {
  MessageSquare, ChevronRight, Building2, MessageCircle,
  Send, Paperclip, Search, MoreVertical, MapPin, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../hooks/useMessages';
import { Card } from '../../components/common/Card';
import { BottomNavigation } from '../../components/layout/BottomNavigation';

interface PatientMessagesPageProps {
  hideNavigation?: boolean;
}

export const PatientMessagesPage: React.FC<PatientMessagesPageProps> = ({ hideNavigation = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, sendMessage, loading: messagesLoading } = useMessages();

  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClinics();
  }, [user]);

  const fetchClinics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('clinic_id, clinic:clinics(*)')
        .or(`patient_user_id.eq.${user.id},user_id.eq.${user.id}`);

      if (error) throw error;

      if (data) {
        const uniqueClinics = Array.from(new Set(data.map(c => c.clinic_id)))
          .map(id => data.find(c => c.clinic_id === id)?.clinic)
          .filter(Boolean);
        setClinics(uniqueClinics);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClinic?.user_id) {
      setActiveChatId(selectedClinic.user_id);
    } else {
      setActiveChatId(null);
    }
  }, [selectedClinic]);

  const currentChat = conversations.find(c => c.id === activeChatId) || {
    partnerName: selectedClinic?.name || 'العيادة',
    messages: []
  };

  const handleSend = async () => {
    if (!messageText.trim() || !activeChatId) return;
    const success = await sendMessage(activeChatId, messageText);
    if (success) setMessageText('');
  };

  const filteredClinics = clinics.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex flex-col ${!hideNavigation ? 'min-h-screen pb-20 bg-gray-50' : ''}`} dir="rtl">
      {/* Header */}
      {!hideNavigation && (
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 pt-10 pb-6 shadow-lg relative z-20">
          <button onClick={() => navigate('/patient')} className="flex items-center gap-1 text-white/80 hover:text-white mb-3 transition-colors">
            <ChevronRight className="w-5 h-5" /> عودة للملف الشخصي
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MessageSquare className="w-6 h-6" />
              </div>
              مركز الرسائل
            </h1>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {!selectedClinic ? (
          /* View 1: Clinics Grid */
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن عيادة للتواصل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-4 bg-white border border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-sm"
              />
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-white rounded-[2rem] animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : filteredClinics.length > 0 ? (
              <div className="space-y-4">
                {filteredClinics.map(clinic => (
                  <button
                    key={clinic.id}
                    onClick={() => setSelectedClinic(clinic)}
                    className="group w-full bg-white border border-gray-100 p-4 rounded-[2rem] hover:border-teal-500 hover:shadow-xl hover:shadow-teal-50 transition-all flex items-center gap-5 text-right relative overflow-hidden"
                  >
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-gray-50 border border-gray-100 group-hover:scale-105 transition-transform duration-500 shrink-0">
                      {clinic.image_url ? (
                        <img src={clinic.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400 group-hover:text-teal-600 transition-colors" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-gray-900 text-base group-hover:text-teal-600 transition-colors truncate">
                          {clinic.name}
                        </h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-bold">
                          <MapPin className="w-3 h-3 text-teal-500" />
                          <span>{clinic.governorate} - {clinic.address}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold line-clamp-1 opacity-80">
                          انقر لبدء المحادثة الفورية مع العيادة
                        </p>
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all transform group-hover:-translate-x-2">
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-gray-400 font-bold">لا توجد عيادات مرتبطة بسجلك</p>
              </div>
            )}
          </div>
        ) : (
          /* View 2: Chat View */
          <div className="h-[calc(100vh-280px)] min-h-[550px] flex flex-col animate-in slide-in-from-left-4 duration-500">
            <Card className="flex-1 flex flex-col overflow-hidden bg-white border-gray-100 shadow-2xl shadow-gray-200/40 relative rounded-[2.5rem]">
              {/* Chat Header */}
              <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between bg-white z-10 shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => setSelectedClinic(null)}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-teal-600"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 shadow-inner overflow-hidden">
                    {selectedClinic.image_url ? (
                      <img src={selectedClinic.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MessageCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xs sm:text-sm leading-tight">{selectedClinic.name}</h3>
                    <p className="text-[9px] sm:text-[10px] text-emerald-600 flex items-center gap-1.5 font-bold mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> متصل الآن
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedClinic.phone}`}
                    className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
                    title="اتصال بالعيادة"
                  >
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </a>
                  <button className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/30 custom-scrollbar">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">جاري تحميل الرسائل...</div>
                ) : currentChat.messages.length > 0 ? (
                  currentChat.messages.map((msg: any, idx: number) => (
                    <div key={idx} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] p-4 rounded-[1.5rem] shadow-sm ${msg.isMe
                        ? 'bg-teal-600 text-white rounded-tr-none shadow-teal-100'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                        }`}>
                        <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                        <p className={`text-[9px] mt-2 font-bold opacity-60 ${msg.isMe ? 'text-white' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-10">
                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <MessageCircle className="w-10 h-10 text-teal-300" />
                    </div>
                    <p className="text-lg font-black text-gray-800 mb-2">ابدأ المحادثة مع {selectedClinic.name}</p>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                      أرسل استفسارك أو طلبك وسيقوم طاقم العيادة بالرد عليك في أقرب وقت ممكن.
                    </p>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-50 bg-white">
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-[1.5rem] border border-gray-100 focus-within:ring-2 focus-within:ring-teal-500 focus-within:bg-white transition-all">
                  <button className="p-2.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="اكتب رسالة هنا..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 py-2 font-bold"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    className="p-3 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-100 hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};
