import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
        {/* Header: Title + Segment Filter (الكل / كامل السنة) + Year Navigator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">تصفية حسب:</span>
            </div>

            {/* Segment Controls: الكل / كامل السنة */}
            <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onPeriodChange('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isAllSelected
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌐 الكل (شامل)
              </button>

              <button
                type="button"
                onClick={() => onPeriodChange(`year-${activeYear}`)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isYearSelected
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📆 سنة {activeYear}
              </button>
            </div>
          </div>

          {/* Year Controls */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1 border border-gray-100 self-end sm:self-auto">
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

        {/* Scrollable Row: 12 Months */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-1.5 pt-0.5 snap-x scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* 12 Month Cards - Styled with Blue / Indigo Theme */}
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
