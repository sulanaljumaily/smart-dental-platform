import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Heart, ShoppingBag, Store, Menu, Sparkles
} from 'lucide-react';
import { useStore } from '../../hooks/useStore';

export const StoreHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount } = useStore();
    // useStore usually exposes cartCount. Let's assume wishlistCount might not be there.
    // StorePage used local state for wishlist. I will keep it simple for now or fetch from store if available.
    // Checking StorePage again: `const [wishlistItems, setWishlistItems] = useState`.
    // So wishlist count is not global yet. I will show static or hidden for now, or just the icon.

    const [searchQuery, setSearchQuery] = useState('');

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="bg-white sticky top-0 z-50 shadow-sm border-b border-slate-100 mb-6 pt-[calc(env(safe-area-inset-top)/2)]">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 cursor-pointer">
                <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
                    {/* Logo Area */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-fit" onClick={() => navigate('/store')}>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Store className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight">المتجر الطبي</h1>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl px-1 sm:px-2">
                        <div className="relative group">
                            <Search className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ابحث عن منتج..."
                                className="w-full pr-8 pl-3 py-1.5 sm:pr-10 sm:pl-4 sm:py-2.5 bg-slate-50 border-transparent rounded-lg sm:rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all text-xs sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 min-w-fit">
                        <button onClick={() => navigate('/store/favorites')} className="p-1.5 sm:p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 relative transition-colors">
                            <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                            {/* Wishlist badge logic would go here */}
                        </button>
                        <button onClick={() => navigate('/store/cart')} className="p-1.5 sm:p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 relative transition-colors">
                            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold ring-2 ring-white">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Secondary Navigation - Tabs */}
            <div className="border-t border-slate-50 overflow-x-auto scrollbar-hide bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                    <div className="flex items-center justify-between sm:justify-start gap-2 h-10 sm:h-12 text-xs sm:text-sm font-medium text-slate-600 min-w-max px-1">
                        <button
                            onClick={() => navigate('/store')}
                            className={`h-full px-1 transition-colors ${isActive('/store') ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-900'}`}
                        >
                            الرئيسية
                        </button>
                        <button
                            onClick={() => navigate('/store/categories')}
                            className={`h-full px-1 transition-colors ${isActive('/store/categories') ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-900'}`}
                        >
                            الفئات
                        </button>
                        <button
                            onClick={() => navigate('/store/deals')}
                            className={`h-full px-1 transition-colors flex items-center gap-1 ${isActive('/store/deals') ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-900'}`}
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" /> العروض
                        </button>
                        <button
                            onClick={() => navigate('/store/brands')}
                            className={`h-full px-1 transition-colors ${isActive('/store/brands') ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-900'}`}
                        >
                            الماركات
                        </button>
                        <button
                            onClick={() => navigate('/store/suppliers')}
                            className={`h-full px-1 transition-colors ${isActive('/store/suppliers') ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-900'}`}
                        >
                            الموردين
                        </button>
                        <button
                            onClick={() => navigate('/store/menu')}
                            className={`h-full px-1 transition-colors flex items-center gap-1 ${isActive('/store/menu') ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-900'}`}
                        >
                            <Menu className="w-4 h-4" /> المزيد
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
