import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, LogIn, AlertTriangle, HeartPulse } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform } from '../../contexts/PlatformContext';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Header } from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';

// Helper: build synthetic email from phone for Supabase Auth
const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, '')}@patient.smartdental.com`;

export const PatientLoginPage: React.FC = () => {
  const { isAuthenticated, user, login, register } = useAuth();
  const { settings } = usePlatform();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Auto-redirect if already authenticated as patient
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'patient') navigate('/patient');
      else if (user.role === 'doctor') navigate('/doctor');
      else if (user.role === 'supplier') navigate('/supplier');
      else if (user.role === 'laboratory') navigate('/laboratory');
      else if (user.role === 'admin') navigate('/admin');
    }
  }, [isAuthenticated, user, navigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) setPhone(val);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || phone.length < 10) { setError('أدخل رقم هاتف صحيح'); return; }
    if (!password) { setError('أدخل كلمة المرور'); return; }
    setLoading(true);
    try {
      const email = phoneToEmail(phone);
      await login(email, password, 'patient');
    } catch (err: any) {
      setError('رقم الهاتف أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('أدخل اسمك الكامل'); return; }
    if (!phone || phone.length < 10) { setError('أدخل رقم هاتف صحيح'); return; }
    if (!password || password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتان'); return; }
    setLoading(true);
    try {
      const email = phoneToEmail(phone);
      await register(email, password, fullName, 'patient', phone);
      navigate('/patient');
    } catch (err: any) {
      if (err?.message?.includes('already registered') || err?.message?.includes('duplicate')) {
        setError('هذا الرقم مسجل مسبقاً، حاول تسجيل الدخول');
      } else {
        setError(err?.message || 'حدث خطأ، حاول مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    try {
      // Store flag so AuthContext knows to set role as 'patient'
      localStorage.setItem('patient_oauth_pending', '1');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}?patient=true` }
      });
      if (error) throw error;
    } catch {
      localStorage.removeItem('patient_oauth_pending');
      setError('فشل الدخول بحساب التواصل الاجتماعي');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex flex-col items-center justify-center p-4">
        {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-2xl mb-3" />
        ) : (
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-3">
            <HeartPulse className="w-9 h-9 text-white" />
          </div>
        )}
        <h1 className="text-white text-2xl font-bold">بوابة المراجعين</h1>
        <p className="text-white/70 text-sm mt-1">تابع مواعيدك وخططك العلاجية</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-5">

          {/* ─── Orange notice for professionals ─── */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
            <span>
              إذا كنت <strong>طبيباً أو مورداً أو مختبراً</strong>،{' '}
              <Link to="/login" className="font-bold underline hover:text-orange-600">
                سجّل دخولك من هنا
              </Link>
            </span>
          </div>

          {/* ─── Mode toggle ─── */}
          <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-teal-700 shadow' : 'text-gray-500'}`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-white text-teal-700 shadow' : 'text-gray-500'}`}
            >
              حساب جديد
            </button>
          </div>

          {/* ─── Error ─── */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
              ⚠️ {error}
            </div>
          )}

          {/* ─── Social login ─── */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button" variant="outline"
              className="flex items-center justify-center gap-2 bg-white"
              onClick={() => handleOAuth('google')}
              disabled={loading || !!loadingProvider}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              {loadingProvider === 'google' ? '...' : 'Google'}
            </Button>
            <Button
              type="button" variant="outline"
              className="flex items-center justify-center gap-2 bg-[#1877F2] text-white hover:bg-[#1865F2] border-0"
              onClick={() => handleOAuth('facebook')}
              disabled={loading || !!loadingProvider}
            >
              <img src="https://www.svgrepo.com/show/354981/facebook-option.svg" alt="Facebook" className="w-5 h-5 brightness-0 invert" />
              {loadingProvider === 'facebook' ? '...' : 'Facebook'}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <span className="flex-1 h-px bg-gray-200" />
            أو برقم الهاتف
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ─── Login Form ─── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-4 h-4 inline ml-1" />رقم الهاتف
                </label>
                <div className="flex" dir="ltr">
                  <span className="flex items-center gap-1 px-3 bg-gray-50 border border-gray-300 rounded-s-lg border-e-0 text-gray-600 text-sm">
                    <img src="https://flagcdn.com/w20/iq.png" alt="IQ" className="w-4" />
                    +964
                  </span>
                  <input
                    type="tel" dir="ltr" value={phone} onChange={handlePhoneChange}
                    placeholder="07XXXXXXXXX" required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-e-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Lock className="w-4 h-4 inline ml-1" />كلمة المرور
                </label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
              </div>
              <div className="text-left">
                <Link to="/forgot-password" className="text-xs text-teal-600 hover:underline">نسيت كلمة المرور؟</Link>
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
                <LogIn className="w-4 h-4 ml-2" />
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          )}

          {/* ─── Register Form ─── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="أدخل اسمك الكامل" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-4 h-4 inline ml-1" />رقم الهاتف
                </label>
                <div className="flex" dir="ltr">
                  <span className="flex items-center gap-1 px-3 bg-gray-50 border border-gray-300 rounded-s-lg border-e-0 text-gray-600 text-sm">
                    <img src="https://flagcdn.com/w20/iq.png" alt="IQ" className="w-4" />
                    +964
                  </span>
                  <input
                    type="tel" dir="ltr" value={phone} onChange={handlePhoneChange}
                    placeholder="07XXXXXXXXX" required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-e-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Lock className="w-4 h-4 inline ml-1" />كلمة المرور
                </label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور" required />
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </Button>
            </form>
          )}

          {/* ─── Footer links ─── */}
          <div className="pt-3 border-t text-center space-y-1">
            <div className="flex justify-center gap-4 text-xs text-gray-400">
              <Link to="/privacy-policy" className="hover:text-teal-600">سياسة الخصوصية</Link>
              <span>•</span>
              <Link to="/terms-of-service" className="hover:text-teal-600">الشروط والأحكام</Link>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </>
  );
};
