import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { sendRoleNotification } from '../lib/notifications';
import { db } from '../lib/offline/db';

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
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false); // Prevent concurrent fetchProfile calls

  const userRef = useRef<User | null>(null);

  const updateUserState = useCallback((newUser: User | null) => {
    if (!newUser) {
      userRef.current = null;
      setUser(null);
      return;
    }

    const prev = userRef.current;
    if (
      prev &&
      prev.id === newUser.id &&
      prev.email === newUser.email &&
      prev.name === newUser.name &&
      prev.role === newUser.role &&
      prev.phone === newUser.phone &&
      prev.avatar === newUser.avatar
    ) {
      // Data didn't change: preserve existing object reference to avoid re-rendering dependents
      return;
    }

    userRef.current = newUser;
    setUser(newUser);
  }, []);

  // Build user object from profile DB row
  const buildUserFromProfile = (data: any, email: string): User => ({
    id: data.id,
    email: data.email || email,
    name: data.full_name || email.split('@')[0],
    role: data.role as UserRole,
    phone: data.phone || '',
    avatar: data.avatar_url || ''
  });

  // Build user from auth metadata (fallback)
  const buildUserFromMeta = (userId: string, email: string, meta?: any): User => ({
    id: userId,
    email: email,
    name: meta?.full_name || email.split('@')[0],
    role: (meta?.role as UserRole) || null,
    phone: meta?.phone || '',
    avatar: ''
  });

  // Auto-assign patient role if coming from patient OAuth flow
  const assignPatientRoleIfNeeded = async (userId: string) => {
    const isPendingPatient = localStorage.getItem('patient_oauth_pending') === '1';
    if (!isPendingPatient) return;
    localStorage.removeItem('patient_oauth_pending');
    try {
      await supabase.from('profiles').upsert([{ id: userId, role: 'patient' }], { onConflict: 'id' });
      await supabase.auth.updateUser({ data: { role: 'patient' } });
    } catch (err) {
      console.warn('[Auth] Could not assign patient role via OAuth:', err);
    }
  };

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    // Prevent concurrent fetches (race between login + onAuthStateChange)
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Handle patient OAuth pending flag before fetching profile
    await assignPatientRoleIfNeeded(userId);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, phone, avatar_url')
        .eq('id', userId)
        .single();

      if (!mountedRef.current) return;

      if (!error && data) {
        const userObj = buildUserFromProfile(data, email);
        updateUserState(userObj);
        // حفظ البروفايل محلياً في Dexie لاستخدامه في وضع الأوفلاين
        try {
          await db.user_profile.put({
            id: userId,
            role: data.role,
            profile_data: userObj as unknown as Record<string, unknown>,
            cached_at: Date.now()
          });
        } catch (e) {
          console.warn('[Auth] Error caching profile offline:', e);
        }
      } else {
        // محاولة استرجاع البروفايل من الكاش المحلي أولاً إذا كان أوفلاين
        try {
          const cached = await db.user_profile.get(userId);
          if (cached?.profile_data && mountedRef.current) {
            updateUserState(cached.profile_data as unknown as User);
            return;
          }
        } catch {
          // تجاوز إذا لم توجد بيانات كاش
        }

        // Profile query failed or no row → fallback to auth metadata
        if (error && !error.message?.includes('AbortError')) {
          console.warn('[Auth] Profile fetch error, using metadata fallback:', error.message);
        }
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!mountedRef.current) return;
        updateUserState(buildUserFromMeta(userId, email, authUser?.user_metadata));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
      console.error('[Auth] Unexpected error fetching profile:', err);
      // في حالة حدوث خطأ اتصال (Offline)، محاولة استرجاع الكاش المحلي أولاً
      try {
        const cached = await db.user_profile.get(userId);
        if (cached?.profile_data && mountedRef.current) {
          updateUserState(cached.profile_data as unknown as User);
          return;
        }
      } catch {
        // تجاوز
      }
      if (mountedRef.current) {
        updateUserState(buildUserFromMeta(userId, email));
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [updateUserState]);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Initial Session Check
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email!);
        } else {
          // عند فتح التطبيق أوفلاين، نسترجع الجلسة المحفوظة محلياً في Dexie
          try {
            const cachedProfiles = await db.user_profile.toArray();
            if (cachedProfiles.length > 0 && mountedRef.current) {
              const lastProfile = cachedProfiles[0];
              if (lastProfile?.profile_data) {
                console.log('[Auth] Restored offline session from Dexie:', lastProfile.id);
                updateUserState(lastProfile.profile_data as unknown as User);
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn('[Auth] Could not check offline user_profile:', e);
          }

          updateUserState(null);
          setLoading(false);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
        console.error('Error checking auth session:', error);

        // محاولة استرجاع الجلسة من Dexie في حالة حدوث خطأ اتصال (Network Error)
        try {
          const cachedProfiles = await db.user_profile.toArray();
          if (cachedProfiles.length > 0 && mountedRef.current) {
            const lastProfile = cachedProfiles[0];
            if (lastProfile?.profile_data) {
              console.log('[Auth] Restored offline session after network error:', lastProfile.id);
              updateUserState(lastProfile.profile_data as unknown as User);
              setLoading(false);
              return;
            }
          }
        } catch {}

        if (mountedRef.current) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Auth State Listener — handles login/logout/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      // Ignore token refresh if user is already loaded and user ID matches
      if (event === 'TOKEN_REFRESHED' && session?.user && userRef.current?.id === session.user.id) {
        return;
      }

      if (session?.user) {
        // Small delay to avoid racing with initial getSession
        setTimeout(() => {
          if (mountedRef.current) {
            fetchProfile(session.user.id, session.user.email!);
          }
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        updateUserState(null);
        setLoading(false);
      } else {
        // When session is null on INITIAL_SESSION or network disconnect:
        // Do NOT clear user if offline or if we have an offline user restored
        if (!navigator.onLine) {
          if (!userRef.current) {
            try {
              const cachedProfiles = await db.user_profile.toArray();
              if (cachedProfiles.length > 0 && mountedRef.current) {
                const lastProfile = cachedProfiles[0];
                if (lastProfile?.profile_data) {
                  updateUserState(lastProfile.profile_data as unknown as User);
                  setLoading(false);
                  return;
                }
              }
            } catch {}
          } else {
            // Already have offline user session, maintain it
            setLoading(false);
            return;
          }
        }

        if (!userRef.current) {
          updateUserState(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string, _role?: UserRole) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) toast.success('تم تسجيل الدخول بنجاح');
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      if (mountedRef.current) setLoading(false);
      toast.error(error.message || 'فشل تسجيل الدخول');
      throw error;
    }
  };

  // Helper: login using phone number (builds synthetic email)
  const loginWithPhone = async (phone: string, password: string) => {
    const sanitized = phone.replace(/\D/g, '');
    const email = `${sanitized}@patient.smartdental.com`;
    return login(email, password, 'patient');
  };

  /**
   * autoLinkPatientData — Called after a patient account is created.
   * Links any existing appointments/patient files with matching phone
   * to the new user UUID. Handles Scenario C: booked without account, then registered.
   */
  const autoLinkPatientData = async (userId: string, phone: string) => {
    const sanitizedPhone = phone.replace(/\D/g, '');
    if (!sanitizedPhone) return;
    try {
      // Link appointments that match this phone and have no account yet
      await supabase
        .from('appointments')
        .update({ patient_user_id: userId })
        .eq('phone_number', sanitizedPhone)
        .is('patient_user_id', null);

      // Link patient files that match this phone and have no account yet
      await supabase
        .from('patients')
        .update({ patient_user_id: userId })
        .eq('phone', sanitizedPhone)
        .is('patient_user_id', null)
        .is('deleted_at', null);

      console.log('[Auth] Auto-linked existing patient data for phone:', sanitizedPhone);
    } catch (err) {
      // Non-critical: log but don't break registration flow
      console.warn('[Auth] Auto-link patient data failed (non-critical):', err);
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

        // Auto-link existing appointments/patient files for patient accounts (Scenario C)
        if (role === 'patient' && phone) {
          await autoLinkPatientData(data.user.id, phone);
        }

        // Notify Admins about new professional accounts
        if (role === 'supplier') {
          await sendRoleNotification('admin', 'طلب انضمام مورد جديد', `قام ${name} بالتسجيل كمورد جديد بانتظار المراجعة.`, '/admin/suppliers');
        } else if (role === 'laboratory') {
          await sendRoleNotification('admin', 'طلب انضمام مختبر جديد', `قام ${name} بالتسجيل كمختبر جديد بانتظار المراجعة.`, '/admin/labs');
        }

        // onAuthStateChange will handle fetchProfile
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
      try {
        await db.user_profile.clear();
      } catch {}
      setUser(null);
      toast.success('تم تسجيل الخروج');
    } catch (error) {
      console.error('Logout error:', error);
      try {
        await db.user_profile.clear();
      } catch {}
      setUser(null);
    }
  };

  const getAccessibleClinics = () => {
    if (user?.role === 'doctor') return [user.id];
    return [];
  };

  const isMultiClinicOwner = () => {
    return false;
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
