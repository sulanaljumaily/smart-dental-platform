
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface StaffMember {
    id: string; // Cast to string for frontend compatibility
    clinicId: string;
    name: string;
    phone: string;
    email: string;
    department: string;
    position: 'doctor' | 'assistant' | 'nurse' | 'receptionist' | 'admin' | 'technician';
    salary: number;
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    hireDate: string;
    address: string;
    qualifications: string[];
    certifications: string[];
    workSchedule: {
        days: string[];
        startTime: string;
        endTime: string;
        breaks: { start: string; end: string; duration: number }[];
    };
    attendance: { present: number; absent: number; late: number; overtime: number };
    performance: {
        rating: number;
        lastReview: string;
        achievements: string[];
        goals: string[];
    };
    skills: string[];
    languages: string[];
    notes: string;
    username?: string;
    password?: string;
    permissions: {
        appointments: boolean;
        patients: boolean;
        financials: boolean;
        settings: boolean;
        reports: boolean;
        // New permissions
        activityLog: boolean;
        assets: boolean;
        staff: boolean;
        lab: boolean;
    };
}

export const useStaff = (clinicId?: string) => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStaff();
    }, [clinicId]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('staff')
                .select('*');

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            }
            // else: RLS should handle filtering by owner/doctor

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                const mappedStaff: StaffMember[] = data.map((s: any) => ({
                    id: s.id.toString(),
                    clinicId: s.clinic_id?.toString() || clinicId,
                    name: s.full_name,
                    phone: s.phone,
                    email: s.email,
                    department: s.department,
                    position: (s.role_title as any) || 'doctor',
                    salary: s.salary,
                    status: s.status || (s.is_active ? 'active' : 'suspended'),
                    hireDate: s.join_date,
                    // ...
                    username: s.username,
                    password: s.password, // Only if allowed to read
                    address: s.address || '',
                    qualifications: s.qualifications || [],
                    certifications: s.certifications || [],
                    workSchedule: s.work_schedule || { days: [], startTime: '09:00', endTime: '17:00', breaks: [] },
                    attendance: s.attendance_stats || { present: 0, absent: 0, late: 0, overtime: 0 },
                    performance: s.performance_stats || { rating: 5, lastReview: '', achievements: [], goals: [] },
                    skills: s.skills || [],
                    languages: s.languages || ['العربية'],
                    notes: s.notes || '',
                    permissions: {
                        appointments: false,
                        patients: false,
                        financials: false,
                        settings: false,
                        reports: false,
                        activityLog: false,
                        assets: false,
                        staff: false,
                        lab: false,
                        ...s.permissions
                    }
                }));
                setStaff(mappedStaff);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
            toast.error('فشل تحميل بيانات الموظفين');
        } finally {
            setLoading(false);
        }
    };

    const addStaff = async (member: Omit<StaffMember, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('staff')
                .insert({
                    clinic_id: clinicId || undefined,
                    full_name: member.name,
                    role_title: member.position,
                    department: member.department,
                    salary: member.salary,
                    phone: member.phone,
                    email: member.email,
                    join_date: member.hireDate,
                    is_active: member.status === 'active',
                    status: member.status, // New field to fix the bug
                    username: member.username,
                    password: member.password,
                    address: member.address,
                    notes: member.notes,
                    work_schedule: member.workSchedule,
                    attendance_stats: member.attendance,
                    performance_stats: member.performance,
                    skills: member.skills,
                    languages: member.languages,
                    qualifications: member.qualifications,
                    certifications: member.certifications,
                    permissions: member.permissions
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('تمت إضافة الموظف بنجاح');
            fetchStaff(); // Refresh list
            return data;
        } catch (error) {
            console.error('Error adding staff:', error);
            toast.error('فشل إضافة الموظف');
        }
    };

    const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.full_name = updates.name;
            if (updates.position) dbUpdates.role_title = updates.position;
            if (updates.department) dbUpdates.department = updates.department;
            if (updates.salary) dbUpdates.salary = updates.salary;
            if (updates.phone) dbUpdates.phone = updates.phone;
            if (updates.email) dbUpdates.email = updates.email;
            if (updates.status) {
                dbUpdates.status = updates.status;
                dbUpdates.is_active = updates.status === 'active';
            }
            if (updates.permissions) dbUpdates.permissions = updates.permissions;
            if (updates.username) dbUpdates.username = updates.username;
            if (updates.password) dbUpdates.password = updates.password;

            const { error } = await supabase
                .from('staff')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            toast.success('تم التحديث بنجاح');
            fetchStaff();
        } catch (error) {
            console.error('Error updating staff:', error);
            toast.error('فشل التحديث');
        }
    };

    const logActivity = async (action: string, entityId: string, details: any) => {
        try {
            await supabase.from('activity_logs').insert({
                clinic_id: clinicId,
                action_type: action,
                entity_type: 'staff',
                entity_id: entityId,
                details
            });
        } catch (e) {
            console.error('Failed to log activity', e);
        }
    };

    return {
        staff,
        loading,
        addStaff: async (member: Omit<StaffMember, 'id'>) => {
            const result = await addStaff(member);
            if (result) {
                await logActivity('create_staff', result.id, { name: member.name, position: member.position });
            }
            return result;
        },
        updateStaff: async (id: string, updates: Partial<StaffMember>) => {
            await updateStaff(id, updates);
            await logActivity('update_staff', id, updates);
        },
        refresh: fetchStaff
    };
};
