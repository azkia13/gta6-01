// Keyboard + mouse input. Held keys steer; one-shot actions queue as flags.
export const ACTION_START = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4, ACTION_MUTE = 8;
export function createInput(canvas) {
  const keys = new Set();
  let queued = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false, wx: 0, wy: 0 };
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') queued |= ACTION_START;
    if (e.code === 'KeyP' || e.code === 'Escape') queued |= ACTION_PAUSE;
    if (e.code === 'KeyE') queued |= ACTION_ENTER;
    if (e.code === 'KeyM') queued |= ACTION_MUTE;
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
