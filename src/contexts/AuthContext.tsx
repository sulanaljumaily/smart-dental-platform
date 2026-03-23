import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  getAccessibleClinics: () => string[];
  isMultiClinicOwner: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('[AuthDebug] Initial session found. Bypassing profile fetch...');
          // await fetchProfile(session.user.id, session.user.email!);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || 'Demo Doctor',
            role: (session.user.user_metadata?.role as UserRole) || 'doctor',
            phone: '',
            avatar: ''
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Only fetch if we don't have the user or it changed
        if (!user || user.id !== session.user.id) {
          console.log('[AuthDebug] Session found. Bypassing profile fetch...');
          // await fetchProfile(session.user.id, session.user.email!);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || 'Demo Doctor',
            role: (session.user.user_metadata?.role as UserRole) || 'doctor',
            phone: '',
            avatar: ''
          });
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    console.log('[AuthDebug] Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthDebug] Error fetching profile:', error);
        toast.error(`Error fetching profile: ${error.message}`);
        // Fallback if profile missing in DEV only
        // return; 
      }

      if (data) {
        console.log('[AuthDebug] Profile found:', data);
        setUser({
          id: data.id,
          email: data.email || email,
          name: data.full_name || email.split('@')[0],
          role: data.role as UserRole,
          phone: data.phone,
          avatar: data.avatar_url
        });
      } else {
        console.error('[AuthDebug] Profile data is null');
        toast.error('Profile not found in database');
      }
    } catch (err) {
      console.error('[AuthDebug] Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, role?: UserRole) => {
    try {
      console.log('[AuthDebug] Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('[AuthDebug] Auth successful, user:', data.user?.id);

      if (data.user) {
        console.log('[AuthDebug] User authenticated. Skipping profile fetch for debugging...');
        // await fetchProfile(data.user.id, data.user.email!);

        // Manual User Set to unblock
        setUser({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name || 'Demo Doctor',
          role: (data.user.user_metadata?.role as UserRole) || 'doctor',
          phone: '',
          avatar: ''
        });

        toast.success(`تم تسجيل الدخول بنجاح`);
      }
    } catch (error: any) {
      console.error('[AuthDebug] Login error:', error);
      toast.error(error.message || 'فشل تسجيل الدخول');
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole, phone: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
            phone
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email,
              full_name: name,
              role,
              phone
            }
          ]);

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Error creating profile row:', profileError);
        }

        toast.success('تم إنشاء الحساب بنجاح');

        if (data.session) {
          await fetchProfile(data.user.id, email);
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'فشل إنشاء الحساب');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.success('تم تسجيل الخروج');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAccessibleClinics = () => {
    // This should ideally come from a 'clinic_access' table or similar logic
    // For now, we mock it based on role or simple logic
    if (user?.role === 'doctor') return [user.id]; // Simplified
    return [];
  };

  const isMultiClinicOwner = () => {
    // Check against DB if doctor owns multiple clinics
    return false; // Default safe
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      loading,
      getAccessibleClinics,
      isMultiClinicOwner
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
