import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle,
  Send,
  Phone,
  Calendar,
  Search,
  DollarSign,
  FileText,
  Image,
  Paperclip,
  MessageSquare,
  Users,
  Building2,
  Shield,
  Truck
} from 'lucide-react';
import { BentoStatCard } from '../dashboard/BentoStatCard';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type Conversation = {
  conversation_id: number;
  doctor_id: string;
  lab_id: string;
  order_id: string;
  last_message_date: string;
  created_at: string;
  doctor_name: string;
  lab_name: string;
  order_number: string;
  clinic_name: string; // Added Clinic Name
  clinic_phone?: string;
  unread_count: number;
  type?: 'clinic' | 'admin' | 'supplier'; // Added Type for filtering
};

type Message = {
  message_id: number;
  sender_id: string;
  message_type: 'text' | 'price' | 'image' | 'file';
  message_content: string;
  file_url?: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
};

export default function LabConversations() {
  const { user } = useAuth();
  const supabaseClient = supabase;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('clinics');
  const [priceMessage, setPriceMessage] = useState({
    amount: '',
    service_type: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // جلب المحادثات
  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_lab_conversations', {
        p_user_id: user?.id
      });

      if (error) throw error;

      // Map data and add mock types for demonstration if not from DB yet
      // In production, the RPC should return the type
      const mappedData = (data || []).map((conv: any) => ({
        ...conv,
        type: conv.doctor_id ? 'clinic' : 'admin' // Simple inference for now
      }));

      setConversations(mappedData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // فلترة المحادثات
  useEffect(() => {
    let result = conversations;

    // Filter by Tab (Type)
    if (activeTab === 'clinics') {
      result = result.filter(c => c.type === 'clinic' || !c.type); // Default to clinic
    } else if (activeTab === 'admin') {
      result = result.filter(c => c.type === 'admin');
    } else if (activeTab === 'suppliers') {
      result = result.filter(c => c.type === 'supplier');
    }

    // Filter by Search
    if (searchTerm) {
      const lowerInfos = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.clinic_name?.toLowerCase().includes(lowerInfos) ||
        c.doctor_name.toLowerCase().includes(lowerInfos) ||
        c.order_number?.toLowerCase().includes(lowerInfos)
      );
    }

    setFilteredConversations(result);
  }, [conversations, activeTab, searchTerm]);

  // جلب رسائل المحادثة
  const fetchMessages = async (conversationId: number) => {
    try {
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId
      });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // إرسال رسالة
  const sendMessage = async (type: 'text' | 'price' = 'text') => {
    if (!selectedConversation || (!newMessage.trim() && type === 'text')) return;

    setSendingMessage(true);
    try {
      let content = newMessage;
      let messageType = type;

      if (type === 'price') {
        content = JSON.stringify(priceMessage);
        messageType = 'price';
      }

      const { data, error } = await supabase.rpc('send_lab_message', {
        p_conversation_id: selectedConversation.conversation_id,
        p_sender_id: user?.id,
        p_message_type: messageType,
        p_message_content: content
      });

      if (error) throw error;

      // تحديث الرسائل
      await fetchMessages(selectedConversation.conversation_id);

      // مسح الرسالة
      setNewMessage('');
      setPriceMessage({ amount: '', service_type: '', notes: '' });

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // تحديد المحادثة
  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.conversation_id);

    // تحديد الرسائل كمقروءة
    if (conversation.unread_count > 0) {
      await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversation.conversation_id,
        p_user_id: user?.id
      });

      // تحديث عدد الرسائل غير المقروءة
      setConversations(prev =>
        prev.map(conv =>
          conv.conversation_id === conversation.conversation_id
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    }
  };

  // تحميل المحادثات عند تحميل المكون
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // إحصائيات للمحادثات
  const totalConversations = conversations.length;
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* إحصائيات المحادثات - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <BentoStatCard
          title="المحادثات النشطة"
          value={totalConversations}
          icon={MessageSquare}
          color="blue"
          delay={0}
        />
        <BentoStatCard
          title="رسائل غير مقروءة"
          value={unreadMessages}
          icon={MessageCircle}
          color="red"
          delay={100}
          trend={unreadMessages > 0 ? "down" : "neutral"}
          trendValue={unreadMessages > 0 ? "يتطلب رد" : "الكل مقروء"}
        />
        <BentoStatCard
          title="العيادات المتصلة"
          value={conversations.length > 0 ? Math.floor(conversations.length * 0.8) : 0}
          icon={Building2}
          color="green"
          delay={200}
          trend="up"
          trendValue="نشط"
        />
        <BentoStatCard
          title="الملفات المتبادلة"
          value={12}
          icon={Paperclip}
          color="purple"
          delay={300}
        />
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* قائمة المحادثات - Bento Style */}
        <div className="w-1/3 min-w-[320px] bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              المحادثات
            </h3>

            {/* Tabs for filtering */}
            <Tabs defaultValue="clinics" value={activeTab} onValueChange={setActiveTab} className="w-full mb-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="clinics">العيادات</TabsTrigger>
                <TabsTrigger value="admin">الإدارة</TabsTrigger>
                <TabsTrigger value="suppliers">الموردين</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المحادثات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-white/50 border-white/20 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {filteredConversations.length === 0 ? (
                <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
                  <MessageCircle className="h-10 w-10 opacity-20 mb-2" />
                  <p>لا توجد محادثات هنا</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.conversation_id}
                      onClick={() => selectConversation(conversation)}
                      className={`p-3 cursor-pointer rounded-xl transition-all border border-transparent ${selectedConversation?.conversation_id === conversation.conversation_id
                        ? 'bg-white shadow-sm border-white/20'
                        : 'hover:bg-white/40'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 border border-white/20 bg-blue-50">
                          {activeTab === 'admin' ? (
                            <div className="w-full h-full flex items-center justify-center text-blue-600">
                              <Shield className="h-6 w-6" />
                            </div>
                          ) : activeTab === 'suppliers' ? (
                            <div className="w-full h-full flex items-center justify-center text-orange-600">
                              <Truck className="h-6 w-6" />
                            </div>
                          ) : (
                            <>
                              <AvatarImage src="/avatars/clinic-default.png" />
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {conversation.clinic_name?.[0] || 'C'}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold truncate text-gray-900 text-sm">
                              {activeTab === 'admin' ? 'إدارة المنصة' : conversation.clinic_name || 'عيادة غير معروفة'}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="text-[10px] h-5 min-w-5 flex items-center justify-center px-1">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>

                          {activeTab === 'clinics' && (
                            <p className="text-xs text-blue-600 font-medium truncate mt-0.5">
                              د. {conversation.doctor_name}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground truncate bg-gray-100 px-1.5 py-0.5 rounded">
                              #{conversation.order_number || 'NA'}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {format(new Date(conversation.last_message_date), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* منطقة الرسائل - Bento Style */}
        <div className="flex-1 bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm overflow-hidden flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-white/20 bg-white">
                    {activeTab === 'admin' ? (
                      <div className="w-full h-full flex items-center justify-center text-blue-600">
                        <Shield className="h-5 w-5" />
                      </div>
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {selectedConversation.clinic_name?.[0] || 'C'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {activeTab === 'admin' ? 'إدارة المنصة' : selectedConversation.clinic_name}
                      {activeTab === 'clinics' && <Badge variant="outline" className="text-[10px] font-normal text-gray-500">عيادة</Badge>}
                    </h3>
                    {activeTab === 'clinics' && (
                      <p className="text-sm text-blue-600 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        طاقم العيادة: د. {selectedConversation.doctor_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-white/50 border-white/20 hover:bg-white text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    اتصال
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/50 border-white/20 hover:bg-white text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    تفاصيل الطلب
                  </Button>
                </div>
              </div>

              {/* الرسائل */}
              <div className="flex-1 overflow-hidden relative bg-white/20">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.message_id}
                        className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${message.sender_id === user?.id
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-gray-800 border border-white/20 rounded-bl-none'
                            }`}
                        >
                          {message.message_type === 'price' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-medium">عرض سعر</span>
                              </div>
                              {(() => {
                                try {
                                  const priceData = JSON.parse(message.message_content);
                                  return (
                                    <div className="space-y-1">
                                      <p>الخدمة: {priceData.service_type}</p>
                                      <p>السعر: {priceData.amount} د.ع</p>
                                      {priceData.notes && (
                                        <p className="text-sm opacity-80">
                                          {priceData.notes}
                                        </p>
                                      )}
                                    </div>
                                  );
                                } catch {
                                  return <p>{message.message_content}</p>;
                                }
                              })()}
                            </div>
                          ) : (
                            <p>{message.message_content}</p>
                          )}
                          <p className={`text-[10px] mt-1 ${message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-400'}`}>
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* منطقة إرسال الرسالة */}
              <div className="border-t border-white/10 p-4 space-y-3 bg-white/30">
                {/* تبويب السعر */}
                <div className="flex gap-2">
                  <Button
                    variant={priceMessage.amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (priceMessage.amount && priceMessage.service_type) {
                        sendMessage('price');
                      }
                    }}
                    disabled={!priceMessage.amount || !priceMessage.service_type || sendingMessage}
                    className={priceMessage.amount ? "" : "bg-white/50 border-white/20 hover:bg-white"}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    إرسال السعر
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/50 border-white/20 hover:bg-white">
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/50 border-white/20 hover:bg-white">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>

                {/* نموذج السعر */}
                {priceMessage.amount !== '' && (
                  <div className="grid grid-cols-3 gap-2 p-3 border border-white/20 rounded-lg bg-white/40">
                    <Input
                      placeholder="المبلغ"
                      value={priceMessage.amount}
                      onChange={(e) => setPriceMessage(prev => ({ ...prev, amount: e.target.value }))}
                      type="number"
                      className="bg-white/50 border-white/20"
                    />
                    <Input
                      placeholder="نوع الخدمة"
                      value={priceMessage.service_type}
                      onChange={(e) => setPriceMessage(prev => ({ ...prev, service_type: e.target.value }))}
                      className="bg-white/50 border-white/20"
                    />
                    <Input
                      placeholder="ملاحظات"
                      value={priceMessage.notes}
                      onChange={(e) => setPriceMessage(prev => ({ ...prev, notes: e.target.value }))}
                      className="bg-white/50 border-white/20"
                    />
                  </div>
                )}

                {/* إرسال رسالة نصية */}
                <div className="flex gap-2">
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage('text');
                      }
                    }}
                    className="flex-1 bg-white/50 border-white/20 focus:bg-white transition-all"
                  />
                  <Button
                    onClick={() => sendMessage('text')}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground p-8 bg-white/20 rounded-3xl backdrop-blur-sm">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30 text-blue-500" />
                <p className="text-lg font-medium text-gray-600">اختر {activeTab === 'clinics' ? 'عيادة' : activeTab === 'admin' ? 'إدارة' : 'مورد'} للتواصل</p>
                <p className="text-sm opacity-60">يمكنك التواصل ومتابعة الطلبات مباشرة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}