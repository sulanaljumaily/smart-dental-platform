import { useState, useEffect, useRef } from 'react';
import { supabase, ensureFreshOnlineSession } from '../lib/supabase';
import { db, getInstantCache, getCache, setCache } from '../lib/offline/db';
import { useAuth } from '../contexts/AuthContext';
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear,
    subMonths,
    format,
    differenceInDays
} from 'date-fns';

export interface DoctorStaffReport {
    id: string;
    name: string;
    role: string;
    appointmentsCount: number;
    completedCount: number;
    revenueGenerated: number;
    commissionRate: number;
    commissionAmount: number;
    completionRate: number;
}

export interface ProcedureReport {
    id: string;
    name: string;
    category: string;
    count: number;
    totalRevenue: number;
    percentage: number;
    avgCost: number;
    color: string;
}

export interface DebtorItem {
    id: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    treatmentDescription: string;
    totalCost: number;
    paid: number;
    remaining: number;
    daysOld: number;
    ageCategory: '0-30' | '31-60' | '60+';
}

export interface DebtAgingReport {
    totalOutstanding: number;
    totalCollected: number;
    collectionRate: number;
    totalDebtorsCount: number;
    aging0to30: { amount: number; count: number };
    aging31to60: { amount: number; count: number };
    aging60plus: { amount: number; count: number };
    debtorsList: DebtorItem[];
}

export interface AppointmentReport {
    total: number;
    completed: number;
    confirmed: number;
    cancelled: number;
    noShow: number;
    attendanceRate: number;
    cancellationRate: number;
    noShowRate: number;
    appointmentTypes: Array<{ name: string; count: number; percentage: number; color: string }>;
}

export interface ClinicReportsData {
    monthlyRevenue: number;
    monthlyExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalPatients: number;
    avgPatientValue: number;
    dailyAppointments: number;
    patientSatisfaction: number;
    staffEfficiency: number;
    monthlyTrend: Array<{ month: string; revenue: number }>;
    appointmentTypes: Array<{ name: string; count: number; percentage: number; color: string }>;
    staffStats: DoctorStaffReport[];
    procedureStats: ProcedureReport[];
    debtStats: DebtAgingReport;
    appointmentStats: AppointmentReport;
}

const EMPTY_REPORTS_DATA: ClinicReportsData = {
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    totalPatients: 0,
    avgPatientValue: 0,
    dailyAppointments: 0,
    patientSatisfaction: 94,
    staffEfficiency: 100,
    monthlyTrend: [],
    appointmentTypes: [],
    staffStats: [],
    procedureStats: [],
    debtStats: {
        totalOutstanding: 0,
        totalCollected: 0,
        collectionRate: 100,
        totalDebtorsCount: 0,
        aging0to30: { amount: 0, count: 0 },
        aging31to60: { amount: 0, count: 0 },
        aging60plus: { amount: 0, count: 0 },
        debtorsList: []
    },
    appointmentStats: {
        total: 0,
        completed: 0,
        confirmed: 0,
        cancelled: 0,
        noShow: 0,
        attendanceRate: 0,
        cancellationRate: 0,
        noShowRate: 0,
        appointmentTypes: []
    }
};

const reportsMemoryCache = new Map<string, ClinicReportsData>();

const arabicMonths: Record<string, string> = {
    'January': 'كانون الثاني',
    'February': 'شباط',
    'March': 'آذار',
    'April': 'نيسان',
    'May': 'أيار',
    'June': 'حزيران',
    'July': 'تموز',
    'August': 'آب',
    'September': 'أيلول',
    'October': 'تشرين الأول',
    'November': 'تشرين الثاني',
    'December': 'كانون الأول'
};

const arabicAppointmentTypes: Record<string, string> = {
    'consultation': 'كشف / استشارة',
    'treatment': 'علاج وتجميل',
    'emergency': 'طوارئ وألم حاد',
    'ortho': 'تقويم أسنان',
    'followup': 'متابعة ومراجعة',
    'general': 'طب أسنان عام',
    'surgery': 'جراحة وقلع',
    'implant': 'زراعة أسنان',
    'cleaning': 'تنظيف وتبييض',
    'كشف': 'كشف / استشارة',
    'كشف عام (أونلاين)': 'كشف عام (أونلاين)',
    'طب أسنان عام (مساعد ذكي)': 'طب أسنان عام (مساعد ذكي)',
    'علاج': 'علاج وتجميل',
    'طوارئ': 'طوارئ',
    'تقويم': 'تقويم أسنان',
    'متابعة': 'متابعة ومراجعة'
};

const procedureTypeNames: Record<string, string> = {
    'filling': 'حشوات تجميلية وكمبوزيت',
    'root_canal': 'علاج وجراحة عصب السن',
    'extraction': 'قلع عادي وجراحي',
    'crown': 'تركيبات وابتسامة هوليوود (Crown/Bridge)',
    'implant': 'زراعة الأسنان الفورية',
    'ortho': 'تقويم الأسنان الثابت والشفاف',
    'cleaning': 'تنظيف وتلميع الأسنان والتكلسات',
    'whitening': 'تبييض الأسنان بالليزر',
    'consultation': 'فحص سريري واستشارة',
    'general': 'علاجات الأسنان العامة',
    'surgery': 'جراحة الفم واللثة'
};

const procedureColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-orange-500'
];

const getColorForType = (type: string) => {
    const colors: Record<string, string> = {
        'consultation': 'bg-blue-500',
        'treatment': 'bg-emerald-500',
        'emergency': 'bg-rose-500',
        'ortho': 'bg-purple-500',
        'followup': 'bg-indigo-500',
        'surgery': 'bg-amber-500',
        'implant': 'bg-teal-500',
        'cleaning': 'bg-cyan-500',
        'general': 'bg-sky-500'
    };
    return colors[type] || 'bg-blue-500';
};

const formatStaffRole = (s: any) => {
    if (s.role_title && String(s.role_title).trim()) return String(s.role_title).trim();
    if (s.department && String(s.department).trim()) return String(s.department).trim();

    const roleKey = String(s.position || s.role || '').toLowerCase();
    const rolesMap: Record<string, string> = {
        'doctor': 'طبيب أسنان',
        'dentist': 'طبيب أسنان',
        'specialist': 'طبيب أخصائي',
        'surgeon': 'جراح فم وأسنان',
        'orthodontist': 'أخصائي تقويم',
        'assistant': 'مساعد طبيب',
        'nurse': 'تمريض',
        'receptionist': 'موظف استقبال',
        'reception': 'موظف استقبال',
        'accountant': 'محاسب مالي',
        'admin': 'إداري العيادة',
        'manager': 'مدير العيادة',
        'technician': 'فني مختبر / أشعة',
        'lab': 'فني مختبر'
    };
    return rolesMap[roleKey] || (roleKey ? roleKey : 'طبيب أسنان');
};

const safeParseDate = (value: any): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

function computeClinicReportsData(
    rawAppointments: any[],
    rawPatients: any[],
    rawStaff: any[],
    rawTransactions: any[],
    rawPlans: any[],
    period: string
): ClinicReportsData {
    const now = new Date();

    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;
    if (period === 'all') {
        periodStart = null;
        periodEnd = null;
    } else if (period === 'week') {
        periodStart = startOfWeek(now, { weekStartsOn: 6 });
        periodEnd = endOfWeek(now, { weekStartsOn: 6 });
    } else if (period === 'quarter') {
        periodStart = startOfQuarter(now);
        periodEnd = endOfQuarter(now);
    } else if (period === 'year') {
        periodStart = startOfYear(now);
        periodEnd = endOfYear(now);
    } else {
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
    }

    const allTransactions = rawTransactions || [];
    const allPlans = rawPlans || [];
    const allStaff = rawStaff || [];
    const patientsMap = new Map<string, any>();
    (rawPatients || []).forEach(p => {
        if (p && p.id !== undefined && p.id !== null) {
            patientsMap.set(String(p.id), p);
        }
    });

    const mappedAppointments = (rawAppointments || []).map((a: any) => ({
        id: a.id,
        date: a.appointment_date || a.date || a.created_at,
        type: a.type || a.appointment_type || 'consultation',
        status: a.status || 'confirmed',
        doctorId: a.staff_id?.toString() || a.doctorId?.toString() || a.doctor_id?.toString(),
        doctorName: a.doctor_name || a.doctorName || a.staff?.full_name,
        patientId: a.patient_id?.toString() || a.patientId?.toString(),
        cost: Number(a.cost) || 0
    }));

    // Filter transactions for current period
    const currentPeriodRevenueData = allTransactions.filter(t => {
        if (period === 'all') return true;
        const d = safeParseDate(t.transaction_date || t.date);
        if (!d) return false;
        return periodStart && periodEnd ? (d >= periodStart && d <= periodEnd) : true;
    });

    // 1. Revenue & Profit
    const monthlyRevenue = currentPeriodRevenueData
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const monthlyExpenses = currentPeriodRevenueData
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const netProfit = monthlyRevenue - monthlyExpenses;
    const profitMargin = monthlyRevenue > 0
        ? Math.round((netProfit / monthlyRevenue) * 100)
        : 0;

    const totalPatients = (rawPatients || []).length;
    const avgPatientValue = totalPatients > 0 ? Math.round(monthlyRevenue / totalPatients) : 0;

    // 2. Real Monthly Trend (Last 6 Months)
    const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(now, 5 - i);
        const engMonth = format(d, 'MMMM');
        const monthName = arabicMonths[engMonth] || engMonth;
        const monthKey = format(d, 'yyyy-MM');

        const monthlyRev = allTransactions
            .filter(t => {
                if (t.type !== 'income') return false;
                const date = safeParseDate(t.transaction_date || t.date);
                if (!date) return false;
                return format(date, 'yyyy-MM') === monthKey;
            })
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        return {
            month: monthName,
            revenue: monthlyRev
        };
    });

    // 3. Appointments & Attendance Stats
    const periodAppointments = mappedAppointments.filter(apt => {
        if (period === 'all') return true;
        const d = safeParseDate(apt.date);
        if (!d) return false;
        return periodStart && periodEnd ? (d >= periodStart && d <= periodEnd) : true;
    });
    const activeAppointments = periodAppointments.length > 0 ? periodAppointments : mappedAppointments;
    const totalApps = activeAppointments.length;

    const completedApps = activeAppointments.filter(a => a.status === 'completed').length;
    const cancelledApps = activeAppointments.filter(a => a.status === 'cancelled').length;
    const noShowApps = activeAppointments.filter(a => a.status === 'noshow' || a.status === 'no_show').length;
    const confirmedApps = Math.max(0, totalApps - completedApps - cancelledApps - noShowApps);

    const attendanceRate = totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0;
    const cancellationRate = totalApps > 0 ? Math.round((cancelledApps / totalApps) * 100) : 0;
    const noShowRate = totalApps > 0 ? Math.round((noShowApps / totalApps) * 100) : 0;

    const typesMap = activeAppointments.reduce((acc: Record<string, number>, curr) => {
        const rawType = String(curr.type || 'consultation').toLowerCase();
        acc[rawType] = (acc[rawType] || 0) + 1;
        return acc;
    }, {});

    const appointmentTypes = Object.entries(typesMap).map(([originalName, count]) => ({
        name: arabicAppointmentTypes[originalName] || originalName,
        count,
        percentage: totalApps > 0 ? Math.round((count / totalApps) * 100) : 0,
        color: getColorForType(originalName)
    }));

    const appointmentStats: AppointmentReport = {
        total: totalApps,
        completed: completedApps,
        confirmed: confirmedApps,
        cancelled: cancelledApps,
        noShow: noShowApps,
        attendanceRate,
        cancellationRate,
        noShowRate,
        appointmentTypes
    };

    // 4. Staff / Doctor Performance
    const staffStats: DoctorStaffReport[] = allStaff.map(s => {
        const staffIdStr = String(s.id ?? '');
        const staffName = s.full_name || s.name || '';

        const docApps = activeAppointments.filter(a =>
            (a.doctorId && a.doctorId === staffIdStr) ||
            (a.doctorName && staffName && (a.doctorName.includes(staffName) || staffName.includes(a.doctorName)))
        );
        const appCount = docApps.length;
        const docCompleted = docApps.filter(a => a.status === 'completed').length;
        const docCompletionRate = appCount > 0 ? Math.round((docCompleted / appCount) * 100) : 100;

        const docIncomeTxs = currentPeriodRevenueData.filter(t => {
            if (t.type !== 'income') return false;
            const txDocId = t.staff_record_id ?? t.doctor_id ?? t.doctorId ?? t.staffId;
            const txDocName = t.doctor_name || t.doctorName || '';
            return (
                (txDocId !== undefined && txDocId !== null && String(txDocId) === staffIdStr) ||
                (txDocName && staffName && (txDocName.includes(staffName) || staffName.includes(txDocName)))
            );
        });
        const revenueGenerated = docIncomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const isDoctor =
            s.position === 'doctor' ||
            s.role === 'doctor' ||
            String(s.role_title || '').includes('طبيب') ||
            String(s.role_title || '').includes('أخصائي');
        const commissionRate = parseFloat(s.commission_rate) || (isDoctor ? 30 : 0);
        const commissionAmount = Math.round(revenueGenerated * (commissionRate / 100));

        return {
            id: staffIdStr,
            name: staffName || 'طبيب / كادر',
            role: formatStaffRole(s),
            appointmentsCount: appCount,
            completedCount: docCompleted,
            revenueGenerated,
            commissionRate,
            commissionAmount,
            completionRate: docCompletionRate
        };
    });

    // 5. Top Procedures & Treatments
    const procMap = new Map<string, { count: number; totalRevenue: number }>();

    allPlans.forEach((plan: any) => {
        const rawType = String(plan.treatment_type || 'general').toLowerCase();
        const typeName = procedureTypeNames[rawType] || plan.treatment_description || arabicAppointmentTypes[rawType] || rawType;
        const cost = parseFloat(plan.cost) || 0;

        const existing = procMap.get(typeName) || { count: 0, totalRevenue: 0 };
        procMap.set(typeName, {
            count: existing.count + 1,
            totalRevenue: existing.totalRevenue + cost
        });
    });

    if (allPlans.length < 5) {
        activeAppointments.forEach((a: any) => {
            const typeName = arabicAppointmentTypes[a.type] || a.type || 'كشف واستشارة';
            const existing = procMap.get(typeName) || { count: 0, totalRevenue: 0 };
            procMap.set(typeName, {
                count: existing.count + 1,
                totalRevenue: existing.totalRevenue + (a.cost || 25000)
            });
        });
    }

    const totalProceduresCount = Array.from(procMap.values()).reduce((sum, p) => sum + p.count, 0);
    const procedureStats: ProcedureReport[] = Array.from(procMap.entries())
        .map(([name, data], idx) => ({
            id: `proc-${idx}`,
            name,
            category: 'إجراء طبي',
            count: data.count,
            totalRevenue: data.totalRevenue,
            percentage: totalProceduresCount > 0 ? Math.round((data.count / totalProceduresCount) * 100) : 0,
            avgCost: data.count > 0 ? Math.round(data.totalRevenue / data.count) : 0,
            color: procedureColors[idx % procedureColors.length]
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 6. Aging Receivables & Debts Analysis
    let totalOutstanding = 0;
    let totalCollected = 0;
    const debtorsList: DebtorItem[] = [];
    let aging0to30 = { amount: 0, count: 0 };
    let aging31to60 = { amount: 0, count: 0 };
    let aging60plus = { amount: 0, count: 0 };

    allPlans.forEach((plan: any) => {
        if (plan.status === 'cancelled') return;
        const cost = parseFloat(plan.cost) || 0;
        const paid = parseFloat(plan.paid) || 0;
        const remaining = Math.max(0, cost - paid);

        totalCollected += paid;

        if (remaining > 0) {
            totalOutstanding += remaining;
            const createdDate = safeParseDate(plan.created_at) || now;
            const daysOld = Math.max(0, differenceInDays(now, createdDate));

            let ageCategory: '0-30' | '31-60' | '60+';
            if (daysOld <= 30) {
                ageCategory = '0-30';
                aging0to30.amount += remaining;
                aging0to30.count += 1;
            } else if (daysOld <= 60) {
                ageCategory = '31-60';
                aging31to60.amount += remaining;
                aging31to60.count += 1;
            } else {
                ageCategory = '60+';
                aging60plus.amount += remaining;
                aging60plus.count += 1;
            }

            const patientObj = patientsMap.get(String(plan.patient_id ?? ''));
            debtorsList.push({
                id: String(plan.id ?? `debt-${debtorsList.length}`),
                patientId: String(plan.patient_id ?? ''),
                patientName: patientObj?.full_name || patientObj?.name || 'مراجع مسجل',
                patientPhone: patientObj?.phone || '',
                treatmentDescription: plan.treatment_description || procedureTypeNames[plan.treatment_type] || 'خطة علاجية',
                totalCost: cost,
                paid,
                remaining,
                daysOld,
                ageCategory
            });
        }
    });

    const collectionRate = (totalCollected + totalOutstanding) > 0
        ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
        : 100;

    const debtStats: DebtAgingReport = {
        totalOutstanding,
        totalCollected,
        collectionRate,
        totalDebtorsCount: debtorsList.length,
        aging0to30,
        aging31to60,
        aging60plus,
        debtorsList: debtorsList.sort((a, b) => b.remaining - a.remaining)
    };

    const avgRating = allStaff.reduce((acc, curr) =>
        acc + (curr.performance_stats?.rating || curr.performance?.rating || 0), 0) / (allStaff.length || 1);
    const staffEfficiency = Math.round((avgRating || 0) * 20);

    return {
        monthlyRevenue,
        monthlyExpenses,
        netProfit,
        profitMargin,
        totalPatients,
        avgPatientValue,
        dailyAppointments: Math.max(1, Math.round(totalApps / (period === 'week' ? 7 : period === 'year' ? 365 : 30))),
        patientSatisfaction: 94,
        staffEfficiency: staffEfficiency > 0 ? staffEfficiency : 100,
        monthlyTrend,
        appointmentTypes,
        staffStats,
        procedureStats,
        debtStats,
        appointmentStats
    };
}

export const useClinicReports = (clinicId: string, period: string = 'month') => {
    const { user } = useAuth();
    const cacheKey = `clinic_reports_${clinicId}_${period}`;
    const mountedRef = useRef(true);

    const readSyncCached = (): ClinicReportsData | null => {
        if (!clinicId) return null;
        const mem = reportsMemoryCache.get(cacheKey);
        if (mem) return mem;
        const instant = getInstantCache<ClinicReportsData>(cacheKey);
        if (instant) {
            reportsMemoryCache.set(cacheKey, instant);
            return instant;
        }
        return null;
    };

    const initial = readSyncCached();
    const [stats, setStats] = useState<ClinicReportsData>(initial || EMPTY_REPORTS_DATA);
    const [loading, setLoading] = useState<boolean>(
        initial === null && !!clinicId && (typeof navigator === 'undefined' || navigator.onLine)
    );

    const applyStats = (nextStats: ClinicReportsData, persist = true) => {
        reportsMemoryCache.set(cacheKey, nextStats);
        if (mountedRef.current) {
            setStats(nextStats);
        }
        if (persist) {
            setCache(cacheKey, nextStats, 86400 * 30).catch(() => {});
        }
    };

    const buildFromLocalData = async (): Promise<ClinicReportsData | null> => {
        if (!clinicId) return null;
        const cid = String(clinicId);
        try {
            const [allLocalApts, allLocalPatients, cachedRawStaff, cachedMappedStaff, cachedFinance, cachedPlans, cachedReport] = await Promise.all([
                db.appointments.toArray().catch(() => []),
                db.patients.toArray().catch(() => []),
                getCache<any[]>(`clinic_raw_staff_${cid}`),
                getCache<any[]>(`clinic_staff_${cid}`),
                getCache<any[]>(`finance_manual_tx_${cid}`),
                getCache<any[]>(`clinic_plans_${cid}`),
                getCache<ClinicReportsData>(cacheKey)
            ]);

            const localApts = allLocalApts
                .filter(la => String(la.clinic_id) === cid || String((la.data as any)?.clinic_id) === cid)
                .map(la => ({
                    ...((la.data as any) || {}),
                    id: la.id,
                    appointment_date: la.date || (la.data as any)?.appointment_date || (la.data as any)?.date,
                    status: la.status || (la.data as any)?.status
                }));

            const localPatients = allLocalPatients
                .filter(lp => String(lp.clinic_id) === cid || String((lp.data as any)?.clinic_id) === cid)
                .map(lp => ({
                    ...((lp.data as any) || {}),
                    id: lp.id,
                    full_name: lp.name || (lp.data as any)?.full_name || (lp.data as any)?.name,
                    phone: lp.phone || (lp.data as any)?.phone
                }));

            const localStaff =
                (Array.isArray(cachedRawStaff) && cachedRawStaff.length > 0 ? cachedRawStaff : null) ||
                (Array.isArray(cachedMappedStaff) && cachedMappedStaff.length > 0 ? cachedMappedStaff : null) ||
                getInstantCache<any[]>(`clinic_raw_staff_${cid}`) ||
                getInstantCache<any[]>(`clinic_staff_${cid}`) ||
                [];

            const localTx =
                (Array.isArray(cachedFinance) ? cachedFinance : null) ||
                getInstantCache<any[]>(`finance_manual_tx_${cid}`) ||
                [];

            const localPlans =
                (Array.isArray(cachedPlans) ? cachedPlans : null) ||
                getInstantCache<any[]>(`clinic_plans_${cid}`) ||
                [];

            const hasRawLocalData =
                localApts.length > 0 ||
                localPatients.length > 0 ||
                localStaff.length > 0 ||
                localTx.length > 0 ||
                localPlans.length > 0;

            if (hasRawLocalData) {
                return computeClinicReportsData(localApts, localPatients, localStaff, localTx, localPlans, period);
            }

            if (cachedReport) {
                return cachedReport;
            }
        } catch (err) {
            console.warn('[useClinicReports] Local compute fallback warning:', err);
        }
        return null;
    };

    useEffect(() => {
        mountedRef.current = true;
        if (clinicId) {
            const syncCached = readSyncCached();
            if (syncCached) {
                setStats(syncCached);
                setLoading(false);
            }
            fetchReports();
        } else {
            setLoading(false);
        }

        const handleRefresh = () => {
            if (clinicId) fetchReports();
        };

        window.addEventListener('dental-online-ready', handleRefresh);
        window.addEventListener('dental-auth-session-ready', handleRefresh);
        window.addEventListener('dental-sync-completed', handleRefresh);
        window.addEventListener('dental-clinic-preloaded', handleRefresh);

        return () => {
            mountedRef.current = false;
            window.removeEventListener('dental-online-ready', handleRefresh);
            window.removeEventListener('dental-auth-session-ready', handleRefresh);
            window.removeEventListener('dental-sync-completed', handleRefresh);
            window.removeEventListener('dental-clinic-preloaded', handleRefresh);
        };
    }, [clinicId, period, user?.id]);

    const fetchReports = async () => {
        if (!clinicId) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        // 1. Fast local load / compute immediately so UI is NEVER stuck loading
        const localComputed = await buildFromLocalData();
        if (localComputed) {
            applyStats(localComputed, false);
            if (mountedRef.current) setLoading(false);
        }

        if (!navigator.onLine) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        const authed = await ensureFreshOnlineSession();
        if (!authed) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (!localComputed && !readSyncCached() && mountedRef.current) {
            setLoading(true);
        }

        try {
            const now = new Date();
            const oneYearAgo = startOfMonth(subMonths(now, 11)).toISOString();

            let txQuery = supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId);
            if (period !== 'all') {
                txQuery = txQuery.gte('transaction_date', oneYearAgo);
            }

            // Fault-tolerant parallel fetching: one failing query NEVER breaks the entire Executive Report
            const [aptsRes, staffRes, txRes, plansRes, patientsRes] = await Promise.allSettled([
                supabase.from('appointments').select('*').eq('clinic_id', clinicId),
                supabase.from('staff').select('*').eq('clinic_id', clinicId),
                txQuery,
                supabase.from('tooth_treatment_plans').select('*').eq('clinic_id', clinicId),
                supabase.from('patients').select('id, full_name, phone').eq('clinic_id', clinicId).is('deleted_at', null)
            ]);

            const rawAppointments =
                aptsRes.status === 'fulfilled' && !aptsRes.value.error && Array.isArray(aptsRes.value.data)
                    ? aptsRes.value.data
                    : [];
            const rawStaff =
                staffRes.status === 'fulfilled' && !staffRes.value.error && Array.isArray(staffRes.value.data)
                    ? staffRes.value.data
                    : [];
            const rawTransactions =
                txRes.status === 'fulfilled' && !txRes.value.error && Array.isArray(txRes.value.data)
                    ? txRes.value.data
                    : [];
            const rawPatients =
                patientsRes.status === 'fulfilled' && !patientsRes.value.error && Array.isArray(patientsRes.value.data)
                    ? patientsRes.value.data
                    : [];

            let rawPlans =
                plansRes.status === 'fulfilled' && !plansRes.value.error && Array.isArray(plansRes.value.data)
                    ? plansRes.value.data
                    : null;

            // Fallback if tooth_treatment_plans doesn't filter by clinic_id in this schema
            if (rawPlans === null && rawPatients.length > 0) {
                try {
                    const patientIds = rawPatients.map((p: any) => p.id).filter(Boolean).slice(0, 500);
                    if (patientIds.length > 0) {
                        const { data: fbPlans } = await supabase
                            .from('tooth_treatment_plans')
                            .select('*')
                            .in('patient_id', patientIds);
                        if (Array.isArray(fbPlans)) {
                            rawPlans = fbPlans;
                        }
                    }
                } catch {}
            }

            const finalPlans = rawPlans || [];
            if (finalPlans.length > 0) {
                setCache(`clinic_plans_${clinicId}`, finalPlans, 86400 * 30).catch(() => {});
            }
            if (rawStaff.length > 0) {
                setCache(`clinic_raw_staff_${clinicId}`, rawStaff, 86400 * 30).catch(() => {});
            }

            const computed = computeClinicReportsData(
                rawAppointments,
                rawPatients,
                rawStaff,
                rawTransactions,
                finalPlans,
                period
            );

            applyStats(computed, true);
        } catch (error) {
            console.error('Error fetching clinic reports:', error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    return { stats, loading, refresh: fetchReports };
};
