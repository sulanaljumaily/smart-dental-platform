import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, CreditCard, ShoppingBag, Receipt, MapPin, Truck, Check, Heart, Building, AlertCircle } from 'lucide-react';
import { useStoreCart } from '../../../hooks/useStoreCart';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';
import { useStoreAddresses } from '../../../hooks/useStoreAddresses';

export const PatientCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, totals } = useStoreCart();
  const { user } = useAuth();
  const { addresses, addAddress } = useStoreAddresses();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [newAddressName, setNewAddressName] = useState('المنزل');
  const [saveAsNewAddress, setSaveAsNewAddress] = useState(false);

  const [shippingAddress, setShippingAddress] = useState({
    governorate: 'بغداد',
    city: '',
    address: '',
    phone: '',
    recipientName: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Set default prefilled user info
  useEffect(() => {
    if (user) {
      setShippingAddress(prev => ({
        ...prev,
        recipientName: user.name || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  // Set default selected address on mount if available
  useEffect(() => {
    if (addresses.length > 0) {
      const def = addresses.find(a => a.isDefault);
      setSelectedAddressId(def ? def.id : addresses[0].id);
    }
  }, [addresses]);

  // Sync selected address fields
  useEffect(() => {
    if (selectedAddressId === 'new') {
      setShippingAddress(prev => ({
        ...prev,
        governorate: 'بغداد',
        city: '',
        address: '',
        phone: user?.phone || '',
        recipientName: user?.name || ''
      }));
    } else {
      const selected = addresses.find(a => a.id === selectedAddressId);
      if (selected) {
        setShippingAddress({
          governorate: selected.governorate || 'بغداد',
          city: selected.city || '',
          address: selected.street || '',
          phone: selected.phone || '',
          recipientName: selected.name || user?.name || ''
        });
      }
    }
  }, [selectedAddressId, addresses, user]);

  const handleCheckout = async () => {
    if (!shippingAddress.phone || !shippingAddress.city || !shippingAddress.address) {
      toast.error('يرجى ملء جميع معلومات التوصيل');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save address if chosen to save
      if (selectedAddressId === 'new' && saveAsNewAddress) {
        try {
          await addAddress({
            name: newAddressName || 'عنوان جديد',
            governorate: shippingAddress.governorate,
            city: shippingAddress.city,
            street: shippingAddress.address,
            phone: shippingAddress.phone
          });
        } catch (err) {
          console.error("Error saving new address:", err);
        }
      }

      // Get a valid supplier ID fallback from the database to avoid foreign key violations
      let fallbackSupplierId = '00000000-0000-0000-0000-000000000000';
      try {
        const { data: firstSupplier } = await supabase.from('suppliers').select('id').limit(1);
        if (firstSupplier && firstSupplier.length > 0) {
          fallbackSupplierId = firstSupplier[0].id;
        }
      } catch (err) {
        console.error("Error fetching fallback supplier:", err);
      }

      // Group items by supplier for orders
      const suppliersSet = new Set(cartItems.map(i => i.supplierId || (i as any).supplier_id || fallbackSupplierId));
      const suppliersArr = Array.from(suppliersSet);
      
      const orderNumber = `ORD-${Math.floor(Math.random() * 1000000000)}`;

      for (let index = 0; index < suppliersArr.length; index++) {
        const supplierId = suppliersArr[index] || fallbackSupplierId;
        const items = cartItems.filter(i => (i.supplierId || (i as any).supplier_id || fallbackSupplierId) === supplierId);
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const shippingShare = index === 0 ? totals.shipping : 0;
        const total = subtotal + shippingShare;
        const subOrderNumber = `${orderNumber}-${supplierId.slice(0, 4)}`;

        let orderUserName = user?.name || 'مريض';
        if (shippingAddress.recipientName) {
          orderUserName += ` - ${shippingAddress.recipientName}`;
        }

        const orderNotes = `Phone: ${shippingAddress.phone}\nAddress: ${shippingAddress.governorate || ''}، ${shippingAddress.city || ''}، ${shippingAddress.address || ''}`;

        const { data: order, error } = await supabase.from('store_orders').insert({
          order_number: subOrderNumber,
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          user_name: orderUserName,
          ordered_by: user?.name || 'مريض',
          supplier_id: supplierId,
          total_amount: total,
          status: 'pending',
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash' ? 'pending' : 'paid',
          shipping_address: shippingAddress,
          notes: orderNotes,
          created_at: new Date().toISOString()
        }).select().single();

        if (error) throw error;

        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.id,
          supplier_id: supplierId,
          quantity: item.quantity,
          price_at_purchase: item.price
        }));

        const { error: itemsError } = await supabase.from('store_order_items').insert(orderItems);
        if (itemsError) throw itemsError;
      }

      setOrderComplete(true);
      toast.success('تم استلام طلبك بنجاح!');
      clearCart();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'حدث خطأ أثناء إتمام الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
        <PatientStoreHeader />
        <div className="flex items-center justify-center p-4 mt-12">
          <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full border border-slate-100 shadow-xl">
            <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">شكراً لطلبك!</h2>
            <p className="text-slate-500 mb-8">تم استلام طلبك بنجاح وسيتم تجهيزه قريباً.</p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/patient/store')} className="w-full bg-slate-900 text-white hover:bg-slate-800 py-3 rounded-xl">
                العودة للمتجر
              </Button>
              <Button onClick={() => navigate('/patient/store/orders')} variant="ghost" className="w-full">
                متابعة طلباتي
              </Button>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
        <PatientStoreHeader />
        <div className="flex items-center justify-center p-4 mt-12">
          <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full border border-slate-100 shadow-xl">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-teal-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">سلة التسوق فارغة</h2>
            <p className="text-slate-500 mb-8">لم تقم بإضافة أي منتجات للسلة بعد. ابدأ التسوق الآن!</p>
            <Button onClick={() => navigate('/patient/store')} className="w-full bg-slate-900 text-white hover:bg-teal-600 py-3 rounded-xl">
              تصفح المنتجات
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32" dir="rtl">
      <PatientStoreHeader />

      {/* Checkout Modal Overlay */}
      {isCheckingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Truck className="w-6 h-6 text-teal-600" />
                إتمام الطلب
              </h2>
              <button onClick={() => setIsCheckingOut(false)} className="text-slate-400 hover:text-slate-600">إغلاق</button>
            </div>

            <div className="p-6 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-500" />
                    بيانات التوصيل
                  </h3>
                </div>

                {/* Saved Addresses List */}
                {addresses.length > 0 && (
                  <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-400 mb-3 text-right">اختر من العناوين المحفوظة</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 rounded-xl border text-right cursor-pointer transition-all flex flex-col justify-between ${selectedAddressId === addr.id ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:bg-slate-50/50'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-900 text-sm">{addr.name}</span>
                            <input
                              type="radio"
                              name="selectedAddress"
                              checked={selectedAddressId === addr.id}
                              onChange={() => setSelectedAddressId(addr.id)}
                              className="text-teal-600 focus:ring-teal-500 w-4 h-4"
                            />
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{addr.governorate}، {addr.city}، {addr.street}</p>
                          <p className="text-xs text-slate-400 mt-2 font-mono" dir="ltr">{addr.phone}</p>
                        </div>
                      ))}
                      
                      {/* Option to type new address */}
                      <div
                        onClick={() => setSelectedAddressId('new')}
                        className={`p-4 rounded-xl border text-right cursor-pointer transition-all flex items-center justify-between ${selectedAddressId === 'new' ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:bg-slate-50/50'}`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">أدخل عنواناً جديداً</span>
                          <span className="text-xs text-slate-400 block mt-1">تحديد موقع توصيل جديد</span>
                        </div>
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={selectedAddressId === 'new'}
                          onChange={() => setSelectedAddressId('new')}
                          className="text-teal-600 focus:ring-teal-500 w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Form Inputs */}
                {selectedAddressId === 'new' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل للمستلم</label>
                      <input
                        type="text"
                        placeholder="أدخل الاسم الكامل"
                        value={shippingAddress.recipientName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, recipientName: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">اسم العنوان (مثال: المنزل، العمل)</label>
                      <input
                        type="text"
                        placeholder="المنزل"
                        value={newAddressName}
                        onChange={(e) => setNewAddressName(e.target.value)}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">المحافظة</label>
                      <select
                        value={shippingAddress.governorate}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, governorate: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      >
                        {['بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك', 'كركوك', 'صلاح الدين', 'ديالى', 'الأنبار', 'بابل', 'كربلاء', 'النجف', 'واسط', 'القادسية', 'ميسان', 'ذي قار', 'المثنى'].map((gov) => (
                          <option key={gov} value={gov}>{gov}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">المدينة / المنطقة</label>
                      <input
                        type="text"
                        placeholder="مثال: المنصور"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">العنوان التفصيلي</label>
                      <input
                        type="text"
                        placeholder="المحلة، الزقاق، الدار..."
                        value={shippingAddress.address}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                      <input
                        type="tel"
                        placeholder="0770..."
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={saveAsNewAddress}
                          onChange={(e) => setSaveAsNewAddress(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                        />
                        <span className="text-sm text-slate-600">حفظ هذا العنوان لاستخدامه مستقبلاً</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  // Selection from Saved Addresses
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1 text-right">الاسم الكامل للمستلم</label>
                      <input
                        type="text"
                        placeholder="اسم المستلم"
                        value={shippingAddress.recipientName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, recipientName: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm font-bold text-right"
                      />
                      <p className="text-xs text-slate-400 mt-1 text-right">يمكنك تعديل اسم المستلم لهذا الطلب بسهولة.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1 text-right">رقم هاتف المستلم</label>
                      <input
                        type="tel"
                        placeholder="0770..."
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                        className="w-full rounded-xl border-slate-200 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm text-right"
                      />
                    </div>
                    <div className="md:col-span-2 text-right pt-2 border-t border-slate-200/60 mt-2">
                      <span className="text-xs font-bold text-slate-400 block mb-1">موقع التوصيل المحدد:</span>
                      <p className="text-sm text-slate-800 font-bold">
                        {shippingAddress.governorate}، {shippingAddress.city}، {shippingAddress.address}
                      </p>
                    </div>
                  </div>
                )}
              </section>

            </div>

            <div className="mx-6 mb-6 p-3.5 sm:py-4 sm:px-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 flex flex-row items-center justify-between gap-4 shadow-xl shadow-teal-600/5 sticky bottom-4 hover:shadow-2xl hover:shadow-teal-600/10 hover:-translate-y-0.5 transition-all duration-300 z-20">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">الإجمالي للدفع</span>
                <span className="text-base sm:text-xl font-black text-teal-600 tracking-tight">{formatCurrency(totals.total)}</span>
              </div>
              <Button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-md shadow-teal-200 hover:shadow-lg hover:shadow-teal-300 active:scale-95 transition-all flex items-center justify-center gap-2 group/btn shrink-0"
              >
                <span>{isSubmitting ? 'جاري التنفيذ...' : 'تأكيد الطلب'}</span>
                {!isSubmitting && <Check className="w-4 h-4 sm:w-5 h-5 group-hover/btn:scale-110 transition-transform" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items Column */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(
              cartItems.reduce((acc, item) => {
                const supplierId = item.supplierId || 'unknown';
                const supplierName = item.supplierName || 'مورد غير معروف';
                if (!acc[supplierId]) acc[supplierId] = { supplierName, items: [] };
                acc[supplierId].items.push(item);
                return acc;
              }, {} as Record<string, { supplierName: string, items: typeof cartItems }>)
            ).map(([supplierId, group]) => (
              <div key={supplierId} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{group.supplierName}</h3>
                    <p className="text-xs text-slate-500">منتجات من هذا المورد</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.id} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex sm:flex-row flex-col gap-6 relative overflow-hidden group">
                      <div className="w-full sm:w-32 h-32 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => navigate(`/patient/store/product/${item.id}`)}>
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>

                      <div className="flex-1 flex flex-col justify-between z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg mb-1 cursor-pointer text-slate-900 hover:text-teal-600" onClick={() => navigate(`/patient/store/product/${item.id}`)}>{item.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                              title="حذف من السلة"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-between items-end mt-4 gap-4">
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-200">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-slate-200 transition-colors text-slate-700"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg shadow-sm hover:bg-teal-600 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-left">
                            <p className="text-xs text-slate-400 mb-1">المجموع</p>
                            <span className="font-bold text-teal-600 text-xl">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-lg sticky top-8">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
                <Receipt className="w-6 h-6 text-slate-400" />
                ملخص الطلب
              </h3>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>الشحن</span>
                  <span className={`font-medium ${totals.shipping === 0 ? 'text-green-600' : ''}`}>
                    {totals.shipping === 0 ? 'مجاني' : formatCurrency(totals.shipping)}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-xl">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (!user) {
                    toast.error('يرجى تسجيل الدخول أولاً لإتمام عملية الشراء');
                    navigate('/patient-login');
                    return;
                  }
                  setIsCheckingOut(true);
                }}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl shadow-lg shadow-teal-200 mb-6 font-bold text-lg flex items-center justify-center gap-2 group"
              >
                <span>إتمام الشراء</span>
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Button>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-6 border border-slate-100">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">تسوق آمن 100%</p>
                  <p className="text-xs text-slate-500">نضمن حماية بياناتك ومدفوعاتك</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};
