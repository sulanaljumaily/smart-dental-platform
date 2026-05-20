import React, { useState, useEffect } from 'react';
import { Tag, Clock, TrendingDown, Flame, ArrowLeft } from 'lucide-react';
import { ProductCard } from '../../../components/store/ProductCard';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
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
        .eq('is_active', true)
        .not('discount', 'is', null)
        .gt('discount', 0)
        .order('discount', { ascending: false });

      if (data) {
        setDealsProducts(data.map((p: any) => {
          let price = p.price;
          let originalPrice = p.original_price;

          // Fallback if original_price is null or equal to price but discount is present
          if (p.discount && p.discount > 0) {
            if (!originalPrice || originalPrice <= price) {
              originalPrice = price;
              price = Math.round(originalPrice * (1 - p.discount / 100));
            }
          }

          return {
            ...p,
            price,
            original_price: originalPrice,
            originalPrice,
            image: p.image_url,
            supplierName: p.supplier?.name
          };
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const maxDiscount = Math.max(...dealsProducts.map(p => p.discount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-max">

            {/* Stats 1 */}
            <div className="col-span-1 h-[140px] bg-white rounded-3xl p-4 border border-slate-100 flex flex-col justify-between hover:border-orange-200 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-800 block leading-tight">{dealsProducts.length}</span>
                <span className="text-slate-400 text-xs font-medium">منتج مخفض حالياً</span>
              </div>
            </div>

            {/* Limited Time Banner */}
            <div className="col-span-1 md:col-span-3 h-[140px] bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex items-center justify-between group">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-400 animate-pulse" />
                  عروض لفترة محدودة
                </h3>
                <p className="text-slate-400 text-[11px] max-w-[200px] sm:max-w-xs leading-relaxed">
                  تنتهي هذه العروض قريباً. سارع بالشراء قبل نفاذ الكمية.
                </p>
              </div>
              <div className="absolute right-0 top-0 w-48 h-48 bg-teal-500/10 blur-[80px] rounded-full pointer-events-none"></div>
            </div>

            {/* Grid Deals */}
            {dealsProducts.map((product) => (
              <div key={product.id} className="col-span-1 h-[260px] md:h-[340px]">
                <ProductCard
                  product={product}
                  onAddToCart={(id, e) => { e.stopPropagation(); addToCart(product); }}
                  onToggleWishlist={(id, e) => { e.stopPropagation(); toggleWishlist(id); }}
                  isWishlisted={wishlistItems.has(product.id)}
                  onClick={() => navigate(`/patient/store/product/${product.id}`)}
                  className="h-full border border-teal-50/50 hover:border-teal-100 transition-all duration-300"
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


