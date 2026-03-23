import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, FileText, AlertCircle, Save } from 'lucide-react';
import { Appointment, AppointmentType, AppointmentDuration, Doctor } from '../../types/appointments';
import { Patient } from '../../types/patients';
import { appointmentTypes, doctors } from '../../data/mock/appointments';
import { PatientSearch, SelectedPatientCard } from './PatientSearch';
import { DoctorSelector } from './DoctorSelector';
import { TimeSlotSelector } from './TimeSlotSelector';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<Appointment>) => void;
  editingAppointment?: Appointment | null;
  preSelectedDate?: string;
  preSelectedTime?: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAppointment,
  preSelectedDate,
  preSelectedTime
}) => {
  // حالات النموذج
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('consultation');
  const [duration, setDuration] = useState<AppointmentDuration>(30);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  
  // حالات واجهة المستخدم
  const [currentStep, setCurrentStep] = useState<'patient' | 'doctor' | 'datetime' | 'details'>('patient');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // تهيئة النموذج عند فتحه
  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        // تحديث موعد موجود
        loadAppointmentData(editingAppointment);
        setCurrentStep('details');
      } else {
        // موعد جديد
        resetForm();
        if (preSelectedDate) {
          setSelectedDate(preSelectedDate);
          setCurrentStep('patient');
        }
        if (preSelectedTime) {
          setSelectedTime(preSelectedTime);
        }
      }
    }
  }, [isOpen, editingAppointment, preSelectedDate, preSelectedTime]);

  // تحديث المدة الافتراضية عند تغيير نوع الموعد
  useEffect(() => {
    const typeConfig = appointmentTypes.find(t => t.type === appointmentType);
    if (typeConfig) {
      setDuration(typeConfig.defaultDuration);
    }
  }, [appointmentType]);

  // تحميل بيانات الموعد للتحديث
  const loadAppointmentData = (appointment: Appointment) => {
    // البحث عن المريض والطبيب
    const patient = require('../../data/mock/patients').allPatients.find((p: Patient) => p.id === appointment.patientId);
    const doctor = doctors.find(d => d.id === appointment.doctorId);
    
    setSelectedPatient(patient || null);
    setSelectedDoctor(doctor || null);
    setSelectedDate(appointment.date);
    setSelectedTime(appointment.startTime);
    setAppointmentType(appointment.type);
    setDuration(appointment.duration);
    setPriority(appointment.priority);
    setTitle(appointment.title || '');
    setDescription(appointment.description || '');
    setNotes(appointment.notes || '');
    setEstimatedCost(appointment.estimatedCost?.toString() || '');
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedDate(preSelectedDate || '');
    setSelectedTime(preSelectedTime || '');
    setAppointmentType('consultation');
    setDuration(30);
    setPriority('normal');
    setTitle('');
    setDescription('');
    setNotes('');
    setEstimatedCost('');
    setCurrentStep('patient');
    setErrors({});
  };

  // التحقق من صحة البيانات
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedPatient) newErrors.patient = 'يجب اختيار المريض';
    if (!selectedDoctor) newErrors.doctor = 'يجب اختيار الطبيب';
    if (!selectedDate) newErrors.date = 'يجب اختيار التاريخ';
    if (!selectedTime) newErrors.time = 'يجب اختيار الوقت';
    if (!appointmentType) newErrors.type = 'يجب اختيار نوع الموعد';
    
    // التحقق من أن التاريخ ليس في الماضي
    if (selectedDate) {
      const appointmentDate = new Date(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        newErrors.date = 'لا يمكن حجز موعد في الماضي';
      }
    }

    // التحقق من تداخل المواعيد (للمواعيد الجديدة فقط)
    if (!editingAppointment && selectedDate && selectedTime && selectedDoctor) {
      // يتم التحقق في TimeSlotSelector
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // حفظ الموعد
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // إعداد بيانات الموعد
      const appointmentData: Partial<Appointment> = {
        id: editingAppointment?.id,
        patientId: selectedPatient!.id,
        patientName: selectedPatient!.fullName,
        patientPhone: selectedPatient!.phone,
        doctorId: selectedDoctor!.id,
        doctorName: selectedDoctor!.name,
        date: selectedDate,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, duration),
        duration,
        type: appointmentType,
        status: editingAppointment?.status || 'scheduled',
        title: title || `${appointmentTypes.find(t => t.type === appointmentType)?.label} - ${selectedPatient!.fullName}`,
        description: description || `${appointmentTypes.find(t => t.type === appointmentType)?.label} للمريض ${selectedPatient!.fullName}`,
        notes,
        priority,
        estimatedCost: estimatedCost ? parseInt(estimatedCost) : undefined,
        createdAt: editingAppointment?.createdAt || new Date().toISOString(),
        createdBy: editingAppointment?.createdBy || 'CURRENT_USER',
        updatedAt: editingAppointment ? new Date().toISOString() : undefined,
        updatedBy: editingAppointment ? 'CURRENT_USER' : undefined
      };

      // محاكاة حفظ البيانات
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave(appointmentData);
      onClose();
    } catch (error) {
      console.error('خطأ في حفظ الموعد:', error);
      setErrors({ general: 'حدث خطأ أثناء حفظ الموعد' });
    } finally {
      setIsLoading(false);
    }
  };

  // حساب وقت الانتهاء
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + duration);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // الانتقال للخطوة التالية
  const handleNext = () => {
    const steps = ['patient', 'doctor', 'datetime', 'details'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1] as any);
    }
  };

  // العودة للخطوة السابقة
  const handlePrevious = () => {
    const steps = ['patient', 'doctor', 'datetime', 'details'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1] as any);
    }
  };

  // التحقق من إمكانية المتابعة للخطوة التالية
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'patient':
        return !!selectedPatient;
      case 'doctor':
        return !!selectedDoctor;
      case 'datetime':
        return !!selectedDate && !!selectedTime;
      case 'details':
        return !!appointmentType;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* الخلفية المعتمة */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      
      {/* المحتوى */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
          {/* الرأس */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAppointment ? 'تعديل الموعد' : 'حجز موعد جديد'}
              </h2>
              <p className="text-gray-600 mt-1">
                {currentStep === 'patient' && 'اختيار المريض'}
                {currentStep === 'doctor' && 'اختيار الطبيب'}
                {currentStep === 'datetime' && 'اختيار التاريخ والوقت'}
                {currentStep === 'details' && 'تفاصيل الموعد'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* شريط التقدم */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              {[
                { step: 'patient', label: 'المريض', icon: User },
                { step: 'doctor', label: 'الطبيب', icon: Stethoscope },
                { step: 'datetime', label: 'التاريخ والوقت', icon: Calendar },
                { step: 'details', label: 'التفاصيل', icon: FileText }
              ].map(({ step, label, icon: Icon }, index) => {
                const isActive = currentStep === step;
                const isCompleted = ['patient', 'doctor', 'datetime', 'details'].indexOf(currentStep) > index;
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${isActive ? 'bg-purple-600 text-white' : 
                        isCompleted ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}
                    `}>
                      {isCompleted ? '✓' : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs mr-2 ${isActive ? 'text-purple-600 font-medium' : 'text-gray-600'}`}>
                      {label}
                    </span>
                    {index < 3 && (
                      <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* المحتوى */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* رسائل الأخطاء العامة */}
            {errors.general && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.general}</span>
                </div>
              </div>
            )}

            {/* خطوة اختيار المريض */}
            {currentStep === 'patient' && (
              <div className="space-y-4">
                {selectedPatient ? (
                  <SelectedPatientCard 
                    patient={selectedPatient} 
                    onClear={() => setSelectedPatient(null)} 
                  />
                ) : (
                  <PatientSearch 
                    onSelectPatient={setSelectedPatient}
                    autoFocus={true}
                  />
                )}
                
                {errors.patient && (
                  <div className="text-red-600 text-sm">{errors.patient}</div>
                )}
              </div>
            )}

            {/* خطوة اختيار الطبيب */}
            {currentStep === 'doctor' && (
              <div className="space-y-4">
                <DoctorSelector 
                  selectedDate={selectedDate}
                  selectedDoctor={selectedDoctor}
                  onSelectDoctor={setSelectedDoctor}
                  showSchedule={true}
                />
                
                {errors.doctor && (
                  <div className="text-red-600 text-sm">{errors.doctor}</div>
                )}
              </div>
            )}

            {/* خطوة اختيار التاريخ والوقت */}
            {currentStep === 'datetime' && (
              <div className="space-y-6">
                {/* اختيار التاريخ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline ml-1" />
                    تاريخ الموعد
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.date && (
                    <div className="text-red-600 text-sm mt-1">{errors.date}</div>
                  )}
                </div>

                {/* اختيار الوقت */}
                {selectedDate && selectedDoctor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline ml-1" />
                      وقت الموعد
                    </label>
                    <TimeSlotSelector
                      selectedDate={selectedDate}
                      selectedDoctor={selectedDoctor}
                      duration={duration}
                      selectedTime={selectedTime}
                      onSelectTime={setSelectedTime}
                      excludeAppointmentId={editingAppointment?.id}
                    />
                    {errors.time && (
                      <div className="text-red-600 text-sm mt-1">{errors.time}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* خطوة التفاصيل */}
            {currentStep === 'details' && (
              <div className="space-y-6">
                {/* نوع الموعد */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الموعد
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {appointmentTypes.map((type) => (
                      <button
                        key={type.type}
                        onClick={() => setAppointmentType(type.type)}
                        className={`
                          p-3 border-2 rounded-lg text-sm font-medium transition-colors
                          ${appointmentType === type.type
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                          }
                        `}
                      >
                        <div className="font-semibold">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.defaultDuration} دقيقة</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* المدة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مدة الموعد (بالدقائق)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) as AppointmentDuration)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={15}>15 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={45}>45 دقيقة</option>
                    <option value={60}>60 دقيقة</option>
                    <option value={90}>90 دقيقة</option>
                    <option value={120}>120 دقيقة</option>
                  </select>
                </div>

                {/* الأولوية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    أولوية الموعد
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'low', label: 'منخفض', color: 'green' },
                      { value: 'normal', label: 'عادي', color: 'blue' },
                      { value: 'high', label: 'مهم', color: 'orange' },
                      { value: 'urgent', label: 'عاجل', color: 'red' }
                    ].map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => setPriority(value as any)}
                        className={`
                          p-2 border-2 rounded-lg text-sm font-medium transition-colors
                          ${priority === value
                            ? `border-${color}-600 bg-${color}-50 text-${color}-700`
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* العنوان المخصص */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان الموعد (اختياري)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: استشارة أولى - تقويم الأسنان"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* الوصف */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف الموعد (اختياري)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="وصف تفصيلي للموعد..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* الملاحظات */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات الطبيب (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="ملاحظات خاصة للطبيب..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* التكلفة المتوقعة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التكلفة المتوقعة (دينار عراقي) - اختياري
                  </label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* التذييل */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-xl">
            <div className="flex justify-between">
              <div>
                {currentStep !== 'patient' && (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    السابق
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                
                {currentStep !== 'details' ? (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isLoading || !canProceed()}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingAppointment ? 'حفظ التعديلات' : 'حجز الموعد'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};