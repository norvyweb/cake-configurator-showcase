// One live material per variant, so switching back to a variant reuses its compiled program.
// Least recently used variants are disposed once the pool is over capacity.
export class MaterialPool {
  constructor({ create, capacity = 32 }) {
    if (typeof create !== "function") throw new TypeError("create(key) is required");
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
    this.create = create;
    this.capacity = capacity;
    this.entries = new Map(); // Map keeps insertion order, used here as recency order
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  acquire(key) {
    const found = this.entries.get(key);
    if (found) {
      this.stats.hits++;
      this.entries.delete(key);
      this.entries.set(key, found);
      return found;
    }
    this.stats.misses++;
    const material = this.create(key);
    this.entries.set(key, material);
    this.evictOverflow();
    return material;
  }

  has(key) {
    return this.entries.has(key);
  }

  get size() {
    return this.entries.size;
  }

  evictOverflow() {
    while (this.entries.size > this.capacity) {
      const [oldestKey, oldest] = this.entries.entries().next().value;
      this.entries.delete(oldestKey);
      oldest.dispose();
      this.stats.evictions++;
    }
  }

  clear() {
    for (const material of this.entries.values()) material.dispose();
    this.entries.clear();
  }
}
