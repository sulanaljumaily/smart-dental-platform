import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/common/Button';
import { Plus, Pencil, Trash2, Save, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface PatientCategory {
  id: string; name: string; icon: string; color: string; sort_order: number; is_active: boolean;
}

const PRESET_ICONS = ['🦷', '🧴', '🪥', '💊', '🎁', '🧸', '🩺', '💉', '🩹', '🫀', '🧪', '🌿', '🍃', '⭐', '🏥'];
const PRESET_COLORS = [
  '#14b8a6', '#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#ec4899',
  '#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#64748b'
];

export const PatientStoreCategoriesSection: React.FC = () => {
  const [categories, setCategories] = useState<PatientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '🦷', color: '#14b8a6' });

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_store_categories')
      .select('*')
      .order('sort_order');
    if (data) setCategories(data);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('أدخل اسم الفئة'); return; }
    const maxOrder = categories.length ? Math.max(...categories.map(c => c.sort_order)) + 1 : 1;
    const { error } = await supabase.from('patient_store_categories').insert({
      name: form.name, icon: form.icon, color: form.color, sort_order: maxOrder, is_active: true
    });
    if (error) { toast.error('فشل الإضافة'); return; }
    toast.success('تمت إضافة الفئة');
    setShowAddForm(false);
    setForm({ name: '', icon: '🦷', color: '#14b8a6' });
    fetchCategories();
  };

  const handleUpdate = async (id: string, updates: Partial<PatientCategory>) => {
    const { error } = await supabase.from('patient_store_categories').update(updates).eq('id', id);
    if (error) { toast.error('فشل التحديث'); return; }
    toast.success('تم التحديث');
    setEditingId(null);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    await supabase.from('patient_store_categories').delete().eq('id', id);
    toast.success('تم الحذف');
    fetchCategories();
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase.from('patient_store_categories').update({ is_active: !is_active }).eq('id', id);
    fetchCategories();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">فئات متجر المرضى</h2>
          <p className="text-gray-500 text-sm mt-0.5">إدارة الفئات الظاهرة لمراجعي المنصة</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="w-4 h-4" /> إضافة فئة
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-teal-800">فئة جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">اسم الفئة</label>
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: العناية بالأسنان"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">الأيقونة</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm({ ...form, icon })}
                    className={`w-8 h-8 rounded-lg text-lg transition-all ${form.icon === icon ? 'ring-2 ring-teal-500 bg-teal-100' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">اللون</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button key={color} onClick={() => setForm({ ...form, color })}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === color ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : ''}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: form.color + '20', border: `2px solid ${form.color}` }}>
                <span className="text-2xl">{form.icon}</span>
                <span className="font-bold text-sm" style={{ color: form.color }}>{form.name || 'معاينة'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
              <Save className="w-4 h-4" /> حفظ
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex items-center gap-2">
              <X className="w-4 h-4" /> إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="grid gap-3">
          {categories.map(cat => (
            <div key={cat.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${cat.is_active ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: cat.color + '20' }}>{cat.icon}</div>
              <div className="flex-1">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      defaultValue={cat.name}
                      id={`edit-cat-${cat.id}`}
                      className="border rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button onClick={() => {
                      const el = document.getElementById(`edit-cat-${cat.id}`) as HTMLInputElement;
                      handleUpdate(cat.id, { name: el.value });
                    }} className="p-1 bg-teal-100 text-teal-600 rounded hover:bg-teal-200"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400">الترتيب: {cat.sort_order}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(cat.id, cat.is_active)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${cat.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {cat.is_active ? 'نشط' : 'مخفي'}
                </button>
                <button onClick={() => setEditingId(cat.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
