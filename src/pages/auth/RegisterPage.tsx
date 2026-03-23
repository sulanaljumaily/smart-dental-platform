import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, CheckCircle, Building, Stethoscope, Package, TestTube, Settings } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform } from '../../contexts/PlatformContext';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const RegisterPage: React.FC = () => {
  const { t } = useLanguage();
  const { register, login } = useAuth();
  const { settings } = usePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: '' as 'doctor' | 'supplier' | 'laboratory' | '',
    agreeToTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // تحديث نوع الحساب بناءً على query parameter
  useEffect(() => {
    const type = searchParams.get('type');
    if (type && ['doctor', 'supplier', 'laboratory', 'admin'].includes(type)) {
      setFormData(prev => ({ ...prev, accountType: type as any }));
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'الاسم الكامل مطلوب';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^\+964\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف يجب أن يبدأ بـ +964 ويتبعه 10 أرقام';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    if (!formData.accountType) {
      newErrors.accountType = 'يرجى اختيار نوع الحساب لتتمكن من التسجيل';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'يجب الموافقة على الشروط والأحكام';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // محاكاة عملية التسجيل
      await new Promise(resolve => setTimeout(resolve, 1500));

      // بعد التسجيل الناجح، تسجيل الدخول تلقائياً
      await login(formData.email, formData.password, formData.accountType);

      // التوجيه إلى المركز المناسب
      switch (formData.accountType) {
        case 'doctor':
          navigate('/doctor');
          break;
        case 'supplier':
          navigate('/supplier');
          break;
        case 'laboratory':
          navigate('/laboratory');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('حدث خطأ أثناء التسجيل. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // مسح الخطأ عند التعديل
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-primary via-primary-dark to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl my-8">
          <div className="p-8 space-y-6">
            {/* Logo */}
            <div className="text-center">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain rounded-3xl" />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">S</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h1>
              <p className="text-gray-600 mt-2">كن جزءاً من منصتنا اليوم</p>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h1>
            <p className="text-gray-600 mt-2">انضم إلى SMART اليوم</p>
          </div>

            {/* Account Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر نوع الحساب الذي تريد إنشاءه
              </label>
              <div className="flex gap-2 p-1 bg-gray-100/60 rounded-xl mb-4 border border-gray-200/50">
                <button
                  type="button"
                  onClick={() => handleInputChange('accountType', 'doctor')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 ${formData.accountType === 'doctor'
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200 scale-[1.02]'
                    : 'text-gray-500 hover:bg-white hover:shadow-sm hover:text-blue-600 border border-transparent'
                    }`}
                >
                  <Stethoscope className={`w-4 h-4 transition-colors ${formData.accountType === 'doctor' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>طبيب</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('accountType', 'supplier')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 ${formData.accountType === 'supplier'
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200 scale-[1.02]'
                    : 'text-gray-500 hover:bg-white hover:shadow-sm hover:text-emerald-600 border border-transparent'
                    }`}
                >
                  <Package className={`w-4 h-4 transition-colors ${formData.accountType === 'supplier' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>مورد</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('accountType', 'laboratory')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 ${formData.accountType === 'laboratory'
                    ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-200 scale-[1.02]'
                    : 'text-gray-500 hover:bg-white hover:shadow-sm hover:text-purple-600 border border-transparent'
                    }`}
                >
                  <TestTube className={`w-4 h-4 transition-colors ${formData.accountType === 'laboratory' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span>مختبر</span>
                </button>
              </div>
            </div>

              <button
                type="button"
                onClick={() => handleInputChange('accountType', 'supplier')}
                className={`p-4 rounded-lg border-2 transition-all ${formData.accountType === 'supplier'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 hover:border-primary/50'
                  }`}
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                {loadingProvider === 'google' ? 'جاري التحويل...' : 'Google'}
              </Button>
              <Button
                type="button"
                onClick={() => handleInputChange('accountType', 'laboratory')}
                className={`p-4 rounded-lg border-2 transition-all ${formData.accountType === 'laboratory'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 hover:border-primary/50'
                  }`}
              >
                <img src="https://www.svgrepo.com/show/354981/facebook-option.svg" alt="Facebook" className="w-5 h-5 brightness-0 invert" />
                {loadingProvider === 'facebook' ? 'جاري التحويل...' : 'Facebook'}
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline ml-1" />
                الاسم الكامل
              </label>
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline ml-1" />
                  البريد الإلكتروني
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@email.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline ml-1" />
                  رقم الهاتف
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+964 770 123 4567"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline ml-1" />
                  كلمة المرور
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline ml-1" />
                  تأكيد كلمة المرور
                </label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
              {errors.agreeToTerms && (
                <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
              )}

              {/* Account Type Error Warning */}
              {errors.accountType && (
                <p className="text-red-600 text-center font-bold text-sm bg-red-50 p-2 rounded-lg border border-red-200 animate-pulse">
                  ⚠️ {errors.accountType}
                </p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant={errors.accountType ? "outline" : "primary"}
                className={`w-full flex items-center justify-center gap-2 ${errors.accountType ? 'border-red-500 text-red-600 hover:bg-red-50 bg-white' : ''}`}
                disabled={loading || !!loadingProvider}
              >
                <UserPlus className="w-5 h-5" />
                {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center text-sm text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                تسجيل الدخول
              </Link>
            </div>

          </div>

          {/* Quick Links */}
          <div className="pt-4 border-t text-center space-y-2">
            <Link to="/" className="block text-sm text-gray-600 hover:text-primary">
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
