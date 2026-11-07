import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { sendNotification } from '../lib/notifications';
import { getInstantCache, setCache, getCache, addToSyncQueue } from '../lib/offline/db';

export interface LabOrder {
    id: string;
    order_number: string;
    clinic_id: string;
    laboratory_id?: string;
    custom_lab_id?: string;
    custom_lab_name?: string;
    patient_id?: string;
    doctor_id?: string;
    patient_name: string;
    doctor_name?: string;
    clinic_name?: string;
    lab_name?: string;
    service_name: string;
    tooth_number?: number;
    tooth_numbers?: number[];
    status: 'pending' | 'waiting_for_representative' | 'representative_dispatched' | 'in_progress' | 'completed' | 'out_for_delivery' | 'delivered' | 'returned' | 'cancelled' | 'rejected' | 'modification_requested';
    delegate_id?: string;
    delegate_name?: string;
    pickup_delegate_id?: string;
    pickup_delegate_name?: string;
    pickup_delegate_phone?: string;
    delivery_delegate_id?: string;
    delivery_delegate_name?: string;
    delivery_delegate_phone?: string;
    return_reason?: string;
    is_return_cycle?: boolean;
    order_date: string;
    final_amount: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    paid_amount?: number;
    expected_delivery_date?: string;
    rating?: number;
    review_note?: string;
    modification_note?: string;
    notes?: string;
    paymentStatus?: 'paid' | 'unpaid' | 'waiting_approval' | 'partial';
    patientName?: string;
    doctorName?: string;
    testType?: string;
    labName?: string;
    lab_phone?: string;
    createdAt?: string;
    expectedDelivery?: string;
    price?: number;
}

export const useLabOrders = (options?: { clinicId?: string, laboratoryId?: string }) => {
    const { user } = useAuth();
    const cacheKey = `lab_orders_${options?.clinicId || options?.laboratoryId || user?.id || 'all'}`;
    const initial = getInstantCache<LabOrder[]>(cacheKey) || [];
    const [orders, setOrders] = useState<LabOrder[]>(initial);
    const [loading, setLoading] = useState(initial.length === 0);
    const mountedRef = useRef(true);

    const saveOrdersCache = (list: LabOrder[]) => {
        setCache(cacheKey, list, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setOrders(list);
        }
    };

    const fetchOrders = async () => {
        if (!user) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (!navigator.onLine) {
            const cached = await getCache<LabOrder[]>(cacheKey);
            if (cached && mountedRef.current) {
                setOrders(cached);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        try {
            if (orders.length === 0) setLoading(true);

            let query = supabase
                .from('dental_lab_orders')
                .select(`
                    *,
                    laboratory:dental_laboratories(name, phone),
                    clinic:clinics(name),
                    staff:staff_record_id(full_name)
                `)
                .order('created_at', { ascending: false });

            if (options?.clinicId && options.clinicId !== 'all') {
                query = query.eq('clinic_id', options.clinicId);
            } else if (user.role === 'doctor') {
                const { data: ownedClinics } = await supabase.from('clinics').select('id').eq('owner_id', user.id);
                const { data: memberClinics } = await supabase.from('clinic_members').select('clinic_id').eq('user_id', user.id);

                const allClinicIds = [
                    ...(ownedClinics?.map(c => c.id) || []),
                    ...(memberClinics?.map(m => m.clinic_id) || [])
                ];

                const uniqueIds = [...new Set(allClinicIds)];
                if (uniqueIds.length > 0) {
                    query = query.in('clinic_id', uniqueIds);
                }
            } else if (user.role === 'laboratory') {
                const { data: lab } = await supabase.from('dental_laboratories').select('id').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();
                if (lab) {
                    query = query.eq('laboratory_id', lab.id);
                }
            }

            if (options?.laboratoryId) {
                query = query.eq('laboratory_id', options.laboratoryId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const delegateIds = new Set<string>();
            data?.forEach(o => {
                if (o.pickup_delegate_id) delegateIds.add(o.pickup_delegate_id);
                if (o.delivery_delegate_id) delegateIds.add(o.delivery_delegate_id);
            });

            let delegatesMap: Record<string, string> = {};
            if (delegateIds.size > 0) {
                const { data: delegatesData } = await supabase
                    .from('dental_lab_representatives')
                    .select('id, phone')
                    .in('id', Array.from(delegateIds));

                if (delegatesData) {
                    delegatesMap = delegatesData.reduce((acc, d) => ({ ...acc, [d.id]: d.phone }), {});
                }
            }

            const mappedOrders: LabOrder[] = (data || []).map((o: any) => ({
                id: String(o.id),
                order_number: o.order_number,
                clinic_id: String(o.clinic_id),
                laboratory_id: o.laboratory_id,
                patient_id: o.patient_id ? String(o.patient_id) : undefined,
                doctor_id: o.staff_id?.toString(),
                patient_name: o.patient_name,
                service_name: o.service_name,
                tooth_number: o.tooth_number,
                tooth_numbers: o.tooth_numbers,
                doctor_name: o.doctor_name || o.staff?.full_name,
                patientName: o.patient_name,
                doctorName: o.doctor_name || o.staff?.full_name,
                testType: o.service_name,
                labName: o.laboratory?.name || o.custom_lab_name || 'مختبر خارجي',
                lab_phone: o.laboratory?.phone,
                createdAt: o.created_at?.split('T')[0],
                expectedDelivery: o.expected_delivery_date,
                clinic_name: o.clinic?.name,
                lab_name: o.laboratory?.name || o.custom_lab_name || 'مختبر خارجي',
                status: o.status,
                order_date: o.created_at,
                final_amount: o.final_amount,
                priority: o.priority,
                delegate_id: o.delegate_id,
                delegate_name: o.delegate_name,
                pickup_delegate_id: o.pickup_delegate_id,
                pickup_delegate_name: o.pickup_delegate_name,
                pickup_delegate_phone: delegatesMap[o.pickup_delegate_id] || undefined,
                delivery_delegate_id: o.delivery_delegate_id,
                delivery_delegate_name: o.delivery_delegate_name,
                delivery_delegate_phone: delegatesMap[o.delivery_delegate_id] || undefined,
                return_reason: o.return_reason,
                is_return_cycle: o.is_return_cycle,
                paid_amount: o.paid_amount,
                expected_delivery_date: o.expected_delivery_date,
                rating: o.rating,
                review_note: o.review_note,
                notes: o.notes,
                modification_note: o.modification_note,
                paymentStatus: o.payment_status || 'unpaid',
                price: o.price || o.final_amount
            }));

            const currentCached = getInstantCache<LabOrder[]>(cacheKey) || [];
            const unsyncedOffline = currentCached.filter(item => String(item.id).startsWith('offline_'));
            saveOrdersCache([...unsyncedOffline, ...mappedOrders]);
        } catch {
            const cached = await getCache<LabOrder[]>(cacheKey);
            if (cached && mountedRef.current) {
                setOrders(cached);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const submitOrder = async (orderData: any) => {
        const clinicIdNum = Number(orderData.clinic_id);
        if (isNaN(clinicIdNum) || clinicIdNum === 0) {
            throw new Error(`Invalid Clinic ID: ${orderData.clinic_id}`);
        }

        // إذا كان طلباً لمعمل منصة متصل وأوفلاين، ننبّه المستخدم أن إرسال طلب مباشر لمعمل عبر المنصة يتطلب إنترنت، أما المعمل الخارجي/المحلي فيُحفظ أوفلاين
        if (!navigator.onLine && orderData.laboratory_id && !orderData.custom_lab_name) {
            toast.info('سيتم حفظ طلب المعمل محلياً وإرساله تلقائياً فور توفر الاتصال بالإنترنت');
        }

        const now = new Date().toISOString();
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
        const payload = {
            clinic_id: clinicIdNum,
            laboratory_id: orderData.laboratory_id || null,
            custom_lab_name: orderData.custom_lab_name || null,
            patient_name: orderData.patient_name,
            patient_id: orderData.patient_id && !isNaN(Number(orderData.patient_id)) ? Number(orderData.patient_id) : null,
            doctor_id: orderData.doctor_id ? String(orderData.doctor_id) : null,
            doctor_name: orderData.doctor_name || null,
            service_name: orderData.service_name,
            final_amount: orderData.price || orderData.final_amount || 0,
            priority: orderData.priority || 'normal',
            expected_delivery_date: orderData.expected_date || orderData.expected_delivery_date,
            notes: orderData.notes,
            order_number: orderNumber,
            status: 'pending',
            created_at: now
        };

        const saveLocally = async () => {
            const localId = `offline_lab_${Date.now()}`;
            const localOrder: LabOrder = {
                id: localId,
                order_number: orderNumber,
                clinic_id: String(clinicIdNum),
                laboratory_id: orderData.laboratory_id || undefined,
                custom_lab_name: orderData.custom_lab_name || 'مختبر خارجي',
                patient_id: orderData.patient_id ? String(orderData.patient_id) : undefined,
                doctor_id: orderData.doctor_id ? String(orderData.doctor_id) : undefined,
                patient_name: orderData.patient_name || 'مريض',
                doctor_name: orderData.doctor_name || 'الطبيب',
                patientName: orderData.patient_name || 'مريض',
                doctorName: orderData.doctor_name || 'الطبيب',
                service_name: orderData.service_name || '',
                testType: orderData.service_name || '',
                lab_name: orderData.custom_lab_name || orderData.lab_name || 'مختبر خارجي',
                labName: orderData.custom_lab_name || orderData.lab_name || 'مختبر خارجي',
                status: 'pending',
                order_date: now,
                createdAt: now.split('T')[0],
                final_amount: Number(payload.final_amount) || 0,
                price: Number(payload.final_amount) || 0,
                priority: (payload.priority as any) || 'normal',
                expected_delivery_date: payload.expected_delivery_date,
                expectedDelivery: payload.expected_delivery_date,
                notes: payload.notes,
                paymentStatus: 'unpaid'
            };
            saveOrdersCache([localOrder, ...orders]);
            await addToSyncQueue('INSERT', 'dental_lab_orders', localId, payload);
            return localOrder;
        };

        if (!navigator.onLine) {
            const saved = await saveLocally();
            toast.success('تم حفظ طلب المعمل محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return saved;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('dental_lab_orders')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            toast.success('تم إرسال الطلب بنجاح');
            fetchOrders();
            return data;
        } catch {
            const saved = await saveLocally();
            toast.info('تعذر الاتصال، تم حفظ طلب المعمل محلياً وستتم المزامنة تلقائياً');
            return saved;
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, status: string, additionalUpdates: any = {}) => {
        const targetId = String(orderId);
        const dbUpdates = { ...additionalUpdates };
        if (additionalUpdates.paymentStatus) {
            dbUpdates.payment_status = additionalUpdates.paymentStatus;
            delete dbUpdates.paymentStatus;
        }

        const nextList = orders.map(o => String(o.id) === targetId ? { ...o, status: status as any, ...additionalUpdates } : o);
        saveOrdersCache(nextList);

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('UPDATE', 'dental_lab_orders', targetId, { status, ...dbUpdates });
            toast.success('تم تحديث حالة الطلب محلياً');
            return;
        }

        try {
            const { error } = await supabase
                .from('dental_lab_orders')
                .update({ status, ...dbUpdates })
                .eq('id', targetId)
                .select()
                .single();

            if (error) throw error;

            toast.success('تم تحديث حالة الطلب');

            const order = orders.find(o => String(o.id) === targetId);
            if (order && order.clinic_id) {
                await sendNotification({
                    target_user_id: order.doctor_id,
                    clinic_id: order.clinic_id,
                    type: 'order_update',
                    title: `تحديث حالة الطلب #${order.order_number}`,
                    message: `تم تغيير حالة الطلب للمريض ${order.patient_name} إلى: ${getStatusLabel(status)}`,
                    link: `/clinic/labs`,
                    priority: 'normal'
                }).catch(() => {});
            }
        } catch {
            await addToSyncQueue('UPDATE', 'dental_lab_orders', targetId, { status, ...dbUpdates });
            toast.info('تم حفظ تحديث حالة الطلب محلياً');
        }
    };

    const getStatusLabel = (s: string) => {
        const map: any = {
            pending: 'في انتظار الموافقة',
            waiting_for_representative: 'بانتظار المندوب',
            representative_dispatched: 'تم إرسال المندوب',
            in_progress: 'قيد العمل',
            completed: 'مكتمل',
            out_for_delivery: 'جارِ التوصيل',
            delivered: 'تم التسليم',
            returned: 'مسترجع',
            rejected: 'مرفوض',
            cancelled: 'ملغي',
            modification_requested: 'طلب تعديل'
        };
        return map[s] || s;
    };

    const deleteOrder = async (orderId: string) => {
        const targetId = String(orderId);
        saveOrdersCache(orders.filter(o => String(o.id) !== targetId));

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('DELETE', 'dental_lab_orders', targetId, {});
            toast.success('تم حذف الطلب محلياً');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('dental_lab_orders')
                .delete()
                .eq('id', targetId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('لا تملك صلاحية لحذف هذا الطلب، تأكد من شروط الحذف.');

            toast.success('تم حذف الطلب بنجاح');
        } catch (err) {
            console.error('Error deleting order:', err);
            toast.error('فشل حذف الطلب');
            fetchOrders();
            throw err;
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        if (!user) {
            setLoading(false);
            return;
        }
        if ('clinicId' in (options || {}) && options?.clinicId === undefined) {
            setOrders([]);
            setLoading(false);
            return;
        }
        const cached = getInstantCache<LabOrder[]>(cacheKey);
        if (cached && cached.length > 0) {
            setOrders(cached);
            setLoading(false);
        }
        fetchOrders();

        if (!navigator.onLine) return;

        const channelName = `lab_orders_changes_${user.id}_${Math.random().toString(36).substring(2, 9)}`;
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dental_lab_orders'
                },
                () => {
                    if (navigator.onLine) fetchOrders();
                }
            )
            .subscribe();

        return () => {
            mountedRef.current = false;
            supabase.removeChannel(channel);
        };
    }, [user?.id, options?.clinicId, options?.laboratoryId]);

    return {
        orders,
        loading,
        refresh: fetchOrders,
        fetchOrders,
        createOrder: submitOrder,
        updateOrderStatus,
        deleteOrder
    };
};
