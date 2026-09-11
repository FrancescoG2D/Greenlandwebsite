// Ogni fase (Strati, Risultato) è una sequenza di fotogrammi già
// pronti (immagini), non un video. In base allo scroll calcoliamo
// quale fotogramma mostrare e lo disegniamo su un canvas: nessun
// video da "cercare" in tempo reale, quindi nessuno scatto e nessuna
// attesa di rete. I Contatti sono una singola immagine statica.

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
}

function frameList(folder, count, digits) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push(`${folder}/frame_${pad(i, digits)}.jpg`);
  }
  return list;
}

const SCENES = [
  {
    id: "strati",
    type: "frames",
    paths: frameList("frames/strati", 42, 3),
    images: [],
  },
  {
    id: "risultato",
    type: "frames",
    paths: frameList("frames/risultato", 60, 3),
    images: [],
  },
  {
    id: "contatti",
    type: "image",
    path: "https://d8j0ntlcm91z4.cloudfront.net/user_3GaV1tebp6ZdOud63ROO5FRDuUT/hf_20260910_092124_d53b76ca-2dbd-4daf-a104-351332a73d90.png",
    images: [],
  },
];

const canvas = document.getElementById("scene-canvas");
const ctx = canvas.getContext("2d");
const wrapper = document.getElementById("scenes-wrapper");
const overlays = document.querySelectorAll(".overlay");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
}

// disegna un'immagine "a copertura" (come CSS object-fit: cover):
// riempie tutto il canvas ritagliando l'eccesso, senza deformare
function drawCover(img) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const sw = cw / scale;
  const sh = ch / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
}

// precarica tutte le immagini di una scena
function preloadScene(scene) {
  if (scene.type === "image") {
    const img = new Image();
    img.src = scene.path;
    scene.images = [img];
    return;
  }
  scene.images = scene.paths.map((p) => {
    const img = new Image();
    img.src = p;
    return img;
  });
}

SCENES.forEach(preloadScene);

function showOverlayFor(segmentId, visible) {
  overlays.forEach((overlay) => {
    const isTarget = overlay.dataset.segment === segmentId;
    overlay.classList.toggle("is-visible", isTarget && visible);
  });
}

let lastDrawnKey = "";

function updateScenes() {
  const rect = wrapper.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollableHeight = rect.height - viewportHeight;

  if (rect.top > 0 || rect.bottom < viewportHeight) {
    overlays.forEach((o) => o.classList.remove("is-visible"));
    if (rect.top > 0) return;
  }

  const overallProgress = clamp(-rect.top / scrollableHeight, 0, 1);
  const rawIndex = overallProgress * SCENES.length;
  const segmentIndex = clamp(Math.floor(rawIndex), 0, SCENES.length - 1);
  const segmentProgress = clamp(rawIndex - segmentIndex, 0, 1);

  const scene = SCENES[segmentIndex];
  const frameCount = scene.images.length;
  const frameIndex = clamp(
    Math.round(segmentProgress * (frameCount - 1)),
    0,
    frameCount - 1
  );

  const key = segmentIndex + ":" + frameIndex;
  if (key !== lastDrawnKey) {
    drawCover(scene.images[frameIndex]);
    lastDrawnKey = key;
  }

  const isLast = segmentIndex === SCENES.length - 1;
  const upperBound = isLast ? 0.98 : 0.92;
  const showOverlay = segmentProgress > 0.1 && segmentProgress < upperBound;
  showOverlayFor(scene.id, showOverlay);
}

const heroWrapper = document.getElementById("hero-wrapper");
const heroText = document.getElementById("hero-text");
const heroTransitionText = document.getElementById("hero-transition-text");
const scrollHint = document.getElementById("scroll-hint");

function updateHero() {
  const rect = heroWrapper.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  const progress = clamp(-rect.top / scrollable, 0, 1);

  heroText.style.opacity = clamp(1 - progress / 0.3, 0, 1);
  scrollHint.style.opacity = clamp(1 - progress / 0.08, 0, 1);

  const appear = clamp((progress - 0.25) / 0.3, 0, 1);
  const move = clamp((progress - 0.6) / 0.4, 0, 1);

  heroTransitionText.style.opacity = appear;
  heroTransitionText.style.top = 46 + move * 34 + "vh";
  const scale = 1 + appear * 0.05 - move * 0.25;
  heroTransitionText.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

let isProgrammaticScroll = false;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateScrollTo(targetY, duration, onDone) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();
  isProgrammaticScroll = true;

  function step(now) {
    const t = clamp((now - startTime) / duration, 0, 1);
    window.scrollTo(0, startY + diff * easeInOutQuad(t));
    if (t < 1) {
      window.requestAnimationFrame(step);
    } else {
      isProgrammaticScroll = false;
      if (onDone) onDone();
    }
  }
  window.requestAnimationFrame(step);
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (isProgrammaticScroll) return;
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateHero();
      updateScenes();
      ticking = false;
    });
    ticking = true;
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  updateHero();
  updateScenes();
});

window.addEventListener("load", () => {
  resizeCanvas();
  updateHero();
  updateScenes();
});

// disegna subito il primo fotogramma appena l'immagine è pronta,
// senza aspettare il primo scroll
SCENES[0].images[0].addEventListener("load", () => {
  resizeCanvas();
  updateScenes();
});
resizeCanvas();

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.dataset.target;
    const segmentIndex = SCENES.findIndex((s) => s.id === targetId);
    if (segmentIndex === -1) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperTop = wrapperRect.top + window.scrollY;
    const scrollableHeight = wrapperRect.height - window.innerHeight;
    const segmentLength = scrollableHeight / SCENES.length;

    const fraction = targetId === "contatti" ? 0.9 : 0.45;
    const preciseTop = wrapperTop + segmentIndex * segmentLength + segmentLength * fraction;

    const distance = Math.abs(preciseTop - window.scrollY);
    const duration = clamp(distance / 2.2, 500, 2200);

    animateScrollTo(preciseTop, duration, () => {
      updateHero();
      updateScenes();
    });
  });
});
