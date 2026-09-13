import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Cache in memory so all pages share the same number instantly with ZERO flicker
let cachedHotline = '122';

export const useEmergencyHotline = () => {
  const [hotline, setHotline] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('emergency_hotline');
      if (stored) return stored;
    } catch {}
    return cachedHotline;
  });

  useEffect(() => {
    let isMounted = true;

    const fetchHotline = async () => {
      try {
        const { data: settingsData } = await supabase
          .from('emergency_settings')
          .select('value')
          .eq('key', 'hotline')
          .maybeSingle();

        if (settingsData && settingsData.value?.is_active && settingsData.value?.number) {
          const num = String(settingsData.value.number);
          cachedHotline = num;
          if (isMounted) {
            setHotline(num);
          }
          try {
            localStorage.setItem('emergency_hotline', num);
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching emergency hotline:', err);
      }
    };

    fetchHotline();

    return () => {
      isMounted = false;
    };
  }, []);

  return { hotline };
};
