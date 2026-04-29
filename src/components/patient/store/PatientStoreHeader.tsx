import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Heart, ShoppingBag, Store, Menu, Sparkles, LogIn
} from 'lucide-react';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useAuth } from '../../../contexts/AuthContext';

export const PatientStoreHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems } = useStoreCart();
    const { user } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const isActive = (path: string) => location.pathname === path;

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/patient/store/products?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="bg-white sticky top-0 z-50 shadow-sm border-b border-slate-100 mb-6 pt-[calc(env(safe-area-inset-top)*0.75)]" dir="rtl">
            <div className="max-w-7xl mx-auto px-2 sm:px-4">
                <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
                    {/* Logo Area */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-fit cursor-pointer" onClick={() => navigate('/patient/store')}>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
                            <Store className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight">متجر المراجعين</h1>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl px-1 sm:px-2">
                        <div className="relative group">
                            <Search className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                                placeholder="ابحث عن منتج صحي..."
                                className="w-full pr-8 pl-3 py-1.5 sm:pr-10 sm:pl-4 sm:py-2.5 bg-slate-50 border-transparent rounded-lg sm:rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-200 transition-all text-xs sm:text-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 min-w-fit">
                        {!user && (
                            <button
                                onClick={() => navigate('/patient-login')}
                                className="text-xs sm:text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <LogIn className="w-4 h-4 hidden sm:block" /> تسجيل
                            </button>
                        )}
                        <button onClick={() => navigate('/patient/store/favorites')} className="p-1.5 sm:p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 relative transition-colors">
                            <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button onClick={() => navigate('/patient/store/cart')} className="p-1.5 sm:p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 relative transition-colors">
                            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-teal-600 text-white w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold ring-2 ring-white">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Secondary Navigation - Tabs (exact mirror of StoreHeader minus Suppliers) */}
            <div className="border-t border-slate-50 overflow-x-auto scrollbar-hide bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                    <div className="flex items-center gap-2 h-10 sm:h-12 text-xs sm:text-sm font-medium text-slate-600 min-w-max px-1">
                        <button
                            onClick={() => navigate('/patient/store')}
                            className={`h-full px-1 transition-colors ${isActive('/patient/store') ? 'text-teal-600 border-b-2 border-teal-600 font-bold' : 'hover:text-slate-900'}`}
                        >
                            الرئيسية
                        </button>
                        <button
                            onClick={() => navigate('/patient/store/categories')}
                            className={`h-full px-1 transition-colors ${isActive('/patient/store/categories') ? 'text-teal-600 border-b-2 border-teal-600 font-bold' : 'hover:text-slate-900'}`}
                        >
                            الفئات
                        </button>
                        <button
                            onClick={() => navigate('/patient/store/deals')}
                            className={`h-full px-1 transition-colors flex items-center gap-1 ${isActive('/patient/store/deals') ? 'text-teal-600 border-b-2 border-teal-600 font-bold' : 'hover:text-slate-900'}`}
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" /> العروض
                        </button>
                        <button
                            onClick={() => navigate('/patient/store/brands')}
                            className={`h-full px-1 transition-colors ${isActive('/patient/store/brands') ? 'text-teal-600 border-b-2 border-teal-600 font-bold' : 'hover:text-slate-900'}`}
                        >
                            الماركات
                        </button>
                        <button
                            onClick={() => navigate('/patient/store/menu')}
                            className={`h-full px-1 transition-colors flex items-center gap-1 ${isActive('/patient/store/menu') ? 'text-teal-600 border-b-2 border-teal-600 font-bold' : 'hover:text-slate-900'}`}
                        >
                            <Menu className="w-4 h-4" /> المزيد
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
