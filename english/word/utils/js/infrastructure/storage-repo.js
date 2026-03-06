export const StorageRepo = {
  getItem(key) {
    return localStorage.getItem(key);
  },

  setItem(key, value) {
    localStorage.setItem(key, value);
  },

  removeItem(key) {
    localStorage.removeItem(key);
  },

  getJson(key) {
    const raw = this.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  },

  setJson(key, value) {
    this.setItem(key, JSON.stringify(value));
  },

  keys() {
    return Object.keys(localStorage);
  },

  removeByPrefix(prefix) {
    this.keys().forEach((key) => {
      if (key.startsWith(prefix)) {
        this.removeItem(key);
      }
    });
  }
};
