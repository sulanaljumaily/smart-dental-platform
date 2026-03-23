import React from 'react';
import { Stethoscope, Clock, Calendar, CheckCircle } from 'lucide-react';
import { Doctor } from '../../types/appointments';
import { doctors } from '../../data/mock/appointments';

interface DoctorSelectorProps {
  selectedDate?: string;
  selectedDoctor?: Doctor;
  onSelectDoctor: (doctor: Doctor) => void;
  showSchedule?: boolean;
}

export const DoctorSelector: React.FC<DoctorSelectorProps> = ({
  selectedDate,
  selectedDoctor,
  onSelectDoctor,
  showSchedule = true
}) => {
  
  // تحديد ما إذا كان الطبيب متوفراً في التاريخ المحدد
  const isDoctorAvailable = (doctor: Doctor, date?: string): boolean => {
    if (!date || !doctor.schedule) return true;
    
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = doctor.schedule[dayName];
    
    return daySchedule?.isWorking || false;
  };

  // تحويل أسماء الأيام
  const getDayNameArabic = (dayName: string): string => {
    const dayNames = {
      sunday: 'الأحد',
      monday: 'الاثنين', 
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
      saturday: 'السبت'
    };
    return dayNames[dayName as keyof typeof dayNames] || dayName;
  };

  // تحويل التخصص
  const getSpecialtyColor = (specialty: string): string => {
    if (specialty.includes('عام')) return 'bg-blue-100 text-blue-800';
    if (specialty.includes('تقويم')) return 'bg-purple-100 text-purple-800';
    if (specialty.includes('جراحة')) return 'bg-red-100 text-red-800';
    if (specialty.includes('عصب')) return 'bg-green-100 text-green-800';
    if (specialty.includes('طوارئ')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* العنوان */}
      <div className="flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">اختيار الطبيب</h3>
        {selectedDate && (
          <span className="text-sm text-gray-500">
            ليوم {new Date(selectedDate).toLocaleDateString('ar-EG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        )}
      </div>

      {/* قائمة الأطباء */}
      <div className="space-y-3">
        {doctors.map((doctor) => {
          const isAvailable = isDoctorAvailable(doctor, selectedDate);
          const isSelected = selectedDoctor?.id === doctor.id;

          return (
            <div
              key={doctor.id}
              onClick={() => isAvailable && onSelectDoctor(doctor)}
              className={`
                relative p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer
                ${!isAvailable 
                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'bg-purple-50 border-purple-600 shadow-lg'
                  : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }
              `}
            >
              {/* شارة الاختيار */}
              {isSelected && (
                <div className="absolute top-3 left-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* معلومات الطبيب */}
              <div className="flex items-start gap-4">
                {/* الصورة الرمزية */}
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {doctor.name.split(' ')[1]?.charAt(0) || doctor.name.charAt(0)}
                </div>

                {/* التفاصيل */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{doctor.name}</h4>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getSpecialtyColor(doctor.specialty)}`}>
                        {doctor.specialty}
                      </span>
                    </div>

                    {/* حالة التوفر */}
                    <div className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    `}>
                      {isAvailable ? 'متوفر' : 'غير متوفر'}
                    </div>
                  </div>

                  {/* معلومات الاتصال */}
                  {doctor.phone && (
                    <div className="text-sm text-gray-600 mb-2">
                      📞 {doctor.phone}
                    </div>
                  )}

                  {/* جدول العمل */}
                  {showSchedule && doctor.schedule && selectedDate && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-3">
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        جدول العمل لهذا اليوم:
                      </h5>
                      
                      {(() => {
                        const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                        const daySchedule = doctor.schedule[dayName];
                        
                        if (!daySchedule?.isWorking) {
                          return (
                            <div className="text-sm text-red-600">
                              🔴 يوم راحة
                            </div>
                          );
                        }

                        return (
                          <div className="text-sm text-gray-700 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span>من {daySchedule.startTime} إلى {daySchedule.endTime}</span>
                            </div>
                            {daySchedule.breakStart && daySchedule.breakEnd && (
                              <div className="flex items-center gap-2 text-orange-600">
                                <Clock className="w-3 h-3" />
                                <span>استراحة: {daySchedule.breakStart} - {daySchedule.breakEnd}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* جدول العمل الأسبوعي */}
                  {showSchedule && doctor.schedule && !selectedDate && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-3">
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        جدول العمل الأسبوعي:
                      </h5>
                      
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        {Object.entries(doctor.schedule).map(([day, schedule]) => (
                          <div key={day} className="flex items-center justify-between">
                            <span className="font-medium">{getDayNameArabic(day)}:</span>
                            <span className={schedule.isWorking ? 'text-green-600' : 'text-red-600'}>
                              {schedule.isWorking 
                                ? `${schedule.startTime} - ${schedule.endTime}`
                                : 'راحة'
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ملاحظة */}
      {selectedDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-700">
            💡 <strong>ملاحظة:</strong> يتم عرض الأطباء المتوفرين فقط في التاريخ المحدد
          </div>
        </div>
      )}

      {/* إحصائيات سريعة */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">إحصائيات الأطباء</h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">{doctors.filter(d => d.isActive).length}</div>
            <div className="text-sm text-gray-600">أطباء نشطين</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {selectedDate ? doctors.filter(d => isDoctorAvailable(d, selectedDate)).length : doctors.length}
            </div>
            <div className="text-sm text-gray-600">متوفرين {selectedDate ? 'اليوم' : 'عموماً'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};