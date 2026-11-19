// Keyboard + mouse input. Held keys steer; one-shot actions queue as flags.
// G opens the garage shop when Rico is standing by the garage (700,500).
// Space (punch) and C (continue) latch as one-shot actions so a quick tap is
// never lost between frames — held-key sampling alone can miss a short press.
export const ACTION_START = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4, ACTION_MUTE = 8, ACTION_GARAGE = 16, ACTION_PUNCH = 32, ACTION_CONTINUE = 64, ACTION_LIGHTS = 128, ACTION_BUSINESS = 256;
export function createInput(canvas) {
  const keys = new Set();
  let queued = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false, wx: 0, wy: 0 };
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') queued |= ACTION_START;
    if (e.code === 'Space') queued |= ACTION_PUNCH;
    if (e.code === 'KeyC') queued |= ACTION_CONTINUE;
    if (e.code === 'KeyP' || e.code === 'Escape') queued |= ACTION_PAUSE;
    if (e.code === 'KeyE') queued |= ACTION_ENTER;
    if (e.code === 'KeyM') queued |= ACTION_MUTE;
    if (e.code === 'KeyG') queued |= ACTION_GARAGE;
    if (e.code === 'KeyH') queued |= ACTION_LIGHTS; // H toggles the headlights
    if (e.code === 'KeyB') queued |= ACTION_BUSINESS; // B opens the empire panel
  };
  const up = (e) => keys.delete(e.code);
  const move = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  };
  const press = (e) => { move(e); mouse.down = true; mouse.clicked = true; };
  const release = () => { mouse.down = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', press);
  window.addEventListener('mouseup', release);
  window.addEventListener('blur', () => keys.clear());
  return {
    keys, mouse,
    axis() {
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    takeActions() { const a = queued; queued = 0; return a; },
    takeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
  };
}
