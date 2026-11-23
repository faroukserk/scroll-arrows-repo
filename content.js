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
    electric: false        // flickering electric effect
  };
  const DEAD_ZONE = 0.08; // fraction of half the track treated as neutral
  let settings = { ...DEFAULTS };

  const el = (tag, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };

  const isHorizontal = () => settings.side === "top" || settings.side === "bottom";

  // ---------- Finding the element that actually scrolls ----------
  // Many sites (Discord, Slack, Gmail, etc.) scroll an inner panel,
  // not the window, so we find the scrollable element under the screen center.
  const canScroll = (node, horiz) => {
    if (!(node instanceof Element)) return false;
    const cs = getComputedStyle(node);
    const ov = horiz ? cs.overflowX : cs.overflowY;
    if (!/(auto|scroll|overlay)/.test(ov)) return false;
    return horiz
      ? node.scrollWidth > node.clientWidth + 1
      : node.scrollHeight > node.clientHeight + 1;
  };

  const findScroller = (horiz) => {
    const stack = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    for (const node of stack) {
      if (node.id === "scroll-gear") continue;
      if (canScroll(node, horiz)) return node;
    }
    return document.scrollingElement || document.documentElement;
  };

  // Cache the target briefly so we don't search on every animation frame
  let cachedTarget = null;
  let cachedAt = 0;
  let cachedHoriz = null;
  const getScroller = (horiz) => {
    const now = performance.now();
    if (
      !cachedTarget ||
      !cachedTarget.isConnected ||
      cachedHoriz !== horiz ||
      now - cachedAt > 300
    ) {
      cachedTarget = findScroller(horiz);
      cachedAt = now;
      cachedHoriz = horiz;
    }
    return cachedTarget;
  };

  const getPos = (s, horiz) => (horiz ? s.scrollLeft : s.scrollTop);
  const setPos = (s, horiz, v) => {
    if (horiz) s.scrollLeft = v;
    else s.scrollTop = v;
  };
  const addPos = (s, horiz, amount) => setPos(s, horiz, getPos(s, horiz) + amount);
  const getMax = (s, horiz) =>
    horiz ? s.scrollWidth - s.clientWidth : s.scrollHeight - s.clientHeight;
  const getSize = (s, horiz) => (horiz ? s.clientWidth : s.clientHeight);

  // ---------- Smooth glide to a target position ----------
  let glideId = null;
  const glideTo = (target, horiz, duration = 500) => {
    cancelAnimationFrame(glideId);
    const s = getScroller(horiz);
    const start = getPos(s, horiz);
    const distance = target - start;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const frame = (now) => {
      const t = Math.min((now - t0) / duration, 1);
      setPos(s, horiz, start + distance * ease(t));
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
      const s = getScroller(horiz);
      glideTo(getPos(s, horiz) + direction * getSize(s, horiz) * 0.4, horiz);
      holdTimer = setTimeout(() => {
        cancelAnimationFrame(glideId);
        const step = () => {
          addPos(getScroller(horiz), horiz, direction * 10);
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
    gear.style.setProperty("--sg-accent", settings.accent);

    POSITIONS.forEach((p) => gear.classList.remove(p));
    gear.classList.add("pos-" + settings.side);
    gear.classList.toggle("partial", Number(settings.length) < 100);
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

  // ---------- Hide during full screen (videos, games, presentations) ----------
  const updateFullscreenState = () => {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    // Browser full screen (F11) also fills the whole screen, so treat it the same way
    const browserFull =
      Math.abs(window.screen.height - window.innerHeight) < 2 &&
      Math.abs(window.screen.width - window.innerWidth) < 2;
    gear.classList.toggle("in-fullscreen", !!fs || browserFull);
  };
  document.addEventListener("fullscreenchange", updateFullscreenState);
  document.addEventListener("webkitfullscreenchange", updateFullscreenState);
  window.addEventListener("resize", updateFullscreenState);
  updateFullscreenState();

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

  // Click-to-navigate: jump to the part of the content the track position points to
  const navigateTo = (e) => {
    const horiz = isHorizontal();
    const { rel, len } = placeKnob(e);
    const fraction = len > 0 ? rel / len : 0;
    const s = getScroller(horiz);
    glideTo(fraction * getMax(s, horiz), horiz, 600);
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
    getScroller(isHorizontal()); // pick the scrolling element for this gesture

    if (settings.interaction === "click") {
      speedFactor = 0;
      navigateTo(e);
    } else {
      updateFromPointer(e, true);
    }
  });

  track.addEventListener("pointermove", (e) => {
    if (dragging || e.pointerType === "mouse") {
      track.classList.add("active");
      const mode = settings.interaction;
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
    if (speedFactor !== 0) {
      const horiz = isHorizontal();
      addPos(getScroller(horiz), horiz, speedFactor * settings.speed);
    }
    requestAnimationFrame(loop);
  };
  loop();
})();
