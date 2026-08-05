// Input: keyboard (WASD/arrows + Space dash) and a dynamic touch joystick
// that appears wherever the player touches the left 60% of the screen,
// plus a dash button on the right for touch devices.

export class Controls {
  constructor() {
    this.moveX = 0;       // -1..1
    this.moveZ = 0;       // -1..1
    this.dashPressed = false;
    this._keys = new Set();
    this._joyActive = false;
    this._joyId = null;
    this._joyOrigin = { x: 0, y: 0 };
    this._joyVec = { x: 0, y: 0 };
    this.isTouch = false;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this._keys.add(e.key.toLowerCase());
      if (e.key === ' ') this.dashPressed = true;
    });
    window.addEventListener('keyup', (e) => this._keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this._keys.clear());

    this._buildTouchUI();
  }

  _buildTouchUI() {
    // Joystick visuals
    const ring = document.createElement('div');
    ring.id = 'joy-ring';
    ring.style.cssText = 'position:fixed;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.06);display:none;z-index:40;pointer-events:none;transform:translate(-50%,-50%);backdrop-filter:blur(2px);';
    const nub = document.createElement('div');
    nub.id = 'joy-nub';
    nub.style.cssText = 'position:fixed;width:52px;height:52px;border-radius:50%;background:rgba(255,210,63,0.85);box-shadow:0 2px 10px rgba(0,0,0,0.4);display:none;z-index:41;pointer-events:none;transform:translate(-50%,-50%);';
    document.body.appendChild(ring);
    document.body.appendChild(nub);
    this._ring = ring;
    this._nub = nub;

    // Dash button (shown once touch is detected)
    const dash = document.createElement('div');
    dash.id = 'dash-btn';
    dash.textContent = 'DASH';
    dash.style.cssText = 'position:fixed;right:max(18px, env(safe-area-inset-right));bottom:max(26px, env(safe-area-inset-bottom));width:76px;height:76px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #ffe27a, #f0a500);color:#3a2800;font:700 15px/76px sans-serif;text-align:center;z-index:40;display:none;box-shadow:0 4px 0 #8a5d00, 0 8px 18px rgba(0,0,0,0.5);letter-spacing:0.05em;touch-action:none;';
    document.body.appendChild(dash);
    this._dashBtn = dash;

    dash.addEventListener('touchstart', (e) => { e.preventDefault(); this.dashPressed = true; dash.style.transform = 'scale(0.92)'; }, { passive: false });
    dash.addEventListener('touchend', () => { dash.style.transform = ''; });

    const touchArea = document.body;
    touchArea.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    touchArea.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    touchArea.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
    touchArea.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
  }

  _onTouchStart(e) {
    this.isTouch = true;
    this._dashBtn.style.display = 'block';
    for (const t of e.changedTouches) {
      if (this._joyActive) continue;
      // ignore touches on UI elements (dash button, overlays with buttons)
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && (el.closest('#dash-btn') || el.closest('button') || el.closest('.overlay'))) continue;
      if (t.clientX > window.innerWidth * 0.62) continue;
      e.preventDefault();
      this._joyActive = true;
      this._joyId = t.identifier;
      this._joyOrigin = { x: t.clientX, y: t.clientY };
      this._joyVec = { x: 0, y: 0 };
      this._ring.style.display = 'block';
      this._nub.style.display = 'block';
      this._ring.style.left = t.clientX + 'px';
      this._ring.style.top = t.clientY + 'px';
      this._nub.style.left = t.clientX + 'px';
      this._nub.style.top = t.clientY + 'px';
    }
  }

  _onTouchMove(e) {
    if (!this._joyActive) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== this._joyId) continue;
      e.preventDefault();
      const dx = t.clientX - this._joyOrigin.x;
      const dy = t.clientY - this._joyOrigin.y;
      const max = 48;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, max);
      const nx = (dx / len) * cl, ny = (dy / len) * cl;
      this._joyVec = { x: nx / max, y: ny / max };
      this._nub.style.left = (this._joyOrigin.x + nx) + 'px';
      this._nub.style.top = (this._joyOrigin.y + ny) + 'px';
    }
  }

  _onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._joyId) {
        this._joyActive = false;
        this._joyId = null;
        this._joyVec = { x: 0, y: 0 };
        this._ring.style.display = 'none';
        this._nub.style.display = 'none';
      }
    }
  }

  update() {
    let x = 0, z = 0;
    const k = this._keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) z -= 1;
    if (k.has('s') || k.has('arrowdown')) z += 1;
    if (this._joyActive) { x = this._joyVec.x; z = this._joyVec.y; }
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.moveX = x;
    this.moveZ = z;
  }

  consumeDash() {
    const d = this.dashPressed;
    this.dashPressed = false;
    return d;
  }
}
