import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  User,
  Calendar,
  DollarSign,
  MessageCircle,
  Filter,
  Search,
  Activity,
  Check,
  Building2,
  Phone,
  MapPin
} from 'lucide-react';
import { BentoStatCard } from '../dashboard/BentoStatCard';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatNumericDate } from '@/lib/date';

type Order = {
  order_id: string;
  order_number: string;
  patient_name: string;
  doctor_name: string;
  doctor_phone?: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_address?: string;
  service_name: string;
  status: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  order_date: string;
  estimated_completion_date?: string;
  assigned_representative_name?: string;
  total_amount: number;
};

type OrderStats = {
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  ready_orders: number;
  completed_orders: number;
  returned_orders: number;
  cancelled_orders: number;
  overdue_orders: number;
};

export default function EnhancedOrderManagement() {
  const { user } = useAuth();
  const supabaseClient = supabase;

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // جلب الطلبات
  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // 1. Get Lab ID from User ID
      const { data: labData, error: labError } = await supabase
        .from('dental_laboratories')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (labError || !labData) {
        console.error('Lab not found for user:', user.id);
        return;
      }

      const realLabId = labData.id;

      // جلب الإحصائيات
      const { data: statsData, error: statsError } = await supabase.rpc('get_lab_dashboard_stats', {
        p_lab_id: realLabId
      });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        const statsInfo = statsData[0];
        setStats({
          total_orders: statsInfo.total_orders || 0,
          pending_orders: statsInfo.pending_orders || 0,
          in_progress_orders: statsInfo.in_progress_orders || 0,
          ready_orders: statsInfo.ready_orders || 0,
          completed_orders: statsInfo.completed_orders || 0,
          returned_orders: statsInfo.returned_orders || 0,
          cancelled_orders: statsInfo.cancelled_orders || 0,
          overdue_orders: statsInfo.overdue_orders || 0
        });
      }

      // جلب الطلبات
      const statusFilter = filterStatus === 'all' ? null : filterStatus;
      console.log('Fetching Orders for Lab:', realLabId, 'Status:', statusFilter);

      const { data: ordersData, error: ordersError } = await supabase.rpc('get_orders_by_status', {
        p_lab_id: realLabId,
        p_status: statusFilter
      });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحديث حالة الطلب
  const updateOrderStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      const { error } = await supabase.rpc('update_order_status', {
        p_order_id: selectedOrder.order_id,
        p_status_changed_by: user?.id,
        p_new_status: newStatus,
        p_status_description: getStatusDescription(newStatus),
        p_notes: statusNotes || null
      });

      if (error) throw error;

      setShowStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNotes('');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // تحديد الطلب
  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // فتح نافذة تغيير الحالة
  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNotes('');
    setShowStatusDialog(true);
  };

  // ترجمة حالات الطلب
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'في الانتظار',
      'confirmed': 'تم التأكيد',
      'in_progress': 'جاري العمل',
      'ready_for_pickup': 'جاهز للاستلام',
      'collected': 'تم الاستلام',
      'in_lab': 'في المختبر',
      'ready_for_delivery': 'جاهز للتوصيل',
      'delivered': 'تم التوصيل',
      'completed': 'مكتمل',
      'returned': 'مرتجع',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  // لون حالة الطلب
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'pending': 'bg-yellow-500',
      'confirmed': 'bg-blue-500',
      'in_progress': 'bg-orange-500',
      'ready_for_pickup': 'bg-purple-500',
      'collected': 'bg-indigo-500',
      'in_lab': 'bg-pink-500',
      'ready_for_delivery': 'bg-cyan-500',
      'delivered': 'bg-green-500',
      'completed': 'bg-emerald-500',
      'returned': 'bg-red-500',
      'cancelled': 'bg-gray-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };

  // أولوية الطلب
  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'منخفضة',
      'normal': 'عادية',
      'high': 'عالية',
      'urgent': 'عاجلة'
    };
    return priorityMap[priority] || priority;
  };

  // لون الأولوية
  const getPriorityColor = (priority: string) => {
    const colorMap: { [key: string]: string } = {
      'low': 'bg-gray-500',
      'normal': 'bg-blue-500',
      'high': 'bg-orange-500',
      'urgent': 'bg-red-500'
    };
    return colorMap[priority] || 'bg-gray-500';
  };

  // وصف الحالة
  const getStatusDescription = (status: string) => {
    const descriptionMap: { [key: string]: string } = {
      'pending': 'الطلب في انتظار المراجعة والتأكيد',
      'confirmed': 'تم تأكيد الطلب وسيتم البدء في العمل عليه',
      'in_progress': 'جاري العمل على الطلب حالياً',
      'ready_for_pickup': 'الطلب جاهز للاستلام من المختبر',
      'collected': 'تم استلام الطلب من المختبر',
      'in_lab': 'الطلب قيد المعالجة في المختبر',
      'ready_for_delivery': 'الطلب جاهز للتوصيل',
      'delivered': 'تم توصيل الطلب',
      'completed': 'تم إنجاز الطلب بنجاح',
      'returned': 'تم إرجاع الطلب',
      'cancelled': 'تم إلغاء الطلب'
    };
    return descriptionMap[status] || status;
  };

  // فلترة البحث
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.clinic_name && order.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // تحميل البيانات عند تحميل المكون
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الإحصائيات */}
      {/* الإحصائيات - Bento Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BentoStatCard
            title="إجمالي الطلبات"
            value={stats.total_orders}
            icon={Package}
            color="blue"
            delay={0}
          />
          <BentoStatCard
            title="في الانتظار"
            value={stats.pending_orders}
            icon={Clock}
            color="amber"
            delay={50}
          />
          <BentoStatCard
            title="جاري العمل"
            value={stats.in_progress_orders}
            icon={Activity}
            color="orange"
            delay={100}
          />
          <BentoStatCard
            title="جاهز للاستلام"
            value={stats.ready_orders}
            icon={CheckCircle}
            color="purple"
            delay={150}
          />
          <BentoStatCard
            title="مكتمل"
            value={stats.completed_orders}
            icon={Check}
            color="emerald"
            delay={200}
          />
          <BentoStatCard
            title="مرتجع"
            value={stats.returned_orders}
            icon={XCircle}
            color="red"
            delay={250}
          />
          <BentoStatCard
            title="ملغي"
            value={stats.cancelled_orders}
            icon={XCircle}
            color="slate"
            delay={300}
          />
          <BentoStatCard
            title="متأخر"
            value={stats.overdue_orders}
            icon={AlertTriangle}
            color="red"
            delay={350}
            trend="down"
            trendValue="تنبيه"
          />
        </div>
      )}

      {/* أدوات البحث والفلترة */}
      {/* أدوات البحث والفلترة - Bento Style */}
      <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالرقم أو اسم العيادة أو المريض أو الطبيب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white/50 border-white/20 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48 bg-white/50 border-white/20 focus:bg-white transition-all">
              <SelectValue placeholder="حالة الطلب" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-md border-white/20">
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
              <SelectItem value="confirmed">تم التأكيد</SelectItem>
              <SelectItem value="in_progress">جاري العمل</SelectItem>
              <SelectItem value="ready_for_pickup">جاهز للاستلام</SelectItem>
              <SelectItem value="ready_for_delivery">جاهز للتوصيل</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="returned">مرتجع</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* قائمة الطلبات - Bento Style (Aligned with Doctor Center) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            الطلبات ({filteredOrders.length})
          </h3>
        </div>
        <div className="p-6">
          <ScrollArea className="h-[600px]">
            {filteredOrders.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات حالياً</p>
                <p className="text-sm">قم بتغيير فلتر البحث أو الفلتر</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.order_id}
                    className="cursor-pointer hover:bg-white/60 transition-all duration-200 bg-white/40 border border-white/20 rounded-xl overflow-hidden shadow-sm hover:shadow-md"
                    onClick={() => selectOrder(order)}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-lg">
                                {order.clinic_name || 'اسم العيادة غير متوفر'}
                              </h3>
                              <Badge className={`${getStatusColor(order.status)} text-white`}>
                                {getStatusText(order.status)}
                              </Badge>
                              {order.priority !== 'normal' && (
                                <Badge className={`${getPriorityColor(order.priority)} text-white`}>
                                  {getPriorityText(order.priority)}
                                </Badge>
                              )}
                            </div>

                            {/* Clinic Contact & Address */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                              {order.clinic_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span dir="ltr">{order.clinic_phone}</span>
                                </div>
                              )}
                              {order.clinic_address && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-gray-400" />
                                  <span>{order.clinic_address}</span>
                                </div>
                              )}
                            </div>

                            {/* Patient & Doctor Info */}
                            <div className="flex flex-wrap items-center gap-3 text-sm border-t border-gray-100 pt-2 mt-2">
                              <span className="font-medium text-gray-700">المريض: {order.patient_name}</span>
                              <span className="text-gray-300">|</span>
                              <span className="text-gray-600">د. {order.doctor_name}</span>
                              {order.doctor_phone && (
                                <span className="text-gray-400 text-xs" dir="ltr">({order.doctor_phone})</span>
                              )}
                              <span className="text-gray-300">|</span>
                              <span className="text-blue-600 font-medium">{order.service_name}</span>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatNumericDate(new Date(order.order_date))}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-900">#{order.order_number}</span>
                              </div>
                              {order.assigned_representative_name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {order.assigned_representative_name}
                                </div>
                              )}
                              <div className="flex items-center gap-1 ml-auto">
                                <DollarSign className="h-3 w-3" />
                                <span className="font-bold">{order.total_amount} د.ع</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusDialog(order);
                            }}
                          >
                            تغيير الحالة
                          </Button>
                          <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 w-full">
                            <MessageCircle className="h-4 w-4 ml-2" />
                            العيادة
                          </Button>
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

      {/* نافذة تغيير الحالة */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير حالة الطلب</DialogTitle>
            <DialogDescription>
              #{selectedOrder?.order_number} - {selectedOrder?.clinic_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة الجديدة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="confirmed">تم التأكيد</SelectItem>
                <SelectItem value="in_progress">جاري العمل</SelectItem>
                <SelectItem value="ready_for_pickup">جاهز للاستلام</SelectItem>
                <SelectItem value="collected">تم الاستلام</SelectItem>
                <SelectItem value="in_lab">في المختبر</SelectItem>
                <SelectItem value="ready_for_delivery">جاهز للتوصيل</SelectItem>
                <SelectItem value="delivered">تم التوصيل</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="returned">مرتجع</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="ملاحظات إضافية (اختياري)"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={updateOrderStatus} disabled={!newStatus}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تفاصيل الطلب */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedOrder.clinic_name || 'اسم العيادة غير متوفر'}</DialogTitle>
                    <p className="text-sm text-gray-500">#{selectedOrder.order_number}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {/* Clinic Details */}
                  <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      معلومات العيادة
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">رقم الهاتف</label>
                        <p className="font-medium text-gray-900" dir="ltr">{selectedOrder.clinic_phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">العنوان</label>
                        <p className="font-medium text-gray-900">{selectedOrder.clinic_address || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">اسم المريض</label>
                    <p className="mt-1 font-medium">{selectedOrder.patient_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الطبيب المعالج</label>
                    <p className="mt-1 font-medium">د. {selectedOrder.doctor_name}</p>
                    {selectedOrder.doctor_phone && (
                      <p className="text-xs text-gray-500" dir="ltr">{selectedOrder.doctor_phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">نوع الخدمة</label>
                    <p className="mt-1 font-medium">{selectedOrder.service_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">المبلغ الإجمالي</label>
                    <p className="mt-1 font-bold text-green-600">{selectedOrder.total_amount} د.ع</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">تاريخ الطلب</label>
                    <p className="mt-1">
                      {formatNumericDate(new Date(selectedOrder.order_date))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الحالة الحالية</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={`${getStatusColor(selectedOrder.status)} text-white`}>
                        {getStatusText(selectedOrder.status)}
                      </Badge>
                      <Badge className={`${getPriorityColor(selectedOrder.priority)} text-white`}>
                        {getPriorityText(selectedOrder.priority)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button className="flex-1" variant="outline" onClick={() => openStatusDialog(selectedOrder)}>
                    تغيير الحالة
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <MessageCircle className="h-4 w-4 ml-2" />
                    محادثة مع العيادة
                  </Button>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setShowOrderDetails(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}