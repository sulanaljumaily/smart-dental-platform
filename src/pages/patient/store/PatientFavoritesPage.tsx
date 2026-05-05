import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { ProductCard } from '../../../components/store/ProductCard';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useStore } from '../../../hooks/useStore';
import { toast } from 'sonner';

export const PatientFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { products } = useStore();
  const { addToCart } = useStoreCart();
  const { wishlistItems, toggleWishlist } = useWishlist();

  const favoriteProducts = products.filter(p => wishlistItems.has(p.id));

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {favoriteProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-rose-300 fill-rose-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">قائمة المفضلة فارغة</h3>
            <p className="text-slate-500 mb-8 text-center max-w-sm">
              لم تقم بإضافة أي منتجات للمفضلة بعد. استعرض المنتجات واحفظ ما يعجبك هنا.
            </p>
            <Button onClick={() => navigate('/patient/store')} className="bg-teal-600 text-white hover:bg-teal-700 px-8 py-3 rounded-xl">
              تصفح المنتجات
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[420px]">
            {/* Stats Bento Card */}
            <div className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">منتجاتك المميزة</h2>
                <p className="text-rose-100 mb-6">لديك {favoriteProducts.length} منتجات في قائمة أمنياتك. لا تفوت فرصة شرائها!</p>
              </div>
              <div className="relative z-10 bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-rose-50">إجمالي القيمة التقريبية</span>
                  <span className="text-xl font-bold">
                    {favoriteProducts.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()} د.ع
                  </span>
                </div>
              </div>
              <Heart className="absolute -bottom-10 -left-10 w-64 h-64 text-white opacity-10 rotate-12 fill-white" />
              <Sparkles className="absolute top-10 right-10 w-20 h-20 text-yellow-300 opacity-20 blur-sm" />
            </div>

            {favoriteProducts.map((product) => (
              <div key={product.id} className="h-[340px]">
                <ProductCard
                  product={product}
                  onAddToCart={(id, e) => {
                    e.stopPropagation();
                    addToCart(product);
                    toast.success('تمت الإضافة للسلة');
                  }}
                  onToggleWishlist={(id, e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  isWishlisted={true}
                  onClick={() => navigate(`/patient/store/product/${product.id}`)}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
