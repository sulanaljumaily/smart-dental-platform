import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  Users,
  Stethoscope,
  Briefcase,
  ShoppingBag,
  LayoutDashboard,
  Package,
  TestTube,
  Home,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform, NavRoleKey } from '../../contexts/PlatformContext';
import { isDesktopApp, isMobileApp } from '../../lib/platform';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { sectionsConfig } = usePlatform();

  // Check if current path is in excluded pages
  const isExcludedPage = (path: string) => {
    const excludedPages = [
      '/doctor-welcome',
      '/supplier-welcome',
      '/login',
      '/patient-login',
      '/register',
      '/forgot-password',
      '/privacy-policy',
      '/terms-of-service',
      '/diagnosis/ai',
    ];

    // Hide bottom navigation in Clinic Dashboard to prevent modal overlap
    if (path.includes('/doctor/clinic/')) {
      return true;
    }

    return excludedPages.includes(path);
  };

  if (isExcludedPage(location.pathname)) {
    return null;
  }

  // Determine active device configuration (Unified 'all' vs separate 'web' | 'mobile' | 'desktop')
  const deviceKey = sectionsConfig.separateByDevice
    ? isDesktopApp()
      ? 'desktop'
      : isMobileApp()
      ? 'mobile'
      : 'web'
    : 'all';

  const deviceConfig = sectionsConfig.devices?.[deviceKey] || sectionsConfig.devices?.all;
  if (deviceConfig && !deviceConfig.barEnabled) {
    return null;
  }

  // --- Full Catalog of Menu Items per Role ---

  // 1. Generic Menu (Staff / Clinic Owner - fallback)
  const genericMenu = [
    { id: 'home', label: 'الرئيسية', icon: Building2, path: '/', activeOn: ['/', '/services', '/article'] },
    { id: 'community', label: 'المجتمع', icon: Users, path: '/community', activeOn: ['/community'] },
    { id: 'doctor', label: 'مركز الأطباء', icon: Stethoscope, path: '/doctor', activeOn: ['/doctor-welcome', '/doctor'] },
    { id: 'jobs', label: 'التوظيف', icon: Briefcase, path: '/jobs', activeOn: ['/jobs'] },
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/store', activeOn: ['/store'] },
    { id: 'services', label: 'الخدمات الطبية', icon: Stethoscope, path: '/services', activeOn: ['/services'] },
  ];

  // 1.1 Doctor Specific Menu
  const doctorMenu = [
    { id: 'home', label: 'الرئيسية', icon: Building2, path: '/', activeOn: ['/'] },
    { id: 'community', label: 'المجتمع', icon: Users, path: '/doctor/community', activeOn: ['/doctor/community', '/community'] },
    { id: 'doctor', label: 'مركز الأطباء', icon: Stethoscope, path: '/doctor', activeOn: ['/doctor', '/doctor/overview'] },
    { id: 'jobs', label: 'التوظيف', icon: Briefcase, path: '/doctor/jobs', activeOn: ['/doctor/jobs', '/jobs'] },
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/store', activeOn: ['/store'] },
    { id: 'services', label: 'الخدمات الطبية', icon: Stethoscope, path: '/services', activeOn: ['/services'] },
  ];

  // 2. Supplier Menu
  const supplierMenu = [
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/store', activeOn: ['/store'] },
    { id: 'supplier', label: 'مركز الموردين', icon: Package, path: '/supplier', activeOn: ['/supplier'] },
    { id: 'jobs', label: 'التوظيف', icon: Briefcase, path: '/jobs', activeOn: ['/jobs'] },
    { id: 'community', label: 'المجتمع', icon: Users, path: '/community', activeOn: ['/community'] },
    { id: 'home', label: 'الرئيسية', icon: Home, path: '/', activeOn: ['/'] },
  ];

  // 3. Lab Menu
  const labMenu = [
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/store', activeOn: ['/store'] },
    { id: 'lab', label: 'مركز المعامل', icon: TestTube, path: '/laboratory', activeOn: ['/laboratory'] },
    { id: 'jobs', label: 'التوظيف', icon: Briefcase, path: '/laboratory/jobs', activeOn: ['/laboratory/jobs', '/jobs'] },
    { id: 'community', label: 'المجتمع', icon: Users, path: '/community', activeOn: ['/community'] },
    { id: 'home', label: 'الرئيسية', icon: Home, path: '/', activeOn: ['/'] },
  ];

  // 4. Admin Menu
  const adminMenu = [
    { id: 'home', label: 'الرئيسية', icon: Building2, path: '/', activeOn: ['/', '/services', '/article'] },
    { id: 'community', label: 'المجتمع', icon: Users, path: '/community', activeOn: ['/community'] },
    { id: 'admin', label: 'إدارة المنصة', icon: LayoutDashboard, path: '/admin', activeOn: ['/admin'] },
    { id: 'jobs', label: 'التوظيف', icon: Briefcase, path: '/jobs', activeOn: ['/jobs'] },
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/store', activeOn: ['/store'] },
  ];

  // 5. Patient Menu (المراجعين) - Authenticated
  const patientMenu = [
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/patient/store', activeOn: ['/patient/store'] },
    { id: 'patient', label: 'مركز المراجعين', icon: HeartPulse, path: '/patient', activeOn: ['/patient'] },
    { id: 'services', label: 'الخدمات الطبية', icon: Stethoscope, path: '/services', activeOn: ['/services'] },
    { id: 'home', label: 'الرئيسية', icon: Home, path: '/', activeOn: ['/'] },
  ];

  // 6. Public Menu (الزوار) - Unauthenticated
  const publicMenu = [
    { id: 'store', label: 'المتجر', icon: ShoppingBag, path: '/patient/store', activeOn: ['/patient/store'] },
    { id: 'home', label: 'الرئيسية', icon: Home, path: '/', activeOn: ['/', '/article'] },
    { id: 'services', label: 'الخدمات الطبية', icon: Stethoscope, path: '/services', activeOn: ['/services'] },
    { id: 'community', label: 'المجتمع', icon: Users, path: '/community', activeOn: ['/community'] },
    { id: 'jobs', label: 'التوظيف', icon: Briefcase, path: '/jobs', activeOn: ['/jobs'] },
  ];

  const isPatientApp = import.meta.env.VITE_BUILD_TARGET === 'patient';
  const isProApp = import.meta.env.VITE_BUILD_TARGET === 'pro';

  // في تطبيق القطاع الطبي (Pro App): يتم إخفاء الشريط السفلي تماماً قبل تسجيل الدخول
  if (isProApp && !isAuthenticated) {
    return null;
  }

  // --- Select Menu & Role Key ---
  let navItems = publicMenu;
  let activeRoleKey: NavRoleKey | 'admin' = 'public';

  if (isPatientApp) {
    navItems = isAuthenticated ? patientMenu : publicMenu;
    activeRoleKey = isAuthenticated ? 'patient' : 'public';
  } else if (isAuthenticated) {
    if (user?.role === 'doctor') {
      navItems = doctorMenu;
      activeRoleKey = 'doctor';
    } else if (user?.role === 'supplier') {
      navItems = supplierMenu;
      activeRoleKey = 'supplier';
    } else if (user?.role === 'laboratory') {
      navItems = labMenu;
      activeRoleKey = 'laboratory';
    } else if (user?.role === 'admin') {
      navItems = adminMenu;
      activeRoleKey = 'admin';
    } else if (user?.role === 'patient') {
      navItems = patientMenu;
      activeRoleKey = 'patient';
    } else {
      navItems = genericMenu;
      activeRoleKey = 'doctor';
    }
  }

  // Apply Admin Sections Visibility Filter
  if (activeRoleKey !== 'admin' && deviceConfig?.roles?.[activeRoleKey]) {
    const roleVisibility = deviceConfig.roles[activeRoleKey];
    navItems = navItems.filter((item) => roleVisibility[item.id] !== false);
  }

  // فلترة صارمة لمنع ظهور زر مركز الأطباء للمراجعين في تطبيق المرضى
  if (isPatientApp) {
    navItems = navItems.filter(
      (item) =>
        item.id !== 'doctor' &&
        item.id !== 'supplier' &&
        item.id !== 'lab' &&
        item.id !== 'admin'
    );
  }

  if (navItems.length === 0) {
    return null;
  }

  const isActive = (activeOn: string[]) => {
    return activeOn.some((path) => {
      if (path === '/') {
        return location.pathname === '/' || location.pathname.startsWith('/article');
      }
      return location.pathname.startsWith(path);
    });
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50"
      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) * 0.5), 4px)' }}
      dir="ltr"
    >
      <div className="max-w-7xl mx-auto px-2 py-1 sm:py-1.5">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.activeOn);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all min-w-[58px] no-underline duration-200 ${
                  active
                    ? 'text-blue-600 bg-blue-50/80 -translate-y-0.5'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-label={item.label}
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 transition-colors ${
                    active ? 'text-blue-600 fill-blue-600/10' : 'text-gray-500'
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[10px] font-bold ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
