import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';
import { formatCurrency } from '../../../lib/utils';

export const PatientOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          supplier:suppliers(name),
          items:order_items(
            quantity, unit_price, total_price,
            product:products(name, image_url)
          )
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (data) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'قيد المراجعة', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock };
      case 'processing': return { label: 'جاري التجهيز', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Package };
      case 'shipped': return { label: 'في الطريق', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Package };
      case 'delivered': return { label: 'مكتمل', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle };
      case 'cancelled': return { label: 'ملغي', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle };
      default: return { label: status, color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Package };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      <PatientStoreHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
          <Package className="w-6 h-6 text-teal-600" />
          طلباتي السابقة
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">لا توجد طلبات سابقة</h2>
            <p className="text-slate-500">لم تقم بإجراء أي طلبات من المتجر بعد.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              return (
                <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">رقم الطلب: #{order.id.split('-')[0]}</p>
                      <p className="font-bold text-slate-900">{new Date(order.created_at).toLocaleDateString('ar-IQ')} - المورد: {order.supplier?.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-slate-500 mb-1">الإجمالي</p>
                      <p className="font-bold text-teal-600 text-xl">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm ${statusInfo.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusInfo.label}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-2xl border border-slate-50 bg-white">
                          <img src={item.product?.image_url} alt={item.product?.name} className="w-16 h-16 object-cover rounded-xl bg-slate-50" />
                          <div>
                            <p className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">{item.product?.name}</p>
                            <p className="text-xs text-slate-500">الكمية: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
