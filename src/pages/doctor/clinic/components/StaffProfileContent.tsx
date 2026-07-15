import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Calendar, Clock, Star, TrendingUp, DollarSign, Briefcase, CalendarCheck, Settings } from 'lucide-react';
import { formatDate, formatCurrency } from '../../../../lib/utils';
import { StaffMember, useStaff } from '../../../../hooks/useStaff';
import { useFinance } from '../../../../hooks/useFinance';
import { useAppointments } from '../../../../hooks/useAppointments';
import { supabase } from '../../../../lib/supabase';

interface StaffProfileContentProps {
    staff: StaffMember;
    onClose: () => void;
    clinicId?: string;
}

export const StaffProfileContent: React.FC<StaffProfileContentProps> = ({ staff, onClose, clinicId }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'cases' | 'attendance' | 'settings'>('overview');
    const { updateStaff } = useStaff(clinicId);
    const { transactions, loading: loadingFinance } = useFinance(clinicId, undefined, staff.id);
    const { appointments, loading: loadingAppointments } = useAppointments(clinicId);
    
    // Treatment plans state
    const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);

    // Filter appointments for this doctor
    const assignedCases = appointments.filter(a => a.doctorId === staff.id);

    // Calculate Financial Stats
    const salaries = transactions.filter(t => t.category === 'salary');
    const commissions = transactions.filter(t => t.category === 'commission' || (t.type === 'income' && t.doctorId === staff.id));
    
    const incomeGenerated = transactions.filter(t => t.type === 'income' && t.doctorId === staff.id).reduce((sum, t) => sum + t.amount, 0);
    const totalSalariesPaid = salaries.reduce((sum, t) => sum + t.amount, 0);

    // Dynamic Due & Balance calculation
    let dueAmount = 0;
    if (!staff.salary_type || staff.salary_type === 'monthly') {
        dueAmount = staff.salary || 0;
    } else if (staff.salary_type === 'daily') {
        dueAmount = (staff.attendance?.present || 0) * (staff.salary || 0);
    } else if (staff.salary_type === 'percentage') {
        dueAmount = incomeGenerated * ((staff.salary || 0) / 100);
    }
    const balance = Math.max(0, dueAmount - totalSalariesPaid);

    // Fetch Treatment Plans assigned to this staff member
    useEffect(() => {
        if (activeTab === 'cases') {
            const fetchPlans = async () => {
                setLoadingPlans(true);
                try {
                    const doctorFilters = [`assigned_doctor.ilike.%${staff.name}%`];
                    if (staff.userId) doctorFilters.push(`created_by.eq.${staff.userId}`);
                    if (staff.authUserId) doctorFilters.push(`created_by.eq.${staff.authUserId}`);
                    
                    const { data, error } = await supabase
                        .from('tooth_treatment_plans')
                        .select(`
                            *,
                            patients(full_name)
                        `)
                        .or(doctorFilters.join(','));

                    if (error) throw error;
                    setTreatmentPlans(data || []);
                } catch (err) {
                    console.error('Error fetching staff treatment plans:', err);
                } finally {
                    setLoadingPlans(false);
                }
            };
            fetchPlans();
        }
    }, [activeTab, staff.name, staff.userId, staff.authUserId]);

    const renderSalary = () => {
        if (staff.salary_type === 'percentage') {
            return `${staff.salary}%`;
        } else if (staff.salary_type === 'daily') {
            return `${(staff.salary || 0).toLocaleString()} د.ع / يومياً`;
        } else {
            return `${(staff.salary || 0).toLocaleString()} د.ع / شهرياً`;
        }
    };

    const renderOverview = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Personal Info */}
            <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الشخصية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">الاسم الكامل</label><p className="text-gray-900">{staff.name}</p></div>
                    <div><label className="block text-sm font-medium text-gray-700">الهاتف</label><p className="text-gray-900">{staff.phone}</p></div>
                    <div><label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label><p className="text-gray-900">{staff.email}</p></div>
                    <div><label className="block text-sm font-medium text-gray-700">القسم</label><p className="text-gray-900">{staff.department}</p></div>
                </div>
            </div>

            {/* Work Info */}
            {(staff.viewPreferences?.showWorkInfo ?? true) && (
                <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات العمل</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">المنصب</label><p className="text-gray-900">{staff.position}</p></div>
                        <div><label className="block text-sm font-medium text-gray-700">تاريخ التوظيف</label><p className="text-gray-900">{formatDate(staff.hireDate)}</p></div>
                        <div><label className="block text-sm font-medium text-gray-700">ساعات العمل</label><p className="text-gray-900">{staff.workSchedule.startTime} - {staff.workSchedule.endTime}</p></div>
                        <div><label className="block text-sm font-medium text-gray-700">قيمة الراتب</label><p className="text-gray-900 font-bold">{renderSalary()}</p></div>
                    </div>
                </div>
            )}

            {/* Skills */}
            <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">المهارات</h3>
                <div className="flex flex-wrap gap-2">
                    {staff.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{skill}</span>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderFinancials = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                    <h4 className="text-green-800 font-bold mb-1 text-sm">قيمة الراتب المتفق عليه</h4>
                    <p className="text-2xl font-bold text-green-600">
                        {staff.salary_type === 'percentage' ? `${staff.salary}` : (staff.salary || 0).toLocaleString()} 
                        <span className="text-xs font-normal text-gray-500">
                            {staff.salary_type === 'percentage' ? '%' : (staff.salary_type === 'daily' ? ' د.ع / يوم' : ' د.ع / شهر')}
                        </span>
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <h4 className="text-blue-800 font-bold mb-1 text-sm">إجمالي الإيرادات المحققة</h4>
                    <p className="text-2xl font-bold text-blue-600">
                        {incomeGenerated.toLocaleString()} <span className="text-xs font-normal text-gray-500">د.ع</span>
                    </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                    <h4 className="text-purple-800 font-bold mb-1 text-sm">إجمالي المستحقات</h4>
                    <p className="text-2xl font-bold text-purple-600">
                        {dueAmount.toLocaleString()} <span className="text-xs font-normal text-gray-500">د.ع</span>
                    </p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
                    <h4 className="text-red-800 font-bold mb-1 text-sm">الرواتب المستلمة (المدفوع)</h4>
                    <p className="text-2xl font-bold text-red-600">
                        {totalSalariesPaid.toLocaleString()} <span className="text-xs font-normal text-gray-500">د.ع</span>
                    </p>
                </div>
            </div>

            {/* Detailed Salary Settlement Card */}
            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">
                    تفاصيل تصفية الحساب المالي للموظف
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h4 className="font-bold text-sm text-gray-700">عقد العمل والاتفاق المالي:</h4>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>نوع الأجر / الراتب:</span>
                                <span className="font-bold text-gray-900">
                                    {staff.salary_type === 'percentage' && 'نسبة مئوية (%)'}
                                    {staff.salary_type === 'daily' && 'أجر يومي'}
                                    {(!staff.salary_type || staff.salary_type === 'monthly') && 'راتب شهري ثابت'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>قيمة الأجر المتفق عليه:</span>
                                <span className="font-bold text-gray-900">
                                    {staff.salary_type === 'percentage' ? `${staff.salary}%` : `${(staff.salary || 0).toLocaleString()} د.ع`}
                                </span>
                            </div>
                            {staff.salary_type === 'daily' && (
                                <div className="flex justify-between border-t pt-2 mt-2">
                                    <span>أيام الحضور (العمل الفعلية):</span>
                                    <span className="font-bold text-blue-600">{(staff.attendance?.present || 0)} يوم</span>
                                </div>
                            )}
                            {staff.salary_type === 'percentage' && (
                                <div className="flex justify-between border-t pt-2 mt-2">
                                    <span>إجمالي الإيرادات المحققة للطبيب:</span>
                                    <span className="font-bold text-green-600">{incomeGenerated.toLocaleString()} د.ع</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-bold text-sm text-gray-700">التصفية المتبقية:</h4>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>إجمالي المستحق المتراكم:</span>
                                <span className="font-bold text-gray-900">{dueAmount.toLocaleString()} د.ع</span>
                            </div>
                            <div className="flex justify-between">
                                <span>إجمالي المبالغ التي تم صرفها مسبقاً:</span>
                                <span className="font-bold text-amber-600">{totalSalariesPaid.toLocaleString()} د.ع</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 mt-2 font-bold text-sm bg-red-50/50 p-2 rounded">
                                <span className="text-red-900">صافي الرصيد المستحق (المتبقي للتصفية):</span>
                                <span className="text-red-700 text-base">
                                    {balance.toLocaleString()} د.ع
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-700">سجل المعاملات المالية</h3>
                </div>
                {loadingFinance ? (
                    <div className="p-8 text-center text-gray-500 font-medium">جاري التحميل...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">التاريخ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">النوع</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">التصنيف</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">المبلغ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">الملاحظات / التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-700">{formatDate(record.date)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                record.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {record.type === 'income' ? 'إيراد' : 'مصروف'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                                                {record.category === 'salary' ? 'رواتب' :
                                                 record.category === 'treatment' ? 'علاج مريض' :
                                                 record.category === 'consultation' ? 'كشفية' :
                                                 record.category}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-sm text-gray-900">{formatCurrency(record.amount)}</td>
                                        <td className="p-4 text-gray-500 text-xs max-w-xs truncate" title={record.description}>
                                            {record.description || '-'}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                            لا توجد سجلات معاملات مالية لهذا الموظف
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCases = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans" dir="rtl">
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">الخطط العلاجية المسندة ({treatmentPlans.length})</h3>
                </div>
                {loadingPlans ? (
                    <div className="p-8 text-center text-gray-500 font-medium">جاري التحميل...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">المريض</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">نوع العلاج</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">السن</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">إجمالي التكلفة</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">المدفوع</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">المتبقي المستحق</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {treatmentPlans.map(plan => {
                                    const cost = plan.estimated_cost || 0;
                                    const paid = plan.paid || 0;
                                    const remaining = Math.max(0, cost - paid);
                                    return (
                                        <tr key={plan.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-semibold text-gray-900">
                                                {plan.patients?.full_name || 'مريض غير معروف'}
                                            </td>
                                            <td className="p-4 text-sm text-gray-700">
                                                {plan.treatment_type === 'general' ? 'عام' : plan.treatment_type}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-600">
                                                {plan.tooth_number ? `سن ${plan.tooth_number}` : 'متعدد'}
                                            </td>
                                            <td className="p-4 font-bold text-sm text-gray-900">
                                                {cost.toLocaleString()} د.ع
                                            </td>
                                            <td className="p-4 font-semibold text-sm text-green-600">
                                                {paid.toLocaleString()} د.ع
                                            </td>
                                            <td className="p-4 font-semibold text-sm text-red-600">
                                                {remaining.toLocaleString()} د.ع
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                    plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    plan.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {plan.status === 'completed' ? 'مكتمل' :
                                                     plan.status === 'active' ? 'نشط' :
                                                     plan.status === 'planned' ? 'مخطط له' : plan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {treatmentPlans.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500 text-sm">
                                            لا توجد خطط علاجية مسجلة باسم هذا الطبيب
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    const renderAttendance = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <h4 className="text-green-800 font-bold mb-1">حضور</h4>
                    <p className="text-2xl font-bold text-green-600">{staff.attendance.present}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                    <h4 className="text-red-800 font-bold mb-1">غياب</h4>
                    <p className="text-2xl font-bold text-red-600">{staff.attendance.absent}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
                    <h4 className="text-yellow-800 font-bold mb-1">تأخير</h4>
                    <p className="text-2xl font-bold text-yellow-600">{staff.attendance.late}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <h4 className="text-blue-800 font-bold mb-1">إضافي</h4>
                    <p className="text-2xl font-bold text-blue-600">{staff.attendance.overtime}</p>
                </div>
            </div>

            <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
                <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>سجل الحضور التفصيلي قيد التطوير...</p>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border rounded-xl overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-900">تفضيلات العرض للموظف</h3>
                    <p className="text-sm text-gray-500">تحكم فيما يمكن لهذا الموظف رؤيته في ملفه الشخصي</p>
                </div>
                <div className="p-4 space-y-4">
                    <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                            <div className="font-medium text-gray-900">عرض البيانات المالية</div>
                            <div className="text-sm text-gray-500">السماح للموظف برؤية راتبه وعمولاته</div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={staff.viewPreferences?.showFinancials ?? true}
                                onChange={async (e) => {
                                    await updateStaff(staff.id, {
                                        viewPreferences: {
                                            ...staff.viewPreferences,
                                            showFinancials: e.target.checked
                                        }
                                    });
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                    </label>

                    <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                            <div className="font-medium text-gray-900">عرض الحالات المعالجة</div>
                            <div className="text-sm text-gray-500">السماح للموظف برؤية قائمة مرضاه وحالاتهم</div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={staff.viewPreferences?.showCases ?? true}
                                onChange={async (e) => {
                                    await updateStaff(staff.id, {
                                        viewPreferences: {
                                            ...staff.viewPreferences,
                                            showCases: e.target.checked
                                        }
                                    });
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                    </label>

                    <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div>
                            <div className="font-medium text-gray-900">عرض معلومات العمل</div>
                            <div className="text-sm text-gray-500">عرض المنصب، الراتب، وساعات العمل في الملف الشخصي</div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={staff.viewPreferences?.showWorkInfo ?? true}
                                onChange={async (e) => {
                                    await updateStaff(staff.id, {
                                        viewPreferences: {
                                            ...staff.viewPreferences,
                                            showWorkInfo: e.target.checked
                                        }
                                    });
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <div className="p-6 flex items-center justify-between pb-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{staff.name}</h2>
                        <p className="text-gray-500 mb-4">{staff.position} - {staff.department}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg mb-4"><X className="w-6 h-6 text-gray-500" /></button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 space-x-reverse space-x-6">
                    {[
                        { id: 'overview', label: 'نظرة عامة', icon: User },
                        { id: 'financial', label: 'المالية', icon: DollarSign },
                        { id: 'cases', label: 'الحالات', icon: Briefcase },
                        { id: 'attendance', label: 'الدوام', icon: CalendarCheck },
                        { id: 'settings', label: 'الإعدادات', icon: Settings },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 pb-4 px-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 font-bold'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'financial' && renderFinancials()}
                {activeTab === 'cases' && renderCases()}
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'settings' && renderSettings()}
            </div>
        </>
    );
};
