// Counts gl.linkProgram calls. Unlike timings, the count is the same on any machine.
export function countLinks(gl) {
  const original = gl.linkProgram;
  let count = 0;
  gl.linkProgram = function (program) {
    count++;
    return original.call(this, program);
  };
  return {
    read: () => count,
    reset: () => {
      count = 0;
    },
    restore: () => {
      gl.linkProgram = original;
    },
  };
}
