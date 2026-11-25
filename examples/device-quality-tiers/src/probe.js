// Any of these can be missing: some browsers hide the GPU name, deviceMemory is Chromium only.
export function readSignals() {
  const signals = {
    devicePixelRatio: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    saveData: navigator.connection?.saveData ?? false,
  };

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (gl) {
    signals.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    signals.renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return signals;
}
