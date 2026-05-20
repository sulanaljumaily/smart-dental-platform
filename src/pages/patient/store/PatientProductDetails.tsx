import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  Star, Heart, ShoppingCart, Truck, Shield, AlertCircle,
  Minus, Plus, CheckCircle, Package
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { formatCurrency } from '../../../lib/utils';
import { toast } from 'sonner';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';

export const PatientProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { addToCart, cartItems } = useStoreCart();
  const { wishlistItems, toggleWishlist } = useWishlist();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchReviews();
    }
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers (id, name),
          brand:brands (id, name)
        `)
        .eq('id', productId)
        .single();

      if (data) {
        let price = data.price;
        let originalPrice = data.original_price;

        // Fallback if original_price is null or equal to price but discount is present
        if (data.discount && data.discount > 0) {
          if (!originalPrice || originalPrice <= price) {
            originalPrice = price;
            price = Math.round(originalPrice * (1 - data.discount / 100));
          }
        }

        setProduct({
          ...data,
          price,
          original_price: originalPrice,
          originalPrice,
          supplierName: data.supplier?.name || 'Unknown Supplier',
          brandName: data.brand?.name || 'Generic'
        });
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image_url,
        supplierId: product.supplier_id,
        supplierName: product.supplierName
      } as any, quantity);
      toast.success('تمت الإضافة للسلة');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">المنتج غير موجود</h2>
        <Link to="/patient/store" className="mt-4 text-teal-600 hover:underline">العودة للمتجر</Link>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : (product.rating || '0').toString();

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      <PatientStoreHeader />

      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/patient/store" className="hover:text-teal-600 transition-colors">المتجر</Link>
            <span>/</span>
            <span>{product.category}</span>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 p-8 flex items-center justify-center group relative">
              {/* Badges Overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                {product.discount && product.discount > 0 && (
                  <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md animate-pulse">
                    خصم {product.discount}%
                  </span>
                )}
                {product.is_featured && (
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                    مميز ✨
                  </span>
                )}
                {product.is_new && (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                    جديد 🆕
                  </span>
                )}
              </div>

              <img
                src={(product.images && product.images.length > 0 ? product.images[activeImageIdx] : null) || product.image_url || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {product.images.map((imgUrl: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 bg-white p-1 transition-all ${
                      activeImageIdx === idx 
                        ? 'border-teal-500 shadow-md scale-105' 
                        : 'border-gray-100 hover:border-teal-200'
                    }`}
                  >
                    <img src={imgUrl} className="w-full h-full object-contain" alt={`${product.name} - ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold">
                    {product.category}
                  </span>
                  {product.brandName && product.brandName !== 'Generic' && (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                      {product.brandName}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">{product.name}</h1>

                <div className="flex items-center gap-6 text-sm mb-6">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-lg text-gray-900">{averageRating}</span>
                    <span className="text-gray-500">({reviews.length} تقييم)</span>
                  </div>
                </div>

                <div className="prose prose-sm text-gray-600 mb-8 max-w-none">
                  <p>{product.description}</p>
                </div>

                {/* Features (Mock) */}
                <div className="space-y-3 mb-8">
                  {['منتج أصلي 100%', 'ضمان الجودة', 'شحن سريع'].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-gray-700">
                      <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Action Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 md:p-6 sticky bottom-[80px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex flex-col">
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(product.original_price)}
                      </span>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl md:text-3xl font-bold text-teal-600">{formatCurrency(product.price)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">شاملة جميع الرسوم والضرائب</p>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 hover:bg-white rounded-md shadow-sm transition-all"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="w-6 text-center font-bold text-base">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1.5 hover:bg-white rounded-md shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 text-sm md:text-base py-2.5 h-auto rounded-xl gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-200/40"
                >
                  <ShoppingCart className="w-5 h-5" />
                  إضافة للسلة
                </Button>
                <button 
                  onClick={() => toggleWishlist(product.id)}
                  className={`px-4 rounded-xl border-2 transition-all ${wishlistItems.has(product.id) ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                >
                  <Heart className={`w-5 h-5 ${wishlistItems.has(product.id) ? 'fill-current' : ''}`} />
                </button>
              </div>


            </div>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
};
