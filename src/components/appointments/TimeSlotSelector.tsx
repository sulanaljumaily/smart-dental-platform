import React, { useState, useMemo } from 'react';
import { Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Doctor, DaySchedule, TimeSlot, AppointmentDuration } from '../../types/appointments';
import { doctors, mockAppointments, defaultWorkingHours } from '../../data/mock/appointments';

interface TimeSlotSelectorProps {
  selectedDate: string; // "2025-11-08"
  selectedDoctor?: Doctor;
  duration: AppointmentDuration;
  onSelectTime: (time: string) => void;
  selectedTime?: string;
  excludeAppointmentId?: string; // لاستبعاد موعد معين عند التعديل
}

export const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  selectedDate,
  selectedDoctor,
  duration,
  onSelectTime,
  selectedTime,
  excludeAppointmentId
}) => {
  const [currentView, setCurrentView] = useState<'morning' | 'evening'>('morning');

  // إنشاء شقوق الوقت للتاريخ المحدد
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const date = new Date(selectedDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // الحصول على جدول عمل الطبيب أو الجدول الافتراضي
    const schedule = selectedDoctor?.schedule?.[dayName] || {
      isWorking: true,
      startTime: defaultWorkingHours.start,
      endTime: defaultWorkingHours.end,
      breakStart: defaultWorkingHours.breakStart,
      breakEnd: defaultWorkingHours.breakEnd
    };

    if (!schedule.isWorking) {
      return [];
    }

    // الحصول على المواعيد الموجودة في هذا التاريخ
    const existingAppointments = mockAppointments.filter(apt => 
      apt.date === selectedDate && 
      (!selectedDoctor || apt.doctorId === selectedDoctor.id) &&
      apt.id !== excludeAppointmentId && // استبعاد الموعد المحدد
      ['scheduled', 'confirmed', 'inprogress'].includes(apt.status)
    );

    const slots: TimeSlot[] = [];
    const slotDuration = 30; // دقيقة
    const startTime = parseTime(schedule.startTime);
    const endTime = parseTime(schedule.endTime);
    const breakStart = schedule.breakStart ? parseTime(schedule.breakStart) : null;
    const breakEnd = schedule.breakEnd ? parseTime(schedule.breakEnd) : null;

    // إنشاء شقوق كل 30 دقيقة
    for (let time = startTime; time < endTime; time += slotDuration) {
      const timeString = formatTime(time);
      
      // تخطي أوقات الاستراحة
      if (breakStart && breakEnd && time >= breakStart && time < breakEnd) {
        continue;
      }

      // التحقق من التداخل مع المواعيد الموجودة
      const isBooked = existingAppointments.some(apt => {
        const aptStart = parseTime(apt.startTime);
        const aptEnd = parseTime(apt.endTime);
        
        // تحقق إذا كان الوقت الحالي + المدة يتداخل مع الموعد الموجود
        const slotEnd = time + duration;
        
        return (time < aptEnd && slotEnd > aptStart);
      });

      // تحقق إذا كان الوقت + المدة لا يتجاوز نهاية العمل
      const isAvailable = !isBooked && (time + duration) <= endTime;

      // إذا كان هناك استراحة، تأكد من أن الموعد لا يتداخل معها
      if (breakStart && breakEnd && isAvailable) {
        const slotEnd = time + duration;
        if (time < breakEnd && slotEnd > breakStart) {
          continue; // تخطي الوقت الذي يتداخل مع الاستراحة
        }
      }

      slots.push({
        time: timeString,
        isAvailable,
        isBooked
      });
    }

    return slots;
  }, [selectedDate, selectedDoctor, duration, excludeAppointmentId]);

  // تصفية الأوقات حسب العرض الحالي
  const filteredSlots = useMemo(() => {
    return timeSlots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      if (currentView === 'morning') {
        return hour < 14; // قبل 2 ظهراً
      } else {
        return hour >= 14; // بعد 2 ظهراً
      }
    });
  }, [timeSlots, currentView]);

  // تحويل الوقت النصي إلى دقائق
  function parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // تحويل الدقائق إلى نص
  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // تحديد ما إذا كان التاريخ في الماضي
  const isPastDate = new Date(selectedDate) < new Date(new Date().setHours(0, 0, 0, 0));
  const isToday = new Date(selectedDate).toDateString() === new Date().toDateString();

  if (isPastDate) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>لا يمكن حجز مواعيد في التواريخ الماضية</p>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2" />
        <p>لا توجد أوقات متاحة في هذا التاريخ</p>
        {selectedDoctor && (
          <p className="text-sm mt-1">الطبيب غير متوفر في هذا اليوم</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* تبويبات الوقت */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setCurrentView('morning')}
          className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
            currentView === 'morning'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          الفترة الصباحية
          <span className="block text-xs text-gray-500">08:00 - 14:00</span>
        </button>
        <button
          onClick={() => setCurrentView('evening')}
          className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${
            currentView === 'evening'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          الفترة المسائية
          <span className="block text-xs text-gray-500">14:00 - 18:00</span>
        </button>
      </div>

      {/* معلومات المدة */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-blue-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            مدة الموعد: <span className="font-semibold">{duration} دقيقة</span>
          </span>
        </div>
        {selectedDoctor && (
          <div className="text-xs text-blue-600 mt-1">
            مع {selectedDoctor.name}
          </div>
        )}
      </div>

      {/* شبكة الأوقات */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredSlots.map((slot) => (
          <button
            key={slot.time}
            onClick={() => slot.isAvailable && onSelectTime(slot.time)}
            disabled={!slot.isAvailable}
            className={`
              p-3 rounded-lg border-2 font-medium transition-all duration-200
              ${!slot.isAvailable
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : selectedTime === slot.time
                ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
              }
            `}
          >
            <div className="text-sm">{slot.time}</div>
            {slot.isBooked && (
              <div className="text-xs text-red-500 mt-1">محجوز</div>
            )}
            {slot.isAvailable && isToday && (
              <div className="text-xs text-green-600 mt-1">متاح</div>
            )}
          </button>
        ))}
      </div>

      {filteredSlots.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <p>لا توجد أوقات متاحة في هذه الفترة</p>
          <p className="text-sm mt-1">جرب الفترة الأخرى</p>
        </div>
      )}

      {/* معلومات إضافية */}
      {selectedTime && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              الوقت المحدد: <span className="font-semibold">{selectedTime}</span>
            </span>
          </div>
          <div className="text-xs text-green-600 mt-1">
            سينتهي الموعد في: {formatTime(parseTime(selectedTime) + duration)}
          </div>
        </div>
      )}

      {/* ملاحظة للمواعيد اليوم */}
      {isToday && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              تأكد من إمكانية حضور المريض في نفس اليوم
            </span>
          </div>
        </div>
      )}
    </div>
  );
};