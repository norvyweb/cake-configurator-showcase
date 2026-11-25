// Undo/redo over an immutable document. Past states are kept by reference, so unchanged
// parts are shared between steps instead of copied.
export function createHistory(initial, { limit = 100, coalesceMs = 600, isEqual = Object.is, now = Date.now } = {}) {
  let past = [];
  let present = initial;
  let future = [];
  let last = null; // { key, at } of the previous commit, for merging slider drags
  let inTransaction = false;
  const listeners = new Set();

  const emit = () => listeners.forEach((fn) => fn(present));
  const pushPast = (state) => {
    past.push(state);
    if (past.length > limit) past = past.slice(-limit);
  };

  function commit(next, { coalesce } = {}) {
    if (isEqual(next, present)) return false;
    const at = now();
    const sameDrag = coalesce && last?.key === coalesce && at - last.at <= coalesceMs;
    if (!inTransaction && !sameDrag) pushPast(present);
    present = next;
    future = [];
    last = coalesce ? { key: coalesce, at } : null;
    emit();
    return true;
  }

  function transaction(run) {
    if (inTransaction) return run();
    const before = present;
    inTransaction = true;
    try {
      run();
    } finally {
      inTransaction = false;
    }
    if (!isEqual(present, before)) pushPast(before);
    last = null;
  }

  function undo() {
    if (!past.length) return false;
    future.push(present);
    present = past.pop();
    last = null;
    emit();
    return true;
  }

  function redo() {
    if (!future.length) return false;
    past.push(present);
    present = future.pop();
    last = null;
    emit();
    return true;
  }

  function reset(state) {
    past = [];
    future = [];
    present = state;
    last = null;
    emit();
  }

  return {
    get state() {
      return present;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    get depth() {
      return { undo: past.length, redo: future.length };
    },
    commit,
    transaction,
    undo,
    redo,
    reset,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
