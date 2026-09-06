import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home, RotateCw, Copy, ExternalLink } from 'lucide-react';

interface MenuPosition {
  x: number;
  y: number;
}

export const DesktopContextMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow native behavior on text input / textarea if user is typing
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const selection = window.getSelection()?.toString().trim() || '';
      setSelectedText(selection);

      // On desktop / web, always show our tailored premium application menu
      e.preventDefault();

      const menuWidth = 210;
      const menuHeight = selection ? 180 : 140;
      let x = e.clientX;
      let y = e.clientY;

      // Keep within window boundaries
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      setPosition({ x: Math.max(10, x), y: Math.max(10, y) });
      setIsOpen(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      dir="rtl"
      className="fixed z-[9999999] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-1.5 min-w-[200px] text-white select-none animate-in fade-in zoom-in-95 duration-150"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      role="menu"
    >
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            window.history.back();
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-blue-600/30 rounded-xl transition-all group"
          role="menuitem"
        >
          <div className="flex items-center gap-2.5">
            <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span>رجوع للخلف</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Alt+←</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            navigate('/');
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-blue-600/30 rounded-xl transition-all group"
          role="menuitem"
        >
          <div className="flex items-center gap-2.5">
            <Home className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <span>الصفحة الرئيسية</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            window.location.reload();
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-blue-600/30 rounded-xl transition-all group"
          role="menuitem"
        >
          <div className="flex items-center gap-2.5">
            <RotateCw className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span>تحديث المنظومة</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">F5</span>
        </button>

        {selectedText && (
          <>
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigator.clipboard?.writeText(selectedText);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 rounded-xl transition-all"
              role="menuitem"
            >
              <Copy className="w-4 h-4" />
              <span>نسخ النص المحدد</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
