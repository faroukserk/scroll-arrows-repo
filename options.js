const DEFAULTS = {
  opacity: 0.6,
  size: 48,
  length: 100,
  speed: 28,
  side: "right",
  mode: "hover",
  interaction: "hover",
  accent: "#7cf5ff",
  glow: true,
  electric: false
};

const ids = ["opacity", "size", "length", "speed", "side", "mode", "interaction", "accent", "glow", "electric"];
const $ = (id) => document.getElementById(id);
const status = $("status");
let statusTimer = null;

const showSaved = () => {
  status.classList.add("show");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove("show"), 900);
};

const updateLabels = () => {
  $("opacityVal").textContent = Math.round($("opacity").value * 100) + "%";
  $("sizeVal").textContent = $("size").value + "px";
  $("lengthVal").textContent = $("length").value + "%";
  const horizontal = $("side").value === "top" || $("side").value === "bottom";
  $("lengthName").textContent = horizontal ? "Width" : "Height";
  $("speedVal").textContent = $("speed").value;
};

const fillForm = (s) => {
  $("opacity").value = s.opacity;
  $("size").value = s.size;
  $("length").value = s.length;
  $("speed").value = s.speed;
  $("side").value = s.side;
  $("mode").value = s.mode;
  $("interaction").value = s.interaction;
  $("accent").value = s.accent;
  $("glow").checked = !!s.glow;
  $("electric").checked = !!s.electric;
  updateLabels();
};

const readForm = () => ({
  opacity: parseFloat($("opacity").value),
  size: parseInt($("size").value, 10),
  length: parseInt($("length").value, 10),
  speed: parseInt($("speed").value, 10),
  side: $("side").value,
  mode: $("mode").value,
  interaction: $("interaction").value,
  accent: $("accent").value,
  glow: $("glow").checked,
  electric: $("electric").checked
});

const save = (changes) => {
  chrome.storage.sync.set(changes, showSaved);
};

chrome.storage.sync.get(DEFAULTS, (stored) => fillForm(stored));

ids.forEach((id) => {
  $(id).addEventListener("input", () => {
    updateLabels();
    save({ [id]: readForm()[id] });
  });
});

$("reset").addEventListener("click", () => {
  fillForm(DEFAULTS);
  chrome.storage.sync.set(DEFAULTS, showSaved);
});
