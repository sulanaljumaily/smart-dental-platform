import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { sendRoleNotification } from '../lib/notifications';
import { db } from '../lib/offline/db';

const OFFLINE_AUTH_USER_KEY = 'dental_offline_auth_user_v1';

function getInstantCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(OFFLINE_AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.email) {
      return parsed as User;
    }
  } catch {}
  return null;
}

function setInstantCachedUser(u: User | null) {
  try {
    if (!u) {
      localStorage.removeItem(OFFLINE_AUTH_USER_KEY);
    } else {
      localStorage.setItem(OFFLINE_AUTH_USER_KEY, JSON.stringify(u));
    }
  } catch {}
}

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
  const initialCachedUser = getInstantCachedUser();
  const [user, setUser] = useState<User | null>(initialCachedUser);
  const [loading, setLoading] = useState<boolean>(!initialCachedUser);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const explicitLogoutRef = useRef(false);

  const userRef = useRef<User | null>(initialCachedUser);

  const updateUserState = useCallback((newUser: User | null, allowClear = false) => {
    if (!newUser) {
      // لا تمسح جلسة المستخدم المحفوظة إذا لم يكن تسجيل خروج صريح وكان هناك مستخدم مخزن
      if (!allowClear && !explicitLogoutRef.current && (!navigator.onLine || getInstantCachedUser())) {
        const fallback = userRef.current || getInstantCachedUser();
        if (fallback) {
          userRef.current = fallback;
          setUser(fallback);
          return;
        }
      }
      userRef.current = null;
      setUser(null);
      if (allowClear || explicitLogoutRef.current) {
        setInstantCachedUser(null);
      }
      return;
    }

    setInstantCachedUser(newUser);

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
  const buildUserFromMeta = (userId: string, email: string, meta?: any): User => {
    const cached = getInstantCachedUser();
    return {
      id: userId,
      email: email || cached?.email || '',
      name: meta?.full_name || cached?.name || (email ? email.split('@')[0] : 'الطبيب'),
      role: (meta?.role as UserRole) || cached?.role || 'doctor',
      phone: meta?.phone || cached?.phone || '',
      avatar: meta?.avatar_url || cached?.avatar || ''
    };
  };

  // Auto-assign patient role if coming from patient OAuth flow
  const assignPatientRoleIfNeeded = async (userId: string) => {
    if (!navigator.onLine) return;
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
    // 1. إذا كنا أوفلاين، نسترجع البروفايل المحلي فوراً دون انتظار الشبكة
    if (!navigator.onLine) {
      const instant = getInstantCachedUser();
      if (instant && instant.id === userId) {
        updateUserState(instant);
        if (mountedRef.current) setLoading(false);
        return;
      }
      try {
        const cached = await db.user_profile.get(userId);
        if (cached?.profile_data && mountedRef.current) {
          updateUserState(cached.profile_data as unknown as User);
          setLoading(false);
          return;
        }
      } catch {}
      if (mountedRef.current) {
        updateUserState(buildUserFromMeta(userId, email));
        setLoading(false);
      }
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

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
        // محاولة استرجاع البروفايل من الكاش المحلي أولاً
        const instant = getInstantCachedUser();
        if (instant && instant.id === userId && mountedRef.current) {
          updateUserState(instant);
          return;
        }
        try {
          const cached = await db.user_profile.get(userId);
          if (cached?.profile_data && mountedRef.current) {
            updateUserState(cached.profile_data as unknown as User);
            return;
          }
        } catch {}

        const { data: { user: authUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (!mountedRef.current) return;
        updateUserState(buildUserFromMeta(userId, email, authUser?.user_metadata));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
      const instant = getInstantCachedUser();
      if (instant && instant.id === userId && mountedRef.current) {
        updateUserState(instant);
        return;
      }
      try {
        const cached = await db.user_profile.get(userId);
        if (cached?.profile_data && mountedRef.current) {
          updateUserState(cached.profile_data as unknown as User);
          return;
        }
      } catch {}
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

    const restoreOfflineUserFallback = async (): Promise<boolean> => {
      const instant = getInstantCachedUser();
      if (instant && mountedRef.current) {
        updateUserState(instant);
        setLoading(false);
        return true;
      }
      try {
        const cachedProfiles = await db.user_profile.toArray();
        if (cachedProfiles.length > 0 && mountedRef.current) {
          const lastProfile = cachedProfiles[0];
          if (lastProfile?.profile_data) {
            updateUserState(lastProfile.profile_data as unknown as User);
            setLoading(false);
            return true;
          }
        }
      } catch {}
      return false;
    };

    // 1. Initial Session Check
    const initializeAuth = async () => {
      if (!navigator.onLine) {
        const restored = await restoreOfflineUserFallback();
        if (restored) return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email!);
        } else {
          const restored = await restoreOfflineUserFallback();
          if (!restored && mountedRef.current) {
            updateUserState(null, true);
            setLoading(false);
          }
        }
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
        const restored = await restoreOfflineUserFallback();
        if (!restored && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Auth State Listener — handles login/logout/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (event === 'TOKEN_REFRESHED' && session?.user && userRef.current?.id === session.user.id) {
        return;
      }

      if (session?.user) {
        explicitLogoutRef.current = false;
        setTimeout(() => {
          if (mountedRef.current) {
            fetchProfile(session.user.id, session.user.email!);
          }
        }, 50);
      } else if (event === 'SIGNED_OUT') {
        if (explicitLogoutRef.current) {
          updateUserState(null, true);
          setLoading(false);
        } else {
          // حماية الجلسة من المسح التلقائي عند انقطاع الإنترنت أو فشل تحديث التوكن
          const restored = await restoreOfflineUserFallback();
          if (!restored && mountedRef.current) {
            updateUserState(null, true);
            setLoading(false);
          }
        }
      } else {
        const restored = await restoreOfflineUserFallback();
        if (!restored && mountedRef.current) {
          if (!userRef.current) {
            updateUserState(null, true);
          }
          setLoading(false);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateUserState]);

  const login = async (email: string, password: string, _role?: UserRole) => {
    try {
      explicitLogoutRef.current = false;
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

  /**
   * autoLinkPatientData — Called after a patient account is created.
   */
  const autoLinkPatientData = async (userId: string, phone: string) => {
    const sanitizedPhone = phone.replace(/\D/g, '');
    if (!sanitizedPhone) return;
    try {
      await supabase
        .from('appointments')
        .update({ patient_user_id: userId })
        .eq('phone_number', sanitizedPhone)
        .is('patient_user_id', null);

      await supabase
        .from('patients')
        .update({ patient_user_id: userId })
        .eq('phone', sanitizedPhone)
        .is('patient_user_id', null)
        .is('deleted_at', null);
    } catch (err) {
      console.warn('[Auth] Auto-link patient data failed (non-critical):', err);
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole, phone: string) => {
    try {
      explicitLogoutRef.current = false;
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

        if (role === 'patient' && phone) {
          await autoLinkPatientData(data.user.id, phone);
        }

        if (role === 'supplier') {
          await sendRoleNotification('admin', 'طلب انضمام مورد جديد', `قام ${name} بالتسجيل كمورد جديد بانتظار المراجعة.`, '/admin/suppliers');
        } else if (role === 'laboratory') {
          await sendRoleNotification('admin', 'طلب انضمام مختبر جديد', `قام ${name} بالتسجيل كمختبر جديد بانتظار المراجعة.`, '/admin/labs');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'فشل إنشاء الحساب');
      throw error;
    }
  };

  const logout = async () => {
    explicitLogoutRef.current = true;
    setInstantCachedUser(null);
    try {
      await db.user_profile.clear();
    } catch {}
    try {
      if (navigator.onLine) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      updateUserState(null, true);
      toast.success('تم تسجيل الخروج');
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
