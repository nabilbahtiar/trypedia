declare global {
  var _productStockLocks:
    | Record<string, { lockedAt: number; expiresAt: number; lockedBy?: string }>
    | undefined;
}

function getLockMap() {
  if (!global._productStockLocks) {
    global._productStockLocks = {};
  }
  return global._productStockLocks;
}

export function getActiveProductLock(productId: string) {
  const map = getLockMap();
  const lock = map[productId];
  if (!lock) return null;

  if (Date.now() >= lock.expiresAt) {
    delete map[productId];
    return null;
  }
  return lock;
}

export function getActiveLockedProductIds(): Set<string> {
  const map = getLockMap();
  const now = Date.now();
  const active = new Set<string>();
  for (const [id, lock] of Object.entries(map)) {
    if (now < lock.expiresAt) {
      active.add(id);
    } else {
      delete map[id];
    }
  }
  return active;
}

export function lockProductInMemory(
  productId: string,
  durationSeconds: number = 600,
  lockedBy: string = "usr_001"
) {
  const map = getLockMap();
  const now = Date.now();
  const expiresAt = now + durationSeconds * 1000;
  map[productId] = { lockedAt: now, expiresAt, lockedBy };
  return { lockedAt: now, expiresAt };
}

export function releaseProductLockInMemory(productId: string) {
  const map = getLockMap();
  if (map[productId]) {
    delete map[productId];
  }
}

