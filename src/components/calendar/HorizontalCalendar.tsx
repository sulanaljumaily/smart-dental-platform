import React, { useRef, useMemo } from 'react';
import { addDays, format, isSameDay, startOfWeek, subDays, differenceInDays, parseISO, isAfter } from 'date-fns';
import { arMA } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Zap } from 'lucide-react';

interface HorizontalCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    appointments?: any[];
}

export const HorizontalCalendar: React.FC<HorizontalCalendarProps> = ({
    selectedDate,
    onDateSelect,
    appointments = []
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Create an array of 30 days starting from 2 days ago
    const days = Array.from({ length: 30 }, (_, i) => addDays(subDays(new Date(), 2), i));

    const nextAppointment = React.useMemo(() => {
        if (!appointments || appointments.length === 0) return null;

        const upcoming = appointments
            .map(apt => ({ ...apt, dateObj: parseISO(apt.date || apt.appointment_date) }))
            .filter(apt => isAfter(apt.dateObj, subDays(new Date(), 1))) // Show today and future
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        return upcoming[0] || null;
    }, [appointments]);

    const getUrgencyStyles = () => {
        if (!nextAppointment) return 'bg-gray-100 text-gray-500 border-gray-200';

        const diff = differenceInDays(nextAppointment.dateObj, new Date());
        if (diff < 1) return 'bg-rose-600 text-white shadow-rose-100 animate-bounce';
        if (diff <= 2) return 'bg-amber-500 text-white shadow-amber-100';
        return 'bg-blue-600 text-white shadow-blue-100';
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <span className="text-blue-600">{format(selectedDate, 'M')}</span>
                        <span className="text-gray-300">/</span>
                        <span>{format(selectedDate, 'yyyy')}</span>
                    </h3>

                    {appointments.length > 0 && (
                        <button
                            onClick={() => nextAppointment && onDateSelect(nextAppointment.dateObj)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg border-0 ${getUrgencyStyles()}`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            {appointments.length} مواعيد
                            {nextAppointment && (
                                <Zap className="w-3 h-3 fill-current" />
                            )}
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('right')}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('left')}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto py-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {days.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const dayAppointments = appointments.filter(apt =>
                        isSameDay(parseISO(apt.date || apt.appointment_date), date)
                    );
                    const hasAppointment = dayAppointments.length > 0;

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => onDateSelect(date)}
                            className={`flex-shrink-0 w-16 h-20 flex flex-col items-center justify-center rounded-[1.5rem] transition-all relative ${isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105'
                                : 'bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50'
                                }`}
                        >
                            <span className={`text-[10px] font-bold mb-0.5 ${isSelected ? 'text-blue-50' : 'text-gray-400'}`}>
                                {format(date, 'EEE', { locale: arMA })}
                            </span>
                            <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {format(date, 'd')}
                            </span>

                            {hasAppointment && (
                                <span className={`text-[8px] font-black mt-0.5 uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-amber-500'}`}>
                                    موعد
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
