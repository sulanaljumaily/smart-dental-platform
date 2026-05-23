import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { AdminTable, Column } from '../../../components/admin/AdminTable';
import { Button } from '../../../components/common/Button';
import { Check, X, Edit, Trash2, Search, ShieldCheck, ShieldAlert, Plus, Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdminModal } from '../../../components/admin/AdminModal';
import { BrandDetailsModal } from '../../../components/admin/store/BrandDetailsModal';

interface Brand {
    id: string;
    name: string;
    logo?: string;
    description?: string;
    is_verified: boolean;
    created_at: string;
    products_count?: number; // Post-processed
    target_audience?: string[];
}

export const PatientStoreBrandsSection: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit/Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', logo: '', target_audience: ['patient'] as string[] });
    const [uploading, setUploading] = useState(false);

    // Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('brands')
                .select('*, products(count)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((b: any) => ({
                ...b,
                products_count: b.products?.[0]?.count || 0
            })).filter((b: any) => b.target_audience?.includes('patient')); // Filter ONLY patient-targeted brands

            setBrands(formatted);
        } catch (error) {
            console.error('Error fetching patient brands:', error);
            toast.error('فشل تحميل علامات متجر المرضى');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const handleVerify = async (brand: Brand) => {
        try {
            const { error } = await supabase
                .from('brands')
                .update({ is_verified: !brand.is_verified })
                .eq('id', brand.id);

            if (error) throw error;

            toast.success(brand.is_verified ? 'تم إلغاء توثيق العلامة' : 'تم توثيق العلامة بنجاح');
            fetchBrands();
        } catch (error) {
            toast.error('حدث خطأ أثناء التحديث');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه العلامة التجارية؟ سيتم فك ربط المنتجات بها.')) return;

        try {
            const { error } = await supabase.from('brands').delete().eq('id', id);
            if (error) throw error;
            toast.success('تم الحذف بنجاح');
            fetchBrands();
        } catch (error) {
            toast.error('لا يمكن حذف العلامة لوجود منتجات مرتبطة بها');
        }
    };

    const handleSave = async () => {
        try {
            if (editingBrand) {
                const { error } = await supabase
                    .from('brands')
                    .update(formData)
                    .eq('id', editingBrand.id);
                if (error) throw error;
                toast.success('تم تحديث العلامة التجارية');
            } else {
                // Admin Create
                const { error } = await supabase
                    .from('brands')
                    .insert([{ ...formData, is_verified: true }]); // Admin created brands are verified by default
                if (error) throw error;
                toast.success('تم إنشاء العلامة التجارية');
            }
            setIsModalOpen(false);
            fetchBrands();
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء الحفظ');
        }
    };

    const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileName = `brand-logos/${Date.now()}_${file.name}`;
            const { error } = await supabase.storage.from('products').upload(fileName, file);
            if (error) throw error;

            const { data } = supabase.storage.from('products').getPublicUrl(fileName);
            setFormData({ ...formData, logo: data.publicUrl });
        } catch (error) {
            toast.error('فشل رفع الشعار');
        } finally {
            setUploading(false);
        }
    };

    const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const columns: Column[] = [
        {
            key: 'name',
            title: 'العلامة التجارية',
            sortable: true,
            render: (val, record) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center p-1 border border-gray-200">
                        {record.logo ? (
                            <img src={record.logo} alt={val} className="w-full h-full object-contain" />
                        ) : (
                            <span className="font-bold text-gray-400 text-xs">{val.slice(0, 2)}</span>
                        )}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                            {val}
                            {record.is_verified && <ShieldCheck className="w-3 h-3 text-teal-500" />}
                        </div>
                        <div className="text-xs text-gray-500">{record.products_count} منتج</div>
                    </div>
                </div>
            )
        },
        {
            key: 'description',
            title: 'الوصف',
            render: (val) => <span className="text-sm text-gray-600 line-clamp-1 max-w-xs">{val || '-'}</span>
        },
        {
            key: 'target_audience',
            title: 'الجمهور المستهدف',
            render: (_, record) => {
                const aud = record.target_audience || ['clinic', 'lab'];
                const isPatient = aud.includes('patient');
                const isClinicOrLab = aud.includes('clinic') || aud.includes('lab');
                
                if (isPatient && isClinicOrLab) {
                    return (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                            الجميع
                        </span>
                    );
                } else if (isPatient) {
                    return (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">
                            المرضى
                        </span>
                    );
                } else {
                    return (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            الأطباء والمختبرات
                        </span>
                    );
                }
            }
        },
        {
            key: 'is_verified',
            title: 'الحالة',
            sortable: true,
            render: (val) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${val ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                    {val ? 'موثقة' : 'غير موثقة'}
                </span>
            )
        },
        {
            key: 'actions',
            title: 'الإجراءات',
            render: (_, record) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setSelectedBrandId(record.id);
                            setDetailsModalOpen(true);
                        }}
                        className="text-gray-600 hover:bg-gray-50"
                        title="عرض التفاصيل"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(record as Brand)}
                        className={record.is_verified ? 'text-orange-600 hover:bg-orange-50' : 'text-teal-600 hover:bg-teal-50'}
                        title={record.is_verified ? 'إلغاء التوثيق' : 'توثيق العلامة'}
                    >
                        {record.is_verified ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setEditingBrand(record as Brand);
                            setFormData({
                                name: record.name,
                                description: record.description || '',
                                logo: record.logo || '',
                                target_audience: record.target_audience || ['patient']
                            });
                            setIsModalOpen(true);
                        }}
                    >
                        <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="hover:bg-red-50 text-red-600"
                        onClick={() => handleDelete(record.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-4" dir="rtl">

            {/* Header / Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-wrap gap-3">
                <div className="relative w-72">
                    <input
                        type="text"
                        placeholder="ابحث عن علامة تجارية..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 outline-none text-sm"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                </div>
                <Button onClick={() => {
                    setEditingBrand(null);
                    setFormData({ name: '', description: '', logo: '', target_audience: ['patient'] });
                    setIsModalOpen(true);
                }} className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة علامة جديدة
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">جاري التحميل...</div>
            ) : (
                <AdminTable columns={columns} data={filteredBrands} />
            )}

            {/* Create/Edit Modal */}
            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBrand ? 'تعديل بيانات العلامة' : 'إضافة علامة تجارية'}
            >
                <div className="space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="relative group w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-teal-500 cursor-pointer">
                            {formData.logo ? (
                                <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-gray-400" />
                            )}
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={uploadLogo}
                                disabled={uploading}
                            />
                            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">جاري الرفع...</div>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">اسم العلامة التجارية</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-100 text-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الوصف</label>
                        <textarea
                            className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-100 text-sm"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">الجمهور المستهدف</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, target_audience: ['clinic', 'lab'] })}
                                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                                    formData.target_audience?.includes('clinic') && !formData.target_audience?.includes('patient')
                                        ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                الأطباء والمختبرات
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, target_audience: ['patient'] })}
                                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                                    formData.target_audience?.includes('patient') && !formData.target_audience?.includes('clinic')
                                        ? 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                المرضى
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, target_audience: ['clinic', 'lab', 'patient'] })}
                                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                                    formData.target_audience?.includes('clinic') && formData.target_audience?.includes('patient')
                                        ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                الجميع
                            </button>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                        <Button onClick={handleSave} disabled={!formData.name || uploading} className="bg-teal-600 hover:bg-teal-700 text-white">حفظ</Button>
                    </div>
                </div>
            </AdminModal>

            {/* Details Modal */}
            {selectedBrandId && (
                <BrandDetailsModal
                    isOpen={detailsModalOpen}
                    onClose={() => {
                        setDetailsModalOpen(false);
                        setSelectedBrandId(null);
                        fetchBrands();
                    }}
                    brandId={selectedBrandId}
                    onVerifyChange={fetchBrands}
                />
            )}
        </div>
    );
};
