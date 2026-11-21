// localStorage for conveniences only. Reads return the fallback and writes do nothing if storage throws.
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The page keeps working from memory.
    }
  },
};
