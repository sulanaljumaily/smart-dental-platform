import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Layers, Clock } from 'lucide-react';
import { Card } from '../common/Card';

interface MonthSelectorProps {
  selectedPeriod: string; // Format: 'all' | 'year-YYYY' | 'YYYY-MM'
  onPeriodChange: (period: string) => void;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedPeriod, onPeriodChange }) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();

  // Determine active year from selectedPeriod or current year
  let activeYear = currentYear;
  if (selectedPeriod.startsWith('year-')) {
    activeYear = parseInt(selectedPeriod.replace('year-', ''), 10) || currentYear;
  } else if (selectedPeriod.includes('-') && selectedPeriod !== 'all') {
    activeYear = parseInt(selectedPeriod.split('-')[0], 10) || currentYear;
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePrevYear = () => {
    const nextYear = activeYear - 1;
    if (selectedPeriod.startsWith('year-')) {
      onPeriodChange(`year-${nextYear}`);
    } else if (selectedPeriod.includes('-') && selectedPeriod !== 'all') {
      const monthPart = selectedPeriod.split('-')[1];
      onPeriodChange(`${nextYear}-${monthPart}`);
    } else {
      onPeriodChange(`year-${nextYear}`);
    }
  };

  const handleNextYear = () => {
    const nextYear = activeYear + 1;
    if (selectedPeriod.startsWith('year-')) {
      onPeriodChange(`year-${nextYear}`);
    } else if (selectedPeriod.includes('-') && selectedPeriod !== 'all') {
      const monthPart = selectedPeriod.split('-')[1];
      onPeriodChange(`${nextYear}-${monthPart}`);
    } else {
      onPeriodChange(`year-${nextYear}`);
    }
  };

  const handleMonthClick = (index: number) => {
    const newMonth = String(index + 1).padStart(2, '0');
    onPeriodChange(`${activeYear}-${newMonth}`);
  };

  // Scroll selected button into view
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedPeriod]);

  const isAllSelected = selectedPeriod === 'all';
  const isYearSelected = selectedPeriod === `year-${activeYear}`;

  return (
    <Card className="p-3 sm:p-4 bg-white shadow-sm border-gray-100/80 rounded-2xl">
      <div className="flex flex-col gap-3">
        {/* Header: Title + Year Navigator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-gray-800">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-gray-900">تصفية الفترة المالية</span>
              <span className="text-xs text-gray-400 block sm:inline sm:mr-2">
                {isAllSelected
                  ? '(كل الأوقات)'
                  : isYearSelected
                  ? `(كامل سنة ${activeYear})`
                  : `(شهر ${MONTH_NAMES[parseInt(selectedPeriod.split('-')[1], 10) - 1] || ''} ${activeYear})`}
              </span>
            </div>
          </div>

          {/* Year Controls */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1 border border-gray-100">
            <button
              onClick={handleNextYear}
              className="p-1 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-blue-600 hover:shadow-xs cursor-pointer"
              title="السنة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm sm:text-base font-bold text-gray-800 w-12 text-center font-mono">
              {activeYear}
            </span>
            <button
              onClick={handlePrevYear}
              className="p-1 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-blue-600 hover:shadow-xs cursor-pointer"
              title="السنة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Row: [الكل] + [السنة] + [12 Months] */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-1.5 pt-0.5 snap-x scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* 1. All Time Button */}
          <button
            data-selected={isAllSelected}
            onClick={() => onPeriodChange('all')}
            className={`
              relative min-w-[85px] sm:min-w-[95px] flex-shrink-0 snap-center rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer
              ${isAllSelected
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-100 scale-102 border-transparent'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100/80 border border-gray-200/70 hover:border-blue-200'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>الكل</span>
              </div>
              <span className={`text-[10px] font-normal ${isAllSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                كل الوقت
              </span>
            </div>
          </button>

          {/* 2. Current / Selected Year Button */}
          <button
            data-selected={isYearSelected}
            onClick={() => onPeriodChange(`year-${activeYear}`)}
            className={`
              relative min-w-[90px] sm:min-w-[100px] flex-shrink-0 snap-center rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer
              ${isYearSelected
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-100 scale-102 border-transparent'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100/80 border border-gray-200/70 hover:border-blue-200'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>سنة {activeYear}</span>
              </div>
              <span className={`text-[10px] font-normal ${isYearSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                كامل السنة
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="w-[1px] bg-gray-200 my-1 flex-shrink-0" />

          {/* 3. 12 Month Cards - Styled with Blue / Indigo Theme */}
          {MONTH_NAMES.map((monthName, index) => {
            const monthNumberStr = String(index + 1).padStart(2, '0');
            const monthValue = `${activeYear}-${monthNumberStr}`;
            const isSelected = selectedPeriod === monthValue;
            const isCurrentMonth = activeYear === currentYear && index === currentMonthIndex;

            return (
              <button
                key={monthValue}
                data-selected={isSelected}
                onClick={() => handleMonthClick(index)}
                className={`
                  relative min-w-[85px] sm:min-w-[95px] flex-shrink-0 snap-center rounded-xl p-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white shadow-md shadow-blue-200 scale-102 border-transparent'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100/80 border border-gray-200/70 hover:border-blue-200'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="truncate">{monthName}</span>
                  {isCurrentMonth ? (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      الحالي
                    </span>
                  ) : (
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                      {monthNumberStr}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
