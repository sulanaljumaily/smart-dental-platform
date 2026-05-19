import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle, XCircle, Clock, Store, Package, Star, Megaphone, Tag, Heart } from 'lucide-react';
import { Button } from '../../common/Button';
import { toast } from 'sonner';

interface DealRequest {
    id: string;
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
    discount_percentage: number;
    duration_days: number;
    admin_notes?: string;
    product: {
        id: string;
        name: string;
        image: string;
        price: number;
    };
    supplier: {
        name: string;
    };
}

interface PatientProductRequest {
    id: string;
    name: string;
    image_url: string;
    price: number;
    is_new_request: boolean;
    is_featured_request: boolean;
    is_offer_request: boolean;
    offer_request_percentage: number;
    created_at: string;
    supplier: { id: string; name: string; store_type: string };
}

export const DealRequestsTable: React.FC<{ storeType?: 'professional' | 'patient' }> = ({ storeType = 'professional' }) => {
    const [requests, setRequests] = useState<DealRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Direct product request states (Patient store only)
    const [subTab, setSubTab] = useState<'campaigns' | 'direct'>('campaigns');
    const [directRequests, setDirectRequests] = useState<PatientProductRequest[]>([]);
    const [directLoading, setDirectLoading] = useState(false);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('deal_requests')
                .select(`
                  *,
                  product:products!inner(id, name, images, price, target_audience),
                  supplier:suppliers(name)
                `);

            if (storeType === 'patient') {
                query = query.contains('product.target_audience', ['patient']);
            } else {
                query = query.not('product.target_audience', 'cs', '{"patient"}');
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            // Map data to match interface (handle images array vs string)
            const mappedData = (data || []).map((item: any) => ({
                ...item,
                product: {
                    ...item.product,
                    image: item.product.images?.[0] || item.product.image || 'https://via.placeholder.com/100'
                }
            }));

            setRequests(mappedData);
        } catch (err) {
            console.error('Error fetching deal requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDirectRequests = async () => {
        if (storeType !== 'patient') return;
        try {
            setDirectLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select(`
                  id, name, image_url, images, price, created_at,
                  is_new_request, is_featured_request, is_offer_request, offer_request_percentage,
                  supplier:suppliers!inner(id, user_id, store_type)
                `)
                .or('is_new_request.eq.true,is_featured_request.eq.true,is_offer_request.eq.true')
                .contains('target_audience', ['patient']);

            if (error) throw error;

            const mapped = data?.map((p: any) => ({
                ...p,
                image_url: p.image_url || p.images?.[0] || 'https://via.placeholder.com/150',
                supplier: { 
                    id: p.supplier?.id, 
                    name: 'مورد #' + p.supplier?.id?.slice(0, 5), 
                    store_type: p.supplier?.store_type 
                }
            })) || [];
            setDirectRequests(mapped);
        } catch (err) {
            console.error('Error fetching direct requests:', err);
        } finally {
            setDirectLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        if (storeType === 'patient') {
            fetchDirectRequests();
        }
    }, [storeType]);

    const handleStatusUpdate = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            // 1. Update Request Status
            const { error } = await supabase
                .from('deal_requests')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // 2. If Approved, Update Product
            if (newStatus === 'approved') {
                const request = requests.find(r => r.id === id);
                if (request) {
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setDate(startDate.getDate() + (request.duration_days || 7));

                    await supabase
                        .from('products')
                        .update({
                            is_deal: true,
                            discount_percentage: request.discount_percentage,
                            deal_start: startDate.toISOString(),
                            deal_end: endDate.toISOString()
                        })
                        .eq('id', request.product.id);
                }
            }

            toast.success(newStatus === 'approved' ? 'تم قبول العرض بنجاح' : 'تم رفض الطلب');
            fetchRequests();

        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('حدث خطأ أثناء تحديث الحالة');
        }
    };

    const handleDirectApprove = async (req: PatientProductRequest, type: 'new' | 'featured' | 'offer') => {
        try {
            let updates: any = {};
            if (type === 'new') updates = { is_new: true, is_new_request: false };
            else if (type === 'featured') updates = { is_featured: true, is_featured_request: false };
            else updates = { discount_percentage: req.offer_request_percentage, is_deal: true, is_offer_request: false };
            
            const { error } = await supabase.from('products').update(updates).eq('id', req.id);
            if (error) throw error;

            toast.success('تمت الموافقة بنجاح');
            fetchDirectRequests();
        } catch (err) {
            console.error(err);
            toast.error('فشلت الموافقة');
        }
    };

    const handleDirectReject = async (req: PatientProductRequest, type: 'new' | 'featured' | 'offer') => {
        try {
            let updates: any = {};
            if (type === 'new') updates = { is_new_request: false };
            else if (type === 'featured') updates = { is_featured_request: false };
            else updates = { is_offer_request: false };
            
            const { error } = await supabase.from('products').update(updates).eq('id', req.id);
            if (error) throw error;

            toast.success('تم رفض الطلب');
            fetchDirectRequests();
        } catch (err) {
            console.error(err);
            toast.error('فشل الرفض');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;

    return (
        <div className="space-y-6" dir="rtl">
            {storeType === 'patient' && (
                <div className="flex gap-4 border-b border-slate-100 pb-2">
                    <button
                        onClick={() => setSubTab('campaigns')}
                        className={`pb-2 px-3 text-sm font-bold transition-all relative ${subTab === 'campaigns' ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        طلبات العروض والخصومات المجدولة ({requests.length})
                        {subTab === 'campaigns' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setSubTab('direct')}
                        className={`pb-2 px-3 text-sm font-bold transition-all relative ${subTab === 'direct' ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        طلبات الشارات المباشرة ({directRequests.length})
                        {subTab === 'direct' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
                    </button>
                </div>
            )}

            {storeType === 'patient' && subTab === 'direct' ? (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">طلبات التمييز والشارات المباشرة</h3>
                            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                                {directRequests.length} طلب معلق
                            </span>
                        </div>

                        {directRequests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 bg-green-50 p-2 rounded-full" />
                                <p>لا توجد طلبات معلقة لشارات المنتجات حالياً</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {directRequests.map((req) => (
                                    <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all">
                                        <div className="flex items-start gap-4">
                                            <img src={req.image_url} className="w-16 h-16 rounded-xl object-contain border border-slate-100 bg-white" />
                                            <div>
                                                <h4 className="font-bold text-slate-900">{req.name}</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">المورد: {req.supplier.name}</p>
                                                <p className="text-sm font-bold text-purple-600 mt-1">{req.price.toLocaleString()} د.ع</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {req.is_new_request && (
                                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-4 min-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <Star className="w-5 h-5 text-blue-500" />
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800">شارة جديد</p>
                                                            <p className="text-[10px] text-slate-500">إضافة شارة منتج جديد</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => handleDirectApprove(req, 'new')} className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"><CheckCircle className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDirectReject(req, 'new')} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            )}

                                            {req.is_featured_request && (
                                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex items-center justify-between gap-4 min-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <Megaphone className="w-5 h-5 text-yellow-500" />
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800">منتج مميز</p>
                                                            <p className="text-[10px] text-slate-500">طلب إضافة للمميزة</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => handleDirectApprove(req, 'featured')} className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"><CheckCircle className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDirectReject(req, 'featured')} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            )}

                                            {req.is_offer_request && (
                                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between gap-4 min-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="w-5 h-5 text-red-500" />
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800">خصم مباشر {req.offer_request_percentage}%</p>
                                                            <p className="text-[10px] text-slate-500">السعر بعد: {Math.round(req.price * (1 - req.offer_request_percentage / 100)).toLocaleString()} د.ع</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => handleDirectApprove(req, 'offer')} className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"><CheckCircle className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDirectReject(req, 'offer')} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-800">
                            {storeType === 'patient' ? 'طلبات العروض والخصومات المجدولة' : 'طلبات عروض متجر الأطباء والعيادات'}
                        </h3>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {requests.filter(r => r.status === 'pending').length} طلب معلق
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                                <tr>
                                    <th className="px-6 py-4">المنتج</th>
                                    <th className="px-6 py-4">المورد</th>
                                    <th className="px-6 py-4">الخصم المقترح</th>
                                    <th className="px-6 py-4">المدة</th>
                                    <th className="px-6 py-4">التاريخ</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-slate-500">لا توجد طلبات حالياً</td>
                                    </tr>
                                ) : (
                                    requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={request.product.image} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                                                    <div>
                                                        <p className="font-medium text-slate-900 line-clamp-1">{request.product.name}</p>
                                                        <p className="text-xs text-slate-500">{request.product.price.toLocaleString()} د.ع</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <Store className="w-4 h-4 text-slate-400" />
                                                    {request.supplier?.name || 'Supp-' + request.id.slice(0, 4)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-bold">
                                                    {request.discount_percentage}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {request.duration_days} يوم
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {new Date(request.created_at).toLocaleDateString('ar-IQ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                {request.status === 'pending' && (
                                                    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                                        <Clock className="w-3 h-3" /> قيد المراجعة
                                                    </span>
                                                )}
                                                {request.status === 'approved' && (
                                                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                                        <CheckCircle className="w-3 h-3" /> مقبول
                                                    </span>
                                                )}
                                                {request.status === 'rejected' && (
                                                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                                        <XCircle className="w-3 h-3" /> مرفوض
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {request.status === 'pending' && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(request.id, 'approved')}
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                            title="قبول"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                            title="رفض"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
