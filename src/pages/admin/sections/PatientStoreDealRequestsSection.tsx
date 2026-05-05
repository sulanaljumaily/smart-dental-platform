import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Check, X, Tag, Star, Megaphone, HeartPulse } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { toast } from 'sonner';

interface PatientProductRequest {
  id: string; name: string; image_url: string; price: number;
  is_new_request: boolean; is_featured_request: boolean;
  is_offer_request: boolean; offer_request_percentage: number;
  created_at: string;
  supplier: { id: string; name: string; store_type: string };
}

export const PatientStoreDealRequestsSection: React.FC = () => {
  const [requests, setRequests] = useState<PatientProductRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, image_url, price, created_at,
          is_new_request, is_featured_request, is_offer_request, offer_request_percentage,
          supplier:suppliers!inner(id, user_id, store_type)
        `)
        .or('is_new_request.eq.true,is_featured_request.eq.true,is_offer_request.eq.true')
        .contains('target_audience', ['patient'])
        .in('suppliers.store_type', ['patient', 'both']);

      if (error) throw error;

      const mapped = data?.map((p: any) => ({
        ...p,
        supplier: { id: p.supplier?.id, name: 'مورد #' + p.supplier?.id?.slice(0, 5), store_type: p.supplier?.store_type }
      })) || [];
      setRequests(mapped);
    } catch (err) {
      console.error('Error fetching patient product requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req: PatientProductRequest, type: 'new' | 'featured' | 'offer') => {
    let updates: any = {};
    if (type === 'new') updates = { is_new: true, is_new_request: false };
    else if (type === 'featured') updates = { is_featured: true, is_featured_request: false };
    else updates = { discount: req.offer_request_percentage, is_offer_request: false };
    const { error } = await supabase.from('products').update(updates).eq('id', req.id);
    if (error) { toast.error('فشلت الموافقة'); return; }
    toast.success('تمت الموافقة');
    fetchRequests();
  };

  const handleReject = async (req: PatientProductRequest, type: 'new' | 'featured' | 'offer') => {
    let updates: any = {};
    if (type === 'new') updates = { is_new_request: false };
    else if (type === 'featured') updates = { is_featured_request: false };
    else updates = { is_offer_request: false };
    await supabase.from('products').update(updates).eq('id', req.id);
    toast.success('تم الرفض');
    fetchRequests();
  };

  if (loading) return <div className="p-8 text-center text-gray-400">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">عروض وصفقات متجر المرضى</h2>
          <p className="text-gray-500 text-sm">موافقة على طلبات موردي متجر المرضى</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-gray-400">
            <Check className="w-12 h-12 mx-auto mb-3 text-teal-400 bg-teal-50 p-2 rounded-full" />
            <p>لا توجد طلبات معلقة من متجر المرضى</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <Card key={req.id} className="overflow-hidden border-teal-100">
              <div className="p-5 md:flex items-start gap-4">
                <div className="w-20 h-20 bg-teal-50 rounded-xl flex-shrink-0 border border-teal-100 overflow-hidden">
                  <img src={req.image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-contain" alt={req.name} />
                </div>
                <div className="flex-1 mt-3 md:mt-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{req.name}</h3>
                      <p className="text-sm text-gray-400 mb-1">المورد: {req.supplier.name}</p>
                      <p className="text-teal-600 font-bold text-sm">{formatCurrency(req.price)}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {req.is_new_request && (
                      <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 flex items-center justify-between gap-4 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-teal-100 text-teal-600 rounded-lg"><Star className="w-3.5 h-3.5" /></div>
                          <div>
                            <p className="font-bold text-xs text-gray-900">شارة جديد</p>
                            <p className="text-[10px] text-gray-400">طلب إضافة شارة جديد</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleApprove(req, 'new')} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleReject(req, 'new')} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                    {req.is_featured_request && (
                      <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 flex items-center justify-between gap-4 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-cyan-100 text-cyan-600 rounded-lg"><Megaphone className="w-3.5 h-3.5" /></div>
                          <div>
                            <p className="font-bold text-xs text-gray-900">منتج مميز</p>
                            <p className="text-[10px] text-gray-400">طلب ظهور في المميزة</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleApprove(req, 'featured')} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleReject(req, 'featured')} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                    {req.is_offer_request && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center justify-between gap-4 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Tag className="w-3.5 h-3.5" /></div>
                          <div>
                            <p className="font-bold text-xs text-gray-900">خصم {req.offer_request_percentage}%</p>
                            <p className="text-[10px] text-gray-400">السعر بعد: {formatCurrency(req.price * (1 - req.offer_request_percentage / 100))}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleApprove(req, 'offer')} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleReject(req, 'offer')} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
