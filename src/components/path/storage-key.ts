/** Where this device keeps one exam's path progress (shared by server and client code). */
export const pathStorageKey = (cert: string) => `cb_path_${cert}`;
