// active -> prompt -> expired, back to active on any touch.
// No timers inside: the host calls tick() and touch(), so it is easy to test.
export function createIdleMachine({ promptAfterMs, resetAfterMs, now = Date.now, onChange = () => {} }) {
  if (!(promptAfterMs > 0 && resetAfterMs > promptAfterMs)) throw new RangeError("need 0 < promptAfterMs < resetAfterMs");
  let lastInput = now();
  let status = "active";
  let held = false;

  function set(next) {
    if (next === status) return;
    const previous = status;
    status = next;
    onChange(next, previous);
  }

  return {
    get status() {
      return status;
    },
    get secondsToReset() {
      if (held || status === "expired") return 0;
      return Math.max(0, Math.ceil((lastInput + resetAfterMs - now()) / 1000));
    },
    touch() {
      lastInput = now();
      set("active");
    },
    tick() {
      if (held) return status;
      const quiet = now() - lastInput;
      set(quiet >= resetAfterMs ? "expired" : quiet >= promptAfterMs ? "prompt" : "active");
      return status;
    },
    // e.g. while a card payment is running
    hold() {
      held = true;
      set("active");
    },
    release() {
      held = false;
      lastInput = now();
    },
  };
}

export function watchInput(machine, { target = window, intervalMs = 250 } = {}) {
  const events = ["pointerdown", "keydown", "wheel"];
  const onInput = () => machine.touch();
  events.forEach((type) => target.addEventListener(type, onInput, { passive: true }));
  const timer = setInterval(() => machine.tick(), intervalMs);
  return () => {
    clearInterval(timer);
    events.forEach((type) => target.removeEventListener(type, onInput));
  };
}
