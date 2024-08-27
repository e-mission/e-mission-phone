import { useState } from 'react';
export default function useLeafletCache() {
  const [cachedMaps, setCachedMaps] = useState(new Map());

  return {
    has: (key: string) => cachedMaps.has(key),
    get: (key: string) => cachedMaps.get(key),
    set: (key: string, value: any) => setCachedMaps((prev) => new Map(prev.set(key, value))),
  };
}
