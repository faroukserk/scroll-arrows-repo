(function () {
  if (window.top !== window) return; // only on the main page, not iframes
  if (document.getElementById("scroll-gear")) return;

  const DEFAULTS = {
    opacity: 0.6,
    size: 48,              // thickness of the bar
    length: 100,           // length of the bar, as a percent of the screen
    speed: 28,
    side: "right",         // right | left (vertical) or top | bottom (horizontal)
    mode: "hover",         // hover (hidden until hovered) | fixed (always visible)
    interaction: "hover",  // hover | click | drag
    accent: "#7cf5ff",
    glow: true,
    electric: false       // flickering electric effect
  };
  const DEAD_ZONE = 0.08; // fraction of half the track treated as neutral
  let settings = { ...DEFAULTS };

  const el = (tag, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };

  const isHorizontal = () => settings.side === "top" || settings.side === "bottom";

  const scrollAxis = (amount) => {
    if (isHorizontal()) window.scrollBy(amount, 0);
    else window.scrollBy(0, amount);
  };

  const currentPos = (horiz) => (horiz ? window.scrollX : window.scrollY);

  const maxPos = (horiz) =>
    horiz
      ? document.documentElement.scrollWidth - window.innerWidth
      : document.documentElement.scrollHeight - window.innerHeight;

  // ---------- Smooth glide to a target position ----------
  let glideId = null;
  const glideTo = (target, horiz, duration = 500) => {
    cancelAnimationFrame(glideId);
    const startX = window.scrollX;
    const startY = window.scrollY;
    const start = horiz ? startX : startY;
    const distance = target - start;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const frame = (now) => {
      const t = Math.min((now - t0) / duration, 1);
      const pos = start + distance * ease(t);
      if (horiz) window.scrollTo(pos, startY);
      else window.scrollTo(startX, pos);
      if (t < 1) glideId = requestAnimationFrame(frame);
    };
    glideId = requestAnimationFrame(frame);
  };

  // ---------- Arrow buttons ----------
  const makeArrow = (direction) => {
    const btn = el("button", "gear-arrow");

    let holdTimer = null;
    let holdId = null;
    const stop = () => {
      clearTimeout(holdTimer);
      cancelAnimationFrame(holdId);
      holdTimer = null;
      holdId = null;
    };

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      stop();
      const horiz = isHorizontal();
      const size = horiz ? window.innerWidth : window.innerHeight;
      glideTo(currentPos(horiz) + direction * size * 0.4, horiz);
      holdTimer = setTimeout(() => {
        cancelAnimationFrame(glideId);
        const step = () => {
          scrollAxis(direction * 10);
          holdId = requestAnimationFrame(step);
        };
        step();
      }, 350);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
      btn.addEventListener(ev, stop)
    );
    return btn;
  };

  // ---------- Gear structure ----------
  const gear = el("div");
  gear.id = "scroll-gear";

  const firstArrow = makeArrow(-1); // up or left
  const lastArrow = makeArrow(1);   // down or right

  const track = el("div", "gear-track");
  const neutral = el("div", "gear-neutral");
  const knob = el("div", "gear-knob");
  track.append(neutral, knob);

  gear.append(firstArrow, track, lastArrow);
  document.documentElement.appendChild(gear);

  const POSITIONS = ["pos-right", "pos-left", "pos-top", "pos-bottom"];

  // ---------- Apply settings ----------
  const applySettings = (s) => {
    settings = { ...settings, ...s };

    gear.style.setProperty("--sg-opacity", String(settings.opacity));
    gear.style.setProperty(
      "--sg-opacity-open",
      String(Math.min(1, settings.opacity + 0.35))
    );
    gear.style.setProperty("--sg-width", settings.size + "px");
    gear.style.setProperty("--sg-length-vw", settings.length + "vw");
    gear.style.setProperty("--sg-length-vh", settings.length + "vh");
    gear.classList.toggle("partial", Number(settings.length) < 100);
    gear.style.setProperty("--sg-accent", settings.accent);

    POSITIONS.forEach((p) => gear.classList.remove(p));
    gear.classList.add("pos-" + settings.side);
    gear.classList.toggle("glow", !!settings.glow);
    gear.classList.toggle("electric", !!settings.electric);
    gear.classList.toggle("fixed", settings.mode === "fixed");
    if (settings.mode === "fixed") gear.classList.add("open");
    else gear.classList.remove("open");

    if (isHorizontal()) {
      firstArrow.textContent = "◀";
      firstArrow.title = "Scroll left";
      firstArrow.setAttribute("aria-label", "Scroll left");
      lastArrow.textContent = "▶";
      lastArrow.title = "Scroll right";
      lastArrow.setAttribute("aria-label", "Scroll right");
    } else {
      firstArrow.textContent = "▲";
      firstArrow.title = "Scroll up";
      firstArrow.setAttribute("aria-label", "Scroll up");
      lastArrow.textContent = "▼";
      lastArrow.title = "Scroll down";
      lastArrow.setAttribute("aria-label", "Scroll down");
    }
  };
  applySettings(DEFAULTS);

  chrome.storage.sync.get(DEFAULTS, (stored) => applySettings(stored));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const updated = {};
    for (const key in changes) updated[key] = changes[key].newValue;
    applySettings(updated);
  });

  // ---------- Gear logic ----------
  let speedFactor = 0; // -1 (full up/left) .. 1 (full down/right)
  let dragging = false;

  // Moves the knob to the pointer and returns its position along the track
  const placeKnob = (e) => {
    const horiz = isHorizontal();
    const r = track.getBoundingClientRect();
    const len = horiz ? r.width : r.height;
    const raw = horiz ? e.clientX - r.left : e.clientY - r.top;
    const rel = Math.max(0, Math.min(len, raw));
    if (horiz) {
      knob.style.left = rel + "px";
      knob.style.top = "";
    } else {
      knob.style.top = rel + "px";
      knob.style.left = "";
    }
    return { rel, len };
  };

  // Sets scroll speed from the knob's distance to neutral (only when allowed)
  const updateFromPointer = (e, allowSpeed) => {
    const { rel, len } = placeKnob(e);
    if (!allowSpeed) {
      speedFactor = 0;
      return;
    }
    const half = len / 2;
    const off = (rel - half) / half;
    const mag = Math.abs(off);
    speedFactor =
      mag < DEAD_ZONE ? 0 : (Math.sign(off) * (mag - DEAD_ZONE)) / (1 - DEAD_ZONE);
  };

  // Click-to-navigate: jump to the part of the page the track position points to
  const navigateTo = (e) => {
    const horiz = isHorizontal();
    const { rel, len } = placeKnob(e);
    const fraction = len > 0 ? rel / len : 0;
    glideTo(fraction * maxPos(horiz), horiz, 600);
  };

  const openGear = () => gear.classList.add("open");
  const closeGear = () => {
    if (settings.mode !== "fixed") gear.classList.remove("open");
    track.classList.remove("active");
    speedFactor = 0;
  };

  gear.addEventListener("pointerenter", openGear);
  gear.addEventListener("pointerdown", openGear);
  gear.addEventListener("pointerleave", () => {
    if (!dragging) closeGear();
  });

  track.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dragging = true;
    track.setPointerCapture(e.pointerId);
    track.classList.add("active");

    if (settings.interaction === "click") {
      speedFactor = 0;
      navigateTo(e);
    } else {
      // Hover and drag modes both allow speed while the button is pressed
      updateFromPointer(e, true);
    }
  });

  track.addEventListener("pointermove", (e) => {
    if (dragging || e.pointerType === "mouse") {
      track.classList.add("active");
      const mode = settings.interaction;
      // Hover mode: speed follows the pointer. Drag mode: only while pressed.
      // Click mode: knob follows the pointer, but no scrolling.
      const allowSpeed = mode === "hover" || (mode === "drag" && dragging);
      updateFromPointer(e, allowSpeed);
    }
  });

  track.addEventListener("pointerleave", () => {
    if (!dragging) {
      track.classList.remove("active");
      speedFactor = 0;
    }
  });

  const endDrag = (e) => {
    dragging = false;
    track.classList.remove("active");
    // Hover mode keeps scrolling with a mouse that stays on the track
    if (!(settings.interaction === "hover" && e.pointerType === "mouse")) {
      speedFactor = 0;
    }
    if (e.pointerType !== "mouse" && settings.mode !== "fixed") {
      gear.classList.remove("open");
    }
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  const loop = () => {
    if (speedFactor !== 0) scrollAxis(speedFactor * settings.speed);
    requestAnimationFrame(loop);
  };
  loop();
})();
