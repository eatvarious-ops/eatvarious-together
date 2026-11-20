// Sandboxed previews and browsers with storage disabled can still explore the app.
function availableStorage(which) {
  try {
    const store = window[which];
    const test = "itda-storage-test";
    store.setItem(test, "1");
    store.removeItem(test);
    return store;
  } catch {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    };
  }
}
export const preferences = availableStorage("localStorage");
export const sessionPreferences = availableStorage("sessionStorage");
