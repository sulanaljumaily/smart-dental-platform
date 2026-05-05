import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/common/Button';
import { Plus, Pencil, Trash2, Save, X, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface PatientBrand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export const PatientStoreBrandsSection: React.FC = () => {
  const [brands, setBrands] = useState<PatientBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', logo: '', description: '' });

  const fetchBrands = async () => {
    setLoading(true);
    // Try patient_store_brands, fall back to filtering suppliers by store_type
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, logo, description: address, is_active: is_active')
      .in('store_type', ['patient', 'both'])
      .order('name');
    if (data) setBrands(data.map((b: any, i: number) => ({ ...b, description: b.description || '', sort_order: i + 1 })));
    setLoading(false);
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleToggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('suppliers').update({ is_active: !is_active }).eq('id', id);
    if (error) { toast.error('فشل التحديث'); return; }
    toast.success(is_active ? 'تم إخفاء الماركة' : 'تم تفعيل الماركة');
    fetchBrands();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ماركات متجر المرضى</h2>
          <p className="text-gray-500 text-sm mt-0.5">الموردون المرتبطون بمتجر المراجعين (store_type: patient / both)</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="grid gap-3">
          {brands.map(brand => (
            <div key={brand.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${brand.is_active ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
                ) : (
                  <Globe className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{brand.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{brand.description || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(brand.id, brand.is_active)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${brand.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {brand.is_active ? 'نشط' : 'مخفي'}
                </button>
              </div>
            </div>
          ))}
          {brands.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">لا توجد ماركات معتمدة لمتجر المرضى بعد</p>
              <p className="text-sm mt-1">تأكد من ضبط store_type = 'patient' أو 'both' لدى الموردين</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
