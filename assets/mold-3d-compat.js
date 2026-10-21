(() => {
  'use strict';
  const canvas = document.getElementById('mold3d-canvas');
  if (!canvas) return;
  ['pointerdown','pointermove','pointerup','pointercancel','wheel'].forEach(type => {
    canvas.addEventListener(type, event => event.stopPropagation(), true);
  });
  ['rotate-left','rotate-auto','rotate-right','rotate-reset'].forEach(id => {
    const button = document.getElementById(id);
    if (!button || !button.parentNode) return;
    const clean = button.cloneNode(true);
    button.parentNode.replaceChild(clean, button);
  });
})();
