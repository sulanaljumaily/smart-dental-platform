import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card } from '../common/Card';

interface MonthSelectorProps {
  selectedMonth: string; // Format: YYYY-MM
  onMonthChange: (month: string) => void;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedMonth, onMonthChange }) => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();

  const handlePrevYear = () => {
    onMonthChange(`${year - 1}-${monthStr}`);
  };

  const handleNextYear = () => {
    onMonthChange(`${year + 1}-${monthStr}`);
  };

  const handleMonthClick = (index: number) => {
    const newMonth = String(index + 1).padStart(2, '0');
    onMonthChange(`${year}-${newMonth}`);
  };

  // Scroll selected month into view on mount or when selectedMonth changes externally
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedMonth]);

  return (
    <Card className="p-4 bg-white shadow-sm border-gray-100">
      <div className="flex flex-col gap-4">
        {/* Header: Year Selector */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-indigo-900">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span className="text-lg font-bold">الفترة المالية</span>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-full px-4 py-1.5 border border-gray-100">
            <button
              onClick={handleNextYear}
              className="p-1 hover:bg-white rounded-full transition-colors text-gray-600 hover:text-indigo-600 shadow-sm"
              aria-label="السنة التالية"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold text-gray-800 w-16 text-center">{year}</span>
            <button
              onClick={handlePrevYear}
              className="p-1 hover:bg-white rounded-full transition-colors text-gray-600 hover:text-indigo-600 shadow-sm"
              aria-label="السنة السابقة"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Months Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-3 pb-2 snap-x scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {MONTH_NAMES.map((monthName, index) => {
            const monthValue = `${year}-${String(index + 1).padStart(2, '0')}`;
            const isSelected = selectedMonth === monthValue;
            const isCurrentMonth = year === currentYear && index === currentMonthIndex;

            return (
              <button
                key={monthName}
                data-selected={isSelected}
                onClick={() => handleMonthClick(index)}
                className={`
                  relative min-w-[100px] flex-shrink-0 snap-center rounded-xl p-3 text-sm font-medium transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md scale-105'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 hover:border-indigo-200'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-base">{monthName}</span>
                  {isCurrentMonth && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                      الحالي
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
