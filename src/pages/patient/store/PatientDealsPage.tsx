import React, { useState, useEffect } from 'react';
import { Tag, Clock, TrendingDown, Sparkles, Flame, ShoppingCart, ArrowLeft, Heart } from 'lucide-react';
import { ProductCard } from '../../../components/store/ProductCard';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { supabase } from '../../../lib/supabase';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';

export const PatientDealsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useStoreCart();
  const { wishlistItems, toggleWishlist } = useWishlist();
  const [dealsProducts, setDealsProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, description, price, original_price, discount, image_url, rating, is_new, is_featured,
          supplier:suppliers!inner(name, store_type, id)
        `)
        .contains('target_audience', ['patient'])
        .in('suppliers.store_type', ['patient', 'both'])
        .eq('status', 'active')
        .not('discount', 'is', null)
        .gt('discount', 0)
        .order('discount', { ascending: false });

      if (data) {
        setDealsProducts(data.map((p: any) => ({
          ...p,
          image: p.image_url,
          originalPrice: p.original_price,
          supplierName: p.supplier?.name
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortedDeals = [...dealsProducts].sort((a, b) => (b.discount || 0) - (a.discount || 0));
  const topDeal = sortedDeals[0];
  const gridDeals = sortedDeals.slice(1);
  const maxDiscount = Math.max(...dealsProducts.map(p => p.discount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500 fill-orange-500 animate-pulse" />
              عروض وتخفيضات
            </h1>
            <p className="text-slate-500 mt-1">أقوى العروض الحصرية والخصومات المميزة للمراجعين</p>
          </div>
          <button
            onClick={() => navigate('/patient/store')}
            className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-medium transition-colors px-4 py-2 hover:bg-white rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للمتجر
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-max">

            {/* Hero Deal */}
            {topDeal && (
              <div
                onClick={() => navigate(`/patient/store/product/${topDeal.id}`)}
                className="col-span-1 md:col-span-2 md:row-span-2 rounded-[2rem] bg-gradient-to-br from-teal-500 to-cyan-600 p-1 relative overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-300"
              >
                <div className="bg-white h-full w-full rounded-[1.8rem] relative overflow-hidden flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 relative overflow-hidden h-64 md:h-auto">
                    <img
                      src={topDeal.image_url || 'https://via.placeholder.com/600'}
                      alt={topDeal.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-red-600 text-white font-bold px-4 py-2 rounded-full shadow-lg z-10 animate-bounce">
                      -{topDeal.discount}%
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 p-8 flex flex-col justify-center bg-gradient-to-br from-white to-teal-50">
                    <div className="flex items-center gap-2 text-teal-600 font-bold mb-3 bg-teal-100 w-fit px-3 py-1 rounded-lg">
                      <Sparkles className="w-4 h-4" /> صفقة اليوم
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                      {topDeal.name}
                    </h2>
                    <p className="text-slate-500 mb-6 line-clamp-3 leading-relaxed">
                      {topDeal.description}
                    </p>
                    <div className="flex items-end gap-3 mb-6">
                      <span className="text-4xl font-bold text-slate-900">{topDeal.price.toLocaleString()}</span>
                      {topDeal.original_price && (
                        <span className="text-xl text-slate-400 line-through decoration-red-500/30 mb-1">{topDeal.original_price.toLocaleString()}</span>
                      )}
                    </div>
                    <Button
                      className="w-full bg-teal-600 text-white hover:bg-teal-700 border-0 py-4 text-lg rounded-xl shadow-xl transition-all"
                      onClick={(e) => { e.stopPropagation(); addToCart(topDeal); }}
                    >
                      <ShoppingCart className="w-5 h-5 ml-2" />
                      أضف للسلة
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between hover:border-orange-200 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-4xl font-bold text-slate-800 block mb-1">{dealsProducts.length}</span>
                <span className="text-slate-500 text-sm">منتج مخفض حالياً</span>
              </div>
            </div>

            <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between hover:border-red-200 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-4xl font-bold text-slate-800 block mb-1">{maxDiscount}%</span>
                <span className="text-slate-500 text-sm">أعلى نسبة خصم</span>
              </div>
            </div>

            {/* Limited Time Banner */}
            <div className="col-span-1 md:col-span-2 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex items-center justify-between">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-teal-400 animate-pulse" />
                  عروض لفترة محدودة
                </h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  تنتهي هذه العروض قريباً. سارع بالشراء قبل نفاذ الكمية.
                </p>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full pointer-events-none"></div>
            </div>

            {/* Grid Deals */}
            {gridDeals.map((product) => (
              <div key={product.id} className="col-span-1 h-[340px]">
                <ProductCard
                  product={{ ...product, image: product.image_url }}
                  onAddToCart={(id, e) => { e.stopPropagation(); addToCart(product); }}
                  onToggleWishlist={(id, e) => { e.stopPropagation(); toggleWishlist(id); }}
                  isWishlisted={wishlistItems.has(product.id)}
                  onClick={() => navigate(`/patient/store/product/${product.id}`)}
                  className="h-full"
                />
              </div>
            ))}

          </div>
        )}

        {!loading && dealsProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 text-center">
            <Tag className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">لا توجد عروض حالياً</h2>
            <p className="text-slate-500">تابعنا قريباً لأفضل العروض والخصومات</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
