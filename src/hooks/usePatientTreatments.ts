import { useState, useEffect, useRef } from 'react';
import { ToothCondition, TreatmentPlan } from '../types/treatment';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { setCache, getCache, getInstantCache, addToSyncQueue } from '../lib/offline/db';

const INITIAL_TEETH: ToothCondition[] = Array.from({ length: 32 }, (_, i) => {
    let num = 0;
    if (i < 8) num = 18 - i;
    else if (i < 16) num = 21 + (i - 8);
    else if (i < 24) num = 38 - (i - 16);
    else num = 41 + (i - 24);

    return {
        number: num,
        condition: 'healthy',
        notes: '',
        existingTreatments: []
    };
});

export const usePatientTreatments = (patientId: string | undefined) => {
    const { user } = useAuth();
    const targetPatientId = patientId ? String(patientId) : '';
    const initialTeeth = (targetPatientId ? getInstantCache<ToothCondition[]>('patient_teeth_' + targetPatientId) : null) || INITIAL_TEETH;
    const initialPlans = (targetPatientId ? getInstantCache<TreatmentPlan[]>('patient_plans_' + targetPatientId) : null) || [];

    const [teeth, setTeeth] = useState<ToothCondition[]>(initialTeeth);
    const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>(initialPlans);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const persistTeeth = (nextTeeth: ToothCondition[]) => {
        if (!targetPatientId) return;
        setTeeth(nextTeeth);
        setCache('patient_teeth_' + targetPatientId, nextTeeth, 86400 * 30).catch(() => {});
    };

    const persistPlans = (nextPlans: TreatmentPlan[]) => {
        if (!targetPatientId) return;
        setTreatmentPlans(nextPlans);
        setCache('patient_plans_' + targetPatientId, nextPlans, 86400 * 30).catch(() => {});
    };

    useEffect(() => {
        mountedRef.current = true;
        if (!targetPatientId) return;
        const cachedT = getInstantCache<ToothCondition[]>('patient_teeth_' + targetPatientId);
        const cachedP = getInstantCache<TreatmentPlan[]>('patient_plans_' + targetPatientId);
        if (cachedT) setTeeth(cachedT);
        if (cachedP) setTreatmentPlans(cachedP);
        fetchData();
        return () => { mountedRef.current = false; };
    }, [targetPatientId]);

    const fetchData = async () => {
        if (!targetPatientId) return;

        const isUnsyncedPatient = isNaN(Number(targetPatientId));

        if (!navigator.onLine || isUnsyncedPatient) {
            try {
                const cachedTeeth = await getCache<ToothCondition[]>('patient_teeth_' + targetPatientId);
                const cachedPlans = await getCache<TreatmentPlan[]>('patient_plans_' + targetPatientId);
                if (mountedRef.current) {
                    if (cachedTeeth) setTeeth(cachedTeeth);
                    if (cachedPlans) setTreatmentPlans(cachedPlans);
                    setError(null);
                    setLoading(false);
                }
            } catch {}
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (treatmentPlans.length === 0) {
            setLoading(true);
        }

        try {
            // 1. Fetch Teeth Conditions
            const { data: dbTeeth, error: teethError } = await supabase
                .from('patient_teeth')
                .select('*')
                .eq('patient_id', targetPatientId);

            if (teethError) throw teethError;

            let currentTeeth = INITIAL_TEETH;
            if (dbTeeth && dbTeeth.length > 0) {
                currentTeeth = INITIAL_TEETH.map(initial => {
                    const found = dbTeeth.find(t => t.tooth_number === initial.number);
                    if (found) {
                        return {
                            ...initial,
                            condition: found.condition,
                            notes: found.notes || '',
                        };
                    }
                    return initial;
                });
            }

            // 2. Fetch Treatment Plans joined with Sessions
            const { data: dbPlans, error: plansError } = await supabase
                .from('tooth_treatment_plans')
                .select(`
                    *,
                    sessions:treatment_sessions(*)
                `)
                .eq('patient_id', targetPatientId)
                .order('created_at', { ascending: false });

            if (plansError) throw plansError;

            const mappedPlans: TreatmentPlan[] = (dbPlans || []).map(p => ({
                id: p.id,
                patientId: String(p.patient_id),
                toothNumber: p.tooth_number || 0,
                toothNumbers: p.tooth_numbers || undefined,
                type: (p.treatment_type as any) || 'general',
                status: p.status,
                totalSessions: p.session_count,
                completedSessions: p.completed_sessions,
                progress: p.session_count > 0 ? Math.round((p.completed_sessions / p.session_count) * 100) : 0,
                cost: p.estimated_cost,
                paid: p.paid || 0,
                startDate: p.estimated_start_date || (p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                notes: p.treatment_description || '',
                doctor: p.assigned_doctor,
                sessions: (p.sessions || [])
                    .sort((a: any, b: any) => a.session_number - b.session_number)
                    .map((s: any) => {
                        let parsedNotes = {};
                        if (s.notes) {
                            try {
                                parsedNotes = typeof s.notes === 'string' ? JSON.parse(s.notes) : s.notes;
                            } catch {}
                        }
                        return {
                            id: s.id,
                            number: s.session_number,
                            title: s.procedure_name,
                            status: s.session_status === 'scheduled' ? 'pending' : s.session_status,
                            duration: s.duration_minutes || 0,
                            schemaId: s.phase_name || 'general',
                            data: parsedNotes
                        };
                    })
            }));

            if (mountedRef.current) {
                persistTeeth(currentTeeth);
                persistPlans(mappedPlans);
                setError(null);
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            try {
                const cachedTeeth = await getCache<ToothCondition[]>('patient_teeth_' + targetPatientId);
                const cachedPlans = await getCache<TreatmentPlan[]>('patient_plans_' + targetPatientId);
                if (mountedRef.current) {
                    if (cachedTeeth) setTeeth(cachedTeeth);
                    if (cachedPlans) setTreatmentPlans(cachedPlans);
                    setError(null);
                    return;
                }
            } catch {}
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const updateTooth = async (toothNumber: number, condition: string, notes: string) => {
        if (!targetPatientId || toothNumber === 0) return;

        const nextTeeth = teeth.map(t => t.number === toothNumber ? { ...t, condition: condition as any, notes } : t);
        persistTeeth(nextTeeth);

        const upsertPayload = {
            patient_id: Number.isNaN(Number(targetPatientId)) ? targetPatientId : Number(targetPatientId),
            tooth_number: toothNumber,
            condition,
            notes,
            updated_at: new Date().toISOString()
        };

        if (!navigator.onLine || isNaN(Number(targetPatientId))) {
            await addToSyncQueue('UPSERT', 'patient_teeth', `${targetPatientId}_${toothNumber}`, upsertPayload);
            toast.success('تم حفظ حالة السن محلياً');
            return;
        }

        try {
            const { error } = await supabase
                .from('patient_teeth')
                .upsert(upsertPayload, { onConflict: 'patient_id,tooth_number' });

            if (error) throw error;
        } catch {
            await addToSyncQueue('UPSERT', 'patient_teeth', `${targetPatientId}_${toothNumber}`, upsertPayload);
            toast.info('تم حفظ حالة السن محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const addPlan = async (plan: TreatmentPlan) => {
        if (!targetPatientId || !user) return;

        const planUuid = plan.id && !plan.id.startsWith('plan-') ? plan.id : crypto.randomUUID();
        const normalizedSessions = plan.sessions.map(s => ({
            ...s,
            id: s.id && !s.id.startsWith('sess-') ? s.id : crypto.randomUUID()
        }));
        const normalizedPlan: TreatmentPlan = {
            ...plan,
            id: planUuid,
            patientId: targetPatientId,
            sessions: normalizedSessions
        };

        persistPlans([normalizedPlan, ...treatmentPlans]);

        const planInsertPayload = {
            id: planUuid,
            patient_id: Number.isNaN(Number(targetPatientId)) ? targetPatientId : Number(targetPatientId),
            tooth_number: normalizedPlan.toothNumber,
            tooth_numbers: normalizedPlan.toothNumbers || null,
            treatment_type: normalizedPlan.type,
            status: 'planned',
            overall_status: 'needs_treatment',
            session_count: normalizedPlan.totalSessions,
            completed_sessions: 0,
            estimated_cost: normalizedPlan.cost,
            diagnosis: normalizedPlan.notes,
            treatment_description: normalizedPlan.notes,
            assigned_doctor: normalizedPlan.doctor || (user as any).user_metadata?.full_name || user.name || user.email || 'الطبيب',
            created_by: user.id
        };

        const sessionsToInsert = normalizedSessions.map(s => ({
            id: s.id,
            plan_id: planUuid,
            session_number: s.number,
            session_date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            procedure_name: s.title,
            session_status: 'scheduled',
            duration_minutes: s.duration,
            phase_name: s.schemaId,
            notes: JSON.stringify(s.data || {})
        }));

        const queueOfflinePlan = async () => {
            await addToSyncQueue('INSERT', 'tooth_treatment_plans', planUuid, planInsertPayload);
            for (const sPayload of sessionsToInsert) {
                await addToSyncQueue('INSERT', 'treatment_sessions', sPayload.id, sPayload);
            }
        };

        if (!navigator.onLine || isNaN(Number(targetPatientId))) {
            await queueOfflinePlan();
            toast.success('تم إنشاء خطة العلاج محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return;
        }

        try {
            const { data: planData, error: planError } = await supabase
                .from('tooth_treatment_plans')
                .insert(planInsertPayload)
                .select()
                .single();

            if (planError) throw planError;

            const finalSessions = sessionsToInsert.map(s => ({
                ...s,
                plan_id: planData.id
            }));

            const { error: sessionsError } = await supabase
                .from('treatment_sessions')
                .insert(finalSessions);

            if (sessionsError) throw sessionsError;

            toast.success('تم إنشاء خطة العلاج بنجاح');
            fetchData();
        } catch {
            await queueOfflinePlan();
            toast.info('تم حفظ خطة العلاج محلياً (ستتم المزامنة عند توفر الإنترنت)');
        }
    };

    const updateSession = async (planId: string, sessionId: string, data: any) => {
        if (!targetPatientId) return;

        const nextPlans = treatmentPlans.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                sessions: p.sessions.map(s => s.id === sessionId ? { ...s, data } : s)
            };
        });
        persistPlans(nextPlans);

        if (sessionId.startsWith('sess-')) return;

        const payload = { notes: JSON.stringify(data) };

        if (!navigator.onLine) {
            await addToSyncQueue('UPDATE', 'treatment_sessions', sessionId, payload);
            return;
        }

        try {
            const { error } = await supabase
                .from('treatment_sessions')
                .update(payload)
                .eq('id', sessionId);

            if (error) throw error;
        } catch {
            await addToSyncQueue('UPDATE', 'treatment_sessions', sessionId, payload);
        }
    };

    const updatePlan = async (planId: string, updates: Partial<TreatmentPlan>) => {
        if (!targetPatientId) return;

        const nextPlans = treatmentPlans.map(p => p.id === planId ? { ...p, ...updates } : p);
        persistPlans(nextPlans);

        const dbUpdates: Record<string, any> = {};
        if (updates.paid !== undefined) dbUpdates.paid = updates.paid;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.cost !== undefined) dbUpdates.estimated_cost = updates.cost;
        if (updates.notes !== undefined) dbUpdates.treatment_description = updates.notes;

        if (Object.keys(dbUpdates).length === 0) return;

        if (!navigator.onLine) {
            await addToSyncQueue('UPDATE', 'tooth_treatment_plans', planId, dbUpdates);
            return;
        }

        try {
            const { error } = await supabase
                .from('tooth_treatment_plans')
                .update(dbUpdates)
                .eq('id', planId);
            if (error) throw error;
        } catch {
            await addToSyncQueue('UPDATE', 'tooth_treatment_plans', planId, dbUpdates);
        }
    };

    const completeSession = async (planId: string, sessionId: string, cost: number) => {
        if (!targetPatientId) return;

        let newCompletedCount = 1;
        let totalSessionCount = 1;

        const nextPlans = treatmentPlans.map(p => {
            if (p.id !== planId) return p;
            const updatedSessions = p.sessions.map(s => s.id === sessionId ? { ...s, status: 'completed' as const } : s);
            const completedCount = updatedSessions.filter(s => s.status === 'completed').length;
            newCompletedCount = completedCount;
            totalSessionCount = p.totalSessions || 1;
            const nextStatus = completedCount >= totalSessionCount ? 'completed' : 'in_progress';
            return {
                ...p,
                status: nextStatus as any,
                sessions: updatedSessions,
                completedSessions: completedCount,
                progress: Math.round((completedCount / totalSessionCount) * 100)
            };
        });
        persistPlans(nextPlans);

        const sessionUpdatePayload = {
            session_status: 'completed',
            amount_charged: cost,
            updated_at: new Date().toISOString()
        };
        const nextPlanStatus = newCompletedCount >= totalSessionCount ? 'completed' : 'in_progress';
        const planUpdatePayload = {
            completed_sessions: newCompletedCount,
            status: nextPlanStatus,
            overall_status: nextPlanStatus === 'completed' ? 'post_treatment' : 'in_progress'
        };

        if (!navigator.onLine) {
            await addToSyncQueue('UPDATE', 'treatment_sessions', sessionId, sessionUpdatePayload);
            await addToSyncQueue('UPDATE', 'tooth_treatment_plans', planId, planUpdatePayload);
            toast.success('تم إكمال الجلسة محلياً');
            return;
        }

        try {
            const { error: sessionError } = await supabase
                .from('treatment_sessions')
                .update(sessionUpdatePayload)
                .eq('id', sessionId);

            if (sessionError) throw sessionError;

            await supabase
                .from('tooth_treatment_plans')
                .update(planUpdatePayload)
                .eq('id', planId);

            toast.success('تم إكمال الجلسة');
        } catch {
            await addToSyncQueue('UPDATE', 'treatment_sessions', sessionId, sessionUpdatePayload);
            await addToSyncQueue('UPDATE', 'tooth_treatment_plans', planId, planUpdatePayload);
            toast.info('تم إكمال الجلسة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const deletePlan = async (planId: string) => {
        if (!targetPatientId) return;

        persistPlans(treatmentPlans.filter(p => p.id !== planId));

        if (!navigator.onLine) {
            await addToSyncQueue('DELETE', 'tooth_treatment_plans', planId, {});
            toast.success('تم حذف الخطة محلياً');
            return;
        }

        try {
            const { error } = await supabase
                .from('tooth_treatment_plans')
                .delete()
                .eq('id', planId);

            if (error) throw error;
            toast.success('تم حذف الخطة');
        } catch {
            await addToSyncQueue('DELETE', 'tooth_treatment_plans', planId, {});
            toast.info('تم حذف الخطة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return {
        teeth,
        treatmentPlans,
        updateTooth,
        addPlan,
        updateSession,
        updatePlan,
        completeSession,
        deletePlan,
        loading,
        error
    };
};
