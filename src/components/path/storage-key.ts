/** Where this device keeps one exam's path progress (shared by server and client code). */
export const pathStorageKey = (cert: string) => `cb_path_${cert}`;

/** Set once this device has shown Pro opening one exam's path. */
export const pathUnlockedKey = (cert: string) => `cb_path_unlocked_${cert}`;
