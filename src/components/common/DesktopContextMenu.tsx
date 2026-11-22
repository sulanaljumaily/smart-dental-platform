import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home, RotateCw, Copy, Minimize2, Power } from 'lucide-react';
import { isDesktopApp } from '../../lib/platform';

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

  const invokeDesktopCommand = async (cmd: 'hide_to_tray' | 'quit_app') => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke(cmd);
    } catch (err) {
      console.warn(`[DesktopContextMenu] Command ${cmd} failed:`, err);
      if (cmd === 'quit_app') {
        try {
          window.close();
        } catch {}
      }
    }
  };

  useEffect(() => {
    // Only activate in desktop app (Tauri/Windows)
    if (!isDesktopApp()) return;

    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection()?.toString().trim() || '';
      setSelectedText(selection);

      // In desktop app, always show our tailored premium application menu
      e.preventDefault();

      const menuWidth = 230;
      const menuHeight = selection ? 270 : 230;
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
      className="fixed z-[9999999] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-1.5 min-w-[220px] text-white select-none animate-in fade-in zoom-in-95 duration-150"
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

        <div className="my-1 border-t border-white/10" />

        {/* إغلاق النافذة مع إبقاء التطبيق يعمل في الخلفية لاستقبال الإشعارات */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            invokeDesktopCommand('hide_to_tray');
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-sky-200 hover:text-white hover:bg-sky-500/25 rounded-xl transition-all group"
          role="menuitem"
        >
          <div className="flex items-center gap-2.5">
            <Minimize2 className="w-4 h-4 text-sky-400 group-hover:text-sky-300 transition-colors" />
            <span>إغلاق (إبقاء بالخلفية)</span>
          </div>
        </button>

        {/* خروج نهائي من التطبيق والخلفية */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            invokeDesktopCommand('quit_app');
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-600/35 rounded-xl transition-all group"
          role="menuitem"
        >
          <div className="flex items-center gap-2.5">
            <Power className="w-4 h-4 text-rose-400 group-hover:text-rose-200 transition-colors" />
            <span>خروج من التطبيق</span>
          </div>
        </button>
      </div>
    </div>
  );
};
