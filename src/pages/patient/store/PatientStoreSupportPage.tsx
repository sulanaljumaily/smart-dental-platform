import React from 'react';
import { ChevronLeft, MessageSquare, Headphones, Phone, Mail, HelpCircle } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';

export const PatientStoreSupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Quick Support Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-teal-600 rounded-3xl p-6 text-white text-center cursor-pointer hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 group">
              <Headphones className="w-10 h-10 mx-auto mb-3 opacity-90 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg">محادثة مباشرة</h3>
              <p className="text-teal-100 text-xs mt-1">متواجدون 24/7</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center cursor-pointer hover:border-teal-200 hover:bg-teal-50 transition-colors group">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-teal-600 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-slate-900 text-lg">تذكرة دعم</h3>
              <p className="text-slate-500 text-xs mt-1">رد خلال 24 ساعة</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              معلومات الاتصال
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-slate-100">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900" dir="ltr">+964 770 000 0000</p>
                  <p className="text-xs text-slate-500">رقم الهاتف الموحد</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-slate-100">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">support@smart-dental.com</p>
                  <p className="text-xs text-slate-500">البريد الإلكتروني</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
              الأسئلة الشائعة
              <Button variant="ghost" size="sm" className="text-teal-600 hover:bg-teal-50">عرض الكل</Button>
            </h3>
            <div className="space-y-3">
              {[
                'كيف يمكنني تتبع طلبي؟',
                'ما هي سياسة الاسترجاع؟',
                'هل يوجد توصيل للمحافظات؟',
                'كيف أضيف عنوان شحن جديد؟',
                'ما هي طرق الدفع المتاحة؟'
              ].map((q, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-teal-50 cursor-pointer transition-colors group">
                  <span className="text-sm text-slate-600 font-medium group-hover:text-teal-700 transition-colors">{q}</span>
                  <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-teal-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
