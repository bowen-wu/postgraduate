import { StorageRepo } from './storage-repo.js';

export const StateRepo = {
  getByKey(key) {
    return StorageRepo.getItem(key);
  },

  setByKey(key, value) {
    StorageRepo.setItem(key, value);
  },

  setJsonByKey(key, value) {
    StorageRepo.setJson(key, value);
  },

  keys() {
    return StorageRepo.keys();
  },

  removeByKey(key) {
    StorageRepo.removeItem(key);
  }
};
