import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

export const useClinicReports = (clinicId: string, period: string = 'month') => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ClinicReportsData>({
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
            collectionRate: 0,
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
    });

    useEffect(() => {
        if (clinicId) {
            fetchReports();
        }
    }, [clinicId, period]);

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

    const formatStaffRole = (s: any) => {
        if (s.role_title && s.role_title.trim()) return s.role_title.trim();
        if (s.department && s.department.trim()) return s.department.trim();
        
        const roleKey = (s.position || s.role || '').toLowerCase();
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

    const fetchReports = async () => {
        try {
            setLoading(true);
            const now = new Date();

            // Calculate active period boundaries
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

            const oneYearAgo = startOfMonth(subMonths(now, 11)).toISOString();

            let txQuery = supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId);
            if (period !== 'all') {
                txQuery = txQuery.gte('transaction_date', oneYearAgo);
            }

            // Parallel Data Fetching
            const [
                { data: rawAppointments },
                { count: patientCount },
                { data: rawStaff },
                { data: revenueData },
                { data: rawPlans },
                { data: rawPatients }
            ] = await Promise.all([
                supabase.from('appointments').select('*').eq('clinic_id', clinicId),
                supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).is('deleted_at', null),
                supabase.from('staff').select('*').eq('clinic_id', clinicId),
                txQuery,
                supabase.from('tooth_treatment_plans').select('*').eq('clinic_id', clinicId),
                supabase.from('patients').select('id, name, full_name, phone').eq('clinic_id', clinicId).is('deleted_at', null)
            ]);

            // Normalization
            const allTransactions = revenueData || [];
            const allPlans = rawPlans || [];
            const allStaff = rawStaff || [];
            const patientsMap = new Map<string, any>();
            (rawPatients || []).forEach(p => {
                patientsMap.set(p.id?.toString(), p);
            });

            const mappedAppointments = (rawAppointments || []).map((a: any) => ({
                id: a.id,
                date: a.appointment_date || a.date || a.created_at,
                type: a.type || a.appointment_type || 'consultation',
                status: a.status || 'confirmed',
                doctorId: a.staff_id?.toString(),
                doctorName: a.doctor_name || a.staff?.full_name,
                patientId: a.patient_id?.toString()
            }));

            // Filter transactions for current period
            const currentPeriodRevenueData = allTransactions.filter(t => {
                if (period === 'all') return true;
                if (!t.transaction_date) return false;
                const d = new Date(t.transaction_date);
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

            const totalPatients = patientCount || 0;
            const avgPatientValue = totalPatients > 0 ? Math.round(monthlyRevenue / totalPatients) : 0;

            // 2. Real Monthly Trend (Last 6 Months)
            const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
                const d = subMonths(now, 5 - i);
                const engMonth = format(d, 'MMMM');
                const monthName = arabicMonths[engMonth] || engMonth;
                const monthKey = format(d, 'yyyy-MM');
                
                const monthlyRev = allTransactions
                    .filter(t => {
                        if (t.type !== 'income' || !t.transaction_date) return false;
                        const date = new Date(t.transaction_date);
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
                if (!apt.date) return false;
                const d = new Date(apt.date);
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

            const typesMap = activeAppointments.reduce((acc: any, curr) => {
                const rawType = (curr.type || 'consultation').toLowerCase();
                acc[rawType] = (acc[rawType] || 0) + 1;
                return acc;
            }, {});

            const appointmentTypes = Object.entries(typesMap).map(([originalName, count]: [string, any], index) => ({
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
                const staffIdStr = s.id?.toString();
                const staffName = s.full_name || s.name || '';
                
                // Doctor's appointments in the period
                const docApps = activeAppointments.filter(a => 
                    (a.doctorId && a.doctorId === staffIdStr) || 
                    (a.doctorName && staffName && (a.doctorName.includes(staffName) || staffName.includes(a.doctorName)))
                );
                const appCount = docApps.length;
                const docCompleted = docApps.filter(a => a.status === 'completed').length;
                const docCompletionRate = appCount > 0 ? Math.round((docCompleted / appCount) * 100) : 100;

                // Revenue generated by this doctor from transactions in period
                const docIncomeTxs = currentPeriodRevenueData.filter(t => 
                    t.type === 'income' && (
                        (t.doctor_id && t.doctor_id?.toString() === staffIdStr) ||
                        (t.doctor_name && staffName && (t.doctor_name.includes(staffName) || staffName.includes(t.doctor_name)))
                    )
                );
                const revenueGenerated = docIncomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

                // Commission
                const isDoctor = s.position === 'doctor' || s.role === 'doctor' || s.role_title?.includes('طبيب') || s.role_title?.includes('أخصائي');
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
            // Combine data from tooth_treatment_plans and appointments
            const procMap = new Map<string, { count: number; totalRevenue: number }>();

            allPlans.forEach((plan: any) => {
                const rawType = (plan.treatment_type || 'general').toLowerCase();
                const typeName = procedureTypeNames[rawType] || plan.treatment_description || arabicAppointmentTypes[rawType] || rawType;
                const cost = parseFloat(plan.cost) || 0;
                
                const existing = procMap.get(typeName) || { count: 0, totalRevenue: 0 };
                procMap.set(typeName, {
                    count: existing.count + 1,
                    totalRevenue: existing.totalRevenue + cost
                });
            });

            // If plans are few, also aggregate appointment types
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
                    const createdDate = plan.created_at ? new Date(plan.created_at) : now;
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

                    const patientObj = patientsMap.get(plan.patient_id?.toString());
                    debtorsList.push({
                        id: plan.id?.toString(),
                        patientId: plan.patient_id?.toString() || '',
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

            // Overall efficiency
            const avgRating = allStaff.reduce((acc, curr) =>
                acc + (curr.performance_stats?.rating || 0), 0) / (allStaff.length || 1);
            const staffEfficiency = Math.round((avgRating || 0) * 20);

            setStats({
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
            });

        } catch (error) {
            console.error('Error fetching clinic reports:', error);
        } finally {
            setLoading(false);
        }
    };

    return { stats, loading, refresh: fetchReports };
};

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
