// Lowers the pixel ratio when frames run over budget and raises it again when there is room.
// The cooldown after each change keeps it from bouncing between two values.
export function createResolutionGovernor({ min, max, start = max, step = 0.25, budgetMs = 1000 / 60, window = 30, cooldown = 60 }) {
  if (!(min > 0 && max >= min)) throw new RangeError("need 0 < min <= max");
  let ratio = clamp(start, min, max);
  let samples = [];
  let wait = 0;

  function frame(ms) {
    if (wait > 0) {
      wait--;
      return ratio;
    }
    samples.push(ms);
    if (samples.length < window) return ratio;

    const average = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples = [];
    let next = ratio;
    if (average > budgetMs * 1.15) next -= step;
    else if (average < budgetMs * 0.7) next += step;
    next = clamp(Math.round(next * 100) / 100, min, max);

    if (next !== ratio) {
      ratio = next;
      wait = cooldown;
    }
    return ratio;
  }

  return {
    frame,
    get pixelRatio() {
      return ratio;
    },
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
