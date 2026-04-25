import { useCallback, useEffect, useState } from 'react';
import type { Pack } from '../game/types';
import { loadPackFromFile, loadPackFromManifest, mergePacks, PackError } from '../game/pack';

const DEFAULT_MANIFEST = import.meta.env.BASE_URL + 'config/pack.json';

export interface PackState {
  pack: Pack | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  importFile: (file: File) => Promise<void>;
}

export function usePack(): PackState {
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    const manifest = params.get('pack') ?? DEFAULT_MANIFEST;
    loadPackFromManifest(manifest)
      .then((p) => {
        if (!cancelled) {
          setPack(p);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof PackError ? e.message : (e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const importFile = useCallback(
    async (file: File) => {
      try {
        const overlay = await loadPackFromFile(file);
        setPack((cur) => (cur ? mergePacks(cur, overlay) : cur));
      } catch (e) {
        setError(e instanceof PackError ? e.message : (e as Error).message);
      }
    },
    []
  );

  return { pack, error, loading, reload, importFile };
}
