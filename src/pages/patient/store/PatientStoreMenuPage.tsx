import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, Heart,
    HelpCircle, Package,
    ChevronLeft, MapPin, Headphones
} from 'lucide-react';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';

export const PatientStoreMenuPage: React.FC = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            id: 'orders',
            title: 'طلباتي',
            subtitle: 'تتبع المشتريات والطلبات السابقة',
            icon: Package,
            color: 'bg-purple-100',
            textColor: 'text-purple-600',
            link: '/patient/store/orders',
            colSpan: 'col-span-1',
            rowSpan: 'row-span-1'
        },
        {
            id: 'cart',
            title: 'سلة التسوق',
            subtitle: 'المنتجات المختارة للشراء',
            icon: ShoppingBag,
            color: 'bg-emerald-100',
            textColor: 'text-emerald-600',
            link: '/patient/store/cart',
            colSpan: 'col-span-1',
            rowSpan: 'row-span-1'
        },
        {
            id: 'wishlist',
            title: 'المفضلة',
            subtitle: 'المنتجات التي أعجبتك',
            icon: Heart,
            color: 'bg-rose-100',
            textColor: 'text-rose-600',
            link: '/patient/store/favorites',
            colSpan: 'col-span-1',
            rowSpan: 'row-span-2'
        },
        {
            id: 'addresses',
            title: 'عناوين الشحن',
            subtitle: 'أماكن التوصيل والاستلام',
            icon: MapPin,
            color: 'bg-orange-100',
            textColor: 'text-orange-600',
            link: '/patient/store/addresses',
            colSpan: 'col-span-1',
            rowSpan: 'row-span-1'
        },

        {
            id: 'support',
            title: 'الدعم الفني',
            subtitle: 'المساعدة والتواصل',
            icon: Headphones,
            color: 'bg-teal-100',
            textColor: 'text-teal-600',
            link: '/patient/store/support',
            colSpan: 'col-span-2',
            rowSpan: 'row-span-1'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
            <PatientStoreHeader />

            {/* Main Content - Bento Grid */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px]">
                    {menuItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => navigate(item.link)}
                            className={`
                                ${item.colSpan} ${item.rowSpan}
                                relative overflow-hidden rounded-3xl p-6 cursor-pointer
                                transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group
                                bg-white border border-slate-100
                            `}
                        >
                            <div className={`
                                absolute top-0 right-0 w-full h-full opacity-0 group-hover:opacity-5 transition-opacity duration-300
                                ${item.color}
                            `}></div>

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color} ${item.textColor}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:-translate-x-1 transition-transform" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">{item.title}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2">{item.subtitle}</p>
                                </div>
                            </div>

                            {/* Decorative Icon */}
                            <item.icon className={`
                                absolute -bottom-4 -left-4 w-32 h-32 opacity-5
                                rotate-12 transition-transform duration-500
                                group-hover:scale-110 group-hover:rotate-6
                                text-slate-900
                            `} />
                        </div>
                    ))}
                </div>
            </div>

            <BottomNavigation />
        </div>
    );
};
