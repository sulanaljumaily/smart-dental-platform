import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ClinicDepartment {
    id: string;
    clinicId: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
}

export const useClinicDepartments = (clinicId?: string) => {
    const [departments, setDepartments] = useState<ClinicDepartment[]>([]);
    const [loading, setLoading] = useState(true);

    const getLocalStorageKey = useCallback(() => `clinic_departments_${clinicId || 'default'}`, [clinicId]);

    const fetchDepartments = useCallback(async () => {
        if (!clinicId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Try Supabase
            const { data, error } = await supabase
                .from('clinic_departments')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('created_at', { ascending: true });

            if (!error && data && data.length > 0) {
                const mapped: ClinicDepartment[] = data.map((d: any) => ({
                    id: d.id.toString(),
                    clinicId: d.clinic_id.toString(),
                    name: d.name,
                    description: d.description || '',
                    isActive: d.is_active ?? true,
                    createdAt: d.created_at
                }));
                setDepartments(mapped);
                localStorage.setItem(getLocalStorageKey(), JSON.stringify(mapped));
                setLoading(false);
                return;
            }

            // If Supabase returned empty or error, check localStorage cache
            const localData = localStorage.getItem(getLocalStorageKey());
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setDepartments(parsed);
                        setLoading(false);
                        return;
                    }
                } catch {
                    // Ignore parse error
                }
            }

            // 2. Auto-seed with single department carrying clinic name if none exist
            let clinicName = 'العيادة الرئيسية';
            try {
                const numId = parseInt(clinicId, 10);
                const { data: clinicData } = await supabase
                    .from('clinics')
                    .select('name')
                    .eq('id', !isNaN(numId) ? numId : clinicId)
                    .single();
                if (clinicData?.name) {
                    clinicName = clinicData.name.trim();
                }
            } catch (err) {
                console.warn('Could not fetch clinic name, using fallback:', err);
            }

            const initialDept: ClinicDepartment = {
                id: 'dept-' + Date.now(),
                clinicId: clinicId.toString(),
                name: clinicName,
                description: 'القسم الرئيسي للعيادة',
                isActive: true,
                createdAt: new Date().toISOString()
            };

            // Try saving initial to Supabase if table exists
            try {
                const { data: inserted, error: insertErr } = await supabase
                    .from('clinic_departments')
                    .insert([{
                        clinic_id: !isNaN(parseInt(clinicId, 10)) ? parseInt(clinicId, 10) : clinicId,
                        name: initialDept.name,
                        description: initialDept.description,
                        is_active: true
                    }])
                    .select();

                if (!insertErr && inserted && inserted.length > 0) {
                    initialDept.id = inserted[0].id.toString();
                }
            } catch {
                // Table might not exist yet in DB, local state handles it seamlessly
            }

            const initialList = [initialDept];
            setDepartments(initialList);
            localStorage.setItem(getLocalStorageKey(), JSON.stringify(initialList));
        } catch (err) {
            console.error('Error in useClinicDepartments:', err);
            // Fallback from localStorage or guarantee default department
            const localData = localStorage.getItem(getLocalStorageKey());
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setDepartments(parsed);
                        setLoading(false);
                        return;
                    }
                } catch {
                    // Ignore
                }
            }
            // Absolute guarantee: at least one department with clinic name or default
            setDepartments([{
                id: 'dept-default',
                clinicId: clinicId ? clinicId.toString() : '1',
                name: 'العيادة الرئيسية',
                description: 'القسم الرئيسي للعيادة',
                isActive: true
            }]);
        } finally {
            setLoading(false);
        }
    }, [clinicId, getLocalStorageKey]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const addDepartment = async (name: string, description?: string) => {
        if (!name.trim() || !clinicId) return;

        const newDept: ClinicDepartment = {
            id: 'dept-' + Date.now(),
            clinicId: clinicId.toString(),
            name: name.trim(),
            description: description?.trim() || '',
            isActive: true,
            createdAt: new Date().toISOString()
        };

        // Optimistic UI update
        const updated = [...departments, newDept];
        setDepartments(updated);
        localStorage.setItem(getLocalStorageKey(), JSON.stringify(updated));

        // Try DB
        try {
            const { data, error } = await supabase
                .from('clinic_departments')
                .insert([{
                    clinic_id: clinicId,
                    name: newDept.name,
                    description: newDept.description,
                    is_active: true
                }])
                .select();

            if (!error && data && data.length > 0) {
                const realId = data[0].id.toString();
                const synced = updated.map(d => d.id === newDept.id ? { ...d, id: realId } : d);
                setDepartments(synced);
                localStorage.setItem(getLocalStorageKey(), JSON.stringify(synced));
            }
        } catch (err) {
            console.warn('Could not persist department to DB, saved locally:', err);
        }
    };

    const updateDepartment = async (id: string, updates: Partial<ClinicDepartment>) => {
        const updated = departments.map(d => d.id === id ? { ...d, ...updates } : d);
        setDepartments(updated);
        localStorage.setItem(getLocalStorageKey(), JSON.stringify(updated));

        // Try DB
        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
            if (updates.description !== undefined) dbUpdates.description = updates.description.trim();
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
            dbUpdates.updated_at = new Date().toISOString();

            await supabase
                .from('clinic_departments')
                .update(dbUpdates)
                .eq('id', id);
        } catch (err) {
            console.warn('Could not update department in DB, saved locally:', err);
        }
    };

    const deleteDepartment = async (id: string) => {
        const updated = departments.filter(d => d.id !== id);
        setDepartments(updated);
        localStorage.setItem(getLocalStorageKey(), JSON.stringify(updated));

        // Try DB
        try {
            await supabase
                .from('clinic_departments')
                .delete()
                .eq('id', id);
        } catch (err) {
            console.warn('Could not delete department from DB, deleted locally:', err);
        }
    };

    return {
        departments,
        loading,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        refresh: fetchDepartments
    };
};
