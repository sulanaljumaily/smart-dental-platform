import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../../../components/store/ProductCard';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { supabase } from '../../../lib/supabase';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';

export const PatientProductsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addToCart } = useStoreCart();
    const { wishlistItems, toggleWishlist } = useWishlist();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const query = searchParams.get('q');
    const categoryName = searchParams.get('category');

    useEffect(() => {
        fetchProducts();
    }, [query, categoryName]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            let req = supabase
                .from('products')
                .select(`
                    id, name, description, price, original_price, discount, image_url, rating, is_new, is_featured, created_at, category,
                    supplier:suppliers!inner(name, store_type, id, logo)
                `)
                .contains('target_audience', ['patient'])
                .in('suppliers.store_type', ['patient', 'both'])
                .eq('status', 'active');

            if (categoryName) {
                req = req.eq('category', categoryName);
            }

            const { data } = await req;
            
            if (data) {
                let filtered = data;
                if (query) {
                    const lowerQuery = query.toLowerCase();
                    filtered = filtered.filter((p: any) =>
                        p.name.toLowerCase().includes(lowerQuery) ||
                        p.description?.toLowerCase().includes(lowerQuery)
                    );
                }
                setProducts(filtered);
            }
        } catch (error) {
            console.error('Error fetching patient products:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
            <PatientStoreHeader />
            
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        {query ? `نتائج البحث: "${query}"` : categoryName ? categoryName : 'جميع المنتجات'}
                    </h1>
                    <span className="bg-teal-100 text-teal-600 px-3 py-1 rounded-full text-sm font-medium">
                        {products.length} منتج
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="h-full">
                                <ProductCard
                                    product={product}
                                    onAddToCart={(id) => addToCart(product)}
                                    onToggleWishlist={toggleWishlist}
                                    isWishlisted={wishlistItems.has(product.id)}
                                    onClick={() => navigate(`/patient/store/product/${product.id}`)}
                                    className="h-[340px] border-slate-100 hover:border-teal-200"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-4">
                        <div className="bg-slate-50 p-6 rounded-full shadow-inner mb-4">
                            <SlidersHorizontal className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد منتجات</h3>
                        <p className="text-slate-500 max-w-md">للاسف، لا تتوفر منتجات تطابق بحثك حالياً.</p>
                        <button
                            onClick={() => navigate('/patient/store')}
                            className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors"
                        >
                            العودة للمتجر
                        </button>
                    </div>
                )}
            </div>
            
            <BottomNavigation />
        </div>
    );
};
