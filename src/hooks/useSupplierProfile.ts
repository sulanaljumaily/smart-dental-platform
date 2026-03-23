import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SupplierProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
    companyName: string;
    companyDescription: string;
    businessLicense: string;
    taxNumber: string;
    website: string;
    establishedYear: string;
    address: string;
    governorate: string;
    city: string;
    postalCode: string;
    rating: number;
    totalReviews: number;
    totalOrders: number;
    joinDate: string;
    verified: boolean;
    trusted: boolean;
    settings?: {
        showPhone: boolean;
        showEmail: boolean;
        showAddress: boolean;
    };
}

export const useSupplierProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<SupplierProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            // 1. Get Supplier ID (Same logic as useSupplier)
            // Support both user_id and profile_id for compatibility
            const { data: supplier, error: suppError } = await supabase
                .from('suppliers')
                .select('*')
                .or(`user_id.eq.${user?.id},profile_id.eq.${user?.id}`)
                .maybeSingle();

            if (suppError) throw suppError;

            if (supplier) {
                // Split contact person name
                const contactParts = (supplier.contact_person || 'مدير النظام').split(' ');
                const firstName = contactParts[0];
                const lastName = contactParts.slice(1).join(' ') || '';

                // Map DB to Profile
                const mappedProfile: SupplierProfile = {
                    id: supplier.id,
                    firstName: firstName,
                    lastName: lastName,
                    email: supplier.email,
                    phone: supplier.phone,
                    avatar: supplier.logo || `https://ui-avatars.com/api/?name=${supplier.name}&background=random`,
                    companyName: supplier.name || 'Unknown Company',
                    companyDescription: supplier.description || '',
                    // Fields not in DB yet, use defaults or placeholders
                    businessLicense: 'LIC-' + supplier.id.slice(0, 8).toUpperCase(),
                    taxNumber: 'TAX-' + supplier.id.slice(0, 8).toUpperCase(),
                    website: supplier.website || '', // Website might be added to schema later
                    establishedYear: '2020',
                    address: supplier.location || supplier.address || 'العراق',
                    governorate: 'بغداد',
                    city: 'بغداد',
                    postalCode: '10001',
                    rating: supplier.rating || 5,
                    totalReviews: 120, // Mock
                    totalOrders: supplier.total_sales ? Math.floor(supplier.total_sales / 100000) : 50, // Estimate orders from sales
                    joinDate: supplier.created_at || new Date().toISOString(),
                    verified: supplier.is_verified || false,
                    trusted: true
                };
                setProfile(mappedProfile);
            } else {
                // Fallback if no supplier found (shouldn't happen in demo if seeded)
                console.warn('No supplier found');
            }

        } catch (err: any) {
            console.error('Error fetching profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (updates: Partial<SupplierProfile>) => {
        if (!profile?.id) return;
        try {
            setLoading(true);

            // Map UI updates back to DB columns
            const dbUpdates: any = {};

            if (updates.firstName || updates.lastName) {
                dbUpdates.contact_person = `${updates.firstName || profile.firstName} ${updates.lastName || profile.lastName}`.trim();
            }
            if (updates.companyName) dbUpdates.name = updates.companyName;
            if (updates.companyDescription) dbUpdates.description = updates.companyDescription;
            if (updates.phone) dbUpdates.phone = updates.phone;
            if (updates.email) dbUpdates.email = updates.email;
            if (updates.address) dbUpdates.location = updates.address;

            // Only update if we have fields to update
            if (Object.keys(dbUpdates).length > 0) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(dbUpdates)
                    .eq('id', profile.id);

                if (error) throw error;
            }

            // Update local state
            setProfile(prev => prev ? ({ ...prev, ...updates }) : null);

        } catch (err: any) {
            console.error('Error updating profile:', err);
            // Revert or show error
            fetchProfile();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return {
        profile: profile || {} as SupplierProfile,
        loading,
        updateProfile,
        refresh: fetchProfile
    };
};
