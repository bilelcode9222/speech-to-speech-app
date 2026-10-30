/** Share expensive dashboard reads. Authorization stays in the route, before this loader. */
export function createSnapshotLoader<T>(loader: (period: number) => Promise<T>, now = Date.now, ttlMs = 20_000) {
  const cache = new Map<number, { value: T; expires: number }>();
  const pending = new Map<number, Promise<T>>();
  return (period: number): Promise<T> => {
    const cached = cache.get(period);
    if (cached && now() < cached.expires) return Promise.resolve(cached.value);
    const existing = pending.get(period);
    if (existing) return existing;
    const request = Promise.resolve().then(() => loader(period)).then(value => {
      cache.set(period, {value, expires: now() + ttlMs});
      return value;
    }).finally(() => pending.delete(period));
    pending.set(period, request);
    return request;
  };
}
