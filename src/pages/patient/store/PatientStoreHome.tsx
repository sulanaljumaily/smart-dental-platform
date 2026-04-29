import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Sparkles, Store, Star, Activity, ShieldCheck, Smile, ChevronLeft, ArrowRight, Box, Layers } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { supabase } from '../../../lib/supabase';
import { ProductCard } from '../../../components/store/ProductCard';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useAuth } from '../../../contexts/AuthContext';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';

const patientCategories = [
  { id: '1', name: 'العناية اليومية', description: 'معجون وغسول الفم', icon: Sparkles, bg: 'bg-teal-50', color: 'text-teal-600' },
  { id: '2', name: 'فرش الأسنان', description: 'يدوية وكهربائية', icon: Activity, bg: 'bg-blue-50', color: 'text-blue-600' },
  { id: '3', name: 'تبييض الأسنان', description: 'لصقات وأقلام تبييض', icon: Star, bg: 'bg-purple-50', color: 'text-purple-600' },
  { id: '4', name: 'عناية خاصة', description: 'للتقويم والحساسية', icon: ShieldCheck, bg: 'bg-amber-50', color: 'text-amber-600' },
  { id: '5', name: 'عناية الأطفال', description: 'منتجات آمنة للأطفال', icon: Smile, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { id: '6', name: 'مستلزمات صحية', description: 'خيط مائي وعيدان', icon: Grid, bg: 'bg-rose-50', color: 'text-rose-600' },
];

export const PatientStoreHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useStoreCart();
  const { wishlistItems, toggleWishlist } = useWishlist();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [dealsProducts, setDealsProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch Categories
    const { data: cats } = await supabase
      .from('patient_store_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (cats) setCategories(cats);

    // Fetch Products (Patient target)
    const { data: prods } = await supabase
      .from('products')
      .select(`
        id, name, price, original_price, discount, image_url, rating, is_new, is_featured, created_at,
        supplier:suppliers!inner(name, store_type, id, logo)
      `)
      .contains('target_audience', ['patient'])
      .in('suppliers.store_type', ['patient', 'both'])
      .eq('status', 'active')
      .limit(50);

    if (prods) {
      const mappedProds = prods.map((p: any) => ({
        ...p,
        supplier_name: p.supplier?.name,
      }));
      setProducts(mappedProds);
      setFeaturedProducts(mappedProds.filter(p => p.is_featured));
      setDealsProducts(mappedProds.filter(p => p.discount && p.discount > 0));
      
      // Extract unique suppliers
      const uniqueSuppliersMap = new Map();
      prods.forEach((p: any) => {
        if (!uniqueSuppliersMap.has(p.supplier.id)) {
          uniqueSuppliersMap.set(p.supplier.id, p.supplier);
        }
      });
      setSuppliers(Array.from(uniqueSuppliersMap.values()));
    }

    // Mock Promotions for Patient Store
    setPromotions([
      {
        id: '1',
        title: 'عناية متكاملة لأسنانك',
        description: 'تسوق أفضل منتجات العناية بالأسنان بأسعار مخفضة للمراجعين',
        image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1600&auto=format&fit=crop',
        buttonText: 'تصفح العروض',
        link: '/patient/store',
        badge_text: '✨ عروض المراجعين'
      }
    ]);
  };

  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      {/* Auth Banner for Logged-in Users */}
      {user && (
        <div className="bg-teal-50 border-b border-teal-100 px-4 py-3 flex items-center gap-2 max-w-7xl mx-auto mb-6 rounded-b-xl">
          <div className="w-8 h-8 rounded-full bg-teal-200 flex items-center justify-center text-teal-700 font-bold">
            {user.name?.charAt(0) || 'م'}
          </div>
          <div className="text-sm">
            <p className="text-teal-900 font-bold">مرحباً بك في متجرك، {user.name}</p>
            <p className="text-teal-700 text-xs">تصفح أحدث المنتجات الصحية وأفضل العروض</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto">

          {/* 1. Dynamic Hero Banner */}
          <div className="col-span-1 md:col-span-4 row-span-2 relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden shadow-xl group">
            {promotions.map((promo, idx) => (
              <div key={promo.id} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <div className="absolute inset-0">
                  <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-900/80 via-cyan-900/60 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="relative z-20 h-full flex flex-col justify-center items-start px-8 md:px-20 max-w-3xl text-white">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs md:text-sm font-semibold mb-4 border border-white/10">
                    {promo.badge_text}
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">{promo.title}</h2>
                  <p className="text-lg md:text-xl text-teal-50 mb-8 max-w-xl leading-relaxed">{promo.description}</p>
                  <Button className="bg-white text-teal-900 hover:bg-gray-100 border-0 px-8 py-3 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg">
                    {promo.buttonText}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 2. Patient Categories */}
          <div className="col-span-1 md:col-span-4">
            <div className="flex items-center justify-between mb-4 mt-8">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Grid className="w-5 h-5 text-teal-600" /> تصفح الأقسام
              </h3>
              <button
                onClick={() => navigate('/patient/store/categories')}
                className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
              >
                عرض الكل <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal Scrollable Bento Row for Categories */}
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
              {categories.map((cat, idx) => {
                const styles = [
                  { bg: 'bg-teal-50', color: 'text-teal-600', icon: Sparkles },
                  { bg: 'bg-blue-50', color: 'text-blue-600', icon: Activity },
                  { bg: 'bg-purple-50', color: 'text-purple-600', icon: Star },
                  { bg: 'bg-amber-50', color: 'text-amber-600', icon: ShieldCheck },
                  { bg: 'bg-emerald-50', color: 'text-emerald-600', icon: Smile },
                  { bg: 'bg-rose-50', color: 'text-rose-600', icon: Grid },
                  { bg: 'bg-cyan-50', color: 'text-cyan-600', icon: Layers },
                  { bg: 'bg-indigo-50', color: 'text-indigo-600', icon: Box },
                ];
                const style = styles[idx % styles.length];
                const Icon = style.icon;

                return (
                  <div
                    key={cat.id}
                    onClick={() => navigate(`/patient/store/products?category=${encodeURIComponent(cat.name)}`)}
                    className={`flex-shrink-0 w-40 h-40 rounded-3xl p-4 relative overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl ${style.bg}`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm border border-white/50">
                      {cat.icon && cat.icon.match(/\p{Emoji}/u) ? (
                        <span className="text-xl">{cat.icon}</span>
                      ) : (
                        <Icon className={`w-5 h-5 ${style.color}`} />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1">{cat.name}</h3>
                    <p className="text-[10px] text-gray-500 line-clamp-2">تصفح المنتجات الصحية</p>

                    <Icon className={`absolute -bottom-2 -left-2 w-20 h-20 opacity-5 rotate-12 group-hover:scale-110 transition-transform ${style.color}`} />
                  </div>
                );
              })}
            </div>
          </div>


          {/* 3. Deals Section */}
          <div className="col-span-1 md:col-span-4 mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-500 fill-amber-500" /> عروض حصرية
                </h3>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-8 snap-x scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {dealsProducts.slice(0, 10).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(id, e) => { e.stopPropagation(); addToCart(product); }}
                  onToggleWishlist={(id, e) => { e.stopPropagation(); toggleWishlist(id); }}
                  isWishlisted={wishlistItems.has(product.id)}
                  onClick={() => navigate(`/patient/store/product/${product.id}`)}
                  className="min-w-[46%] md:min-w-[300px] snap-start h-[340px]"
                />
              ))}
            </div>
          </div>

          {/* 4. Featured Products */}
          <div className="col-span-1 md:col-span-4 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> منتجات مميزة
              </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-8 snap-x scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {featuredProducts.slice(0, 10).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(id, e) => { e.stopPropagation(); addToCart(product); }}
                  onToggleWishlist={(id, e) => { e.stopPropagation(); toggleWishlist(id); }}
                  isWishlisted={wishlistItems.has(product.id)}
                  onClick={() => navigate(`/patient/store/product/${product.id}`)}
                  className="min-w-[46%] md:min-w-[300px] snap-start h-[340px]"
                />
              ))}
            </div>
          </div>

          {/* 5. Success Partners (Suppliers) */}
          <div className="col-span-1 md:col-span-4 mt-12 mb-8 bg-teal-900 rounded-3xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6 text-white">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Store className="w-6 h-6 text-cyan-400" /> الموردون المعتمدون
                  </h3>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {suppliers.slice(0, 6).map((supplier) => (
                  <div key={supplier.id} className="flex-shrink-0 w-48 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden mb-3 group-hover:scale-110 transition-transform">
                      {supplier.logo ? (
                        <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-teal-800" />
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1">{supplier.name}</h4>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          </div>

        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
