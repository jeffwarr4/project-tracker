import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../utils/api';

export function useData() {
  const [projects,  setProjects]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [activity,  setActivity]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        api.projects(),
        api.stats(),
        api.activity({ limit: 100 }),
      ]);
      setProjects(pRes.projects || []);
      setStats(sRes);
      setActivity(aRes.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Pull-to-refresh via touch
  const touchStartY = useRef(0);
  useEffect(() => {
    const onStart = e => { touchStartY.current = e.touches[0].clientY; };
    const onEnd = e => {
      if (window.scrollY > 0) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 80) { setRefreshing(true); load(true); }
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [load]);

  const refresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  return { projects, stats, activity, loading, error, refreshing, refresh };
}
