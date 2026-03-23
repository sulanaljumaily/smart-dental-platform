import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface LabProfile {
    id?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    managerName: string;
    licenseNumber: string;
    workingHours: string;
    description: string;
    services: string[];
    avatar: string;
    delegates: {
        id: string;
        name: string;
        status: 'available' | 'busy' | 'offline';
        isAvailable: boolean;
    }[];
    isAccredited?: boolean;
    isVerified?: boolean;
    accountStatus?: 'active' | 'pending' | 'suspended';
}

const DEFAULT_PROFILE: LabProfile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    managerName: '',
    licenseNumber: '',
    workingHours: '',
    description: '',
    services: [],
    avatar: '',
    delegates: []
};

export const useLabProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<LabProfile>(DEFAULT_PROFILE);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Fetch lab associated with current user
            const { data, error } = await supabase
                .from('dental_laboratories')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No profile found, maybe new user
                    console.log('No lab profile found for user');
                } else {
                    throw error;
                }
            }

            if (data) {
                setProfile({
                    id: data.id,
                    name: data.lab_name || '',
                    email: data.email || user.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    managerName: data.owner_name || '',
                    licenseNumber: data.license_number || '',
                    workingHours: data.working_hours || '',
                    description: data.description || '',
                    services: data.services || [],
                    avatar: data.avatar_url || '🦷',
                    delegates: data.delegates || [],
                    isAccredited: data.is_accredited || false,
                    isVerified: data.is_verified || false,
                    accountStatus: data.account_status || 'pending'
                });
            }
        } catch (error) {
            console.error('Error fetching lab profile:', error);
            toast.error('فشل تحميل الملف الشخصي');
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (updates: Partial<LabProfile>) => {
        if (!user || !profile.id) {
            toast.error('لا يوجد ملف شخصي لتحديثه');
            return;
        }

        try {
            // Map UI fields to DB fields
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.lab_name = updates.name;
            if (updates.email !== undefined) dbUpdates.email = updates.email;
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
            if (updates.address !== undefined) dbUpdates.address = updates.address;
            if (updates.managerName !== undefined) dbUpdates.owner_name = updates.managerName;
            if (updates.licenseNumber !== undefined) dbUpdates.license_number = updates.licenseNumber;
            if (updates.workingHours !== undefined) dbUpdates.working_hours = updates.workingHours;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.services !== undefined) dbUpdates.services = updates.services;
            if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
            if (updates.delegates !== undefined) dbUpdates.delegates = updates.delegates;

            const { error } = await supabase
                .from('dental_laboratories')
                .update(dbUpdates)
                .eq('id', profile.id);

            if (error) throw error;

            setProfile(prev => ({ ...prev, ...updates }));
            toast.success('تم تحديث الملف الشخصي');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('فشل حفظ التغييرات');
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    return {
        profile,
        loading,
        updateProfile,
        refresh: fetchProfile
    };
};
