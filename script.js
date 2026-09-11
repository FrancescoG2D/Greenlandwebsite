// Le 4 fasi (Strati, Risultato, Dettaglio, Contatti) vivono in un
// unico contenitore "pinned" continuo. Un solo livello visibile alla
// volta (video o immagine statica per i Contatti) cambia con una
// dissolvenza incrociata quando lo scroll attraversa il confine tra
// una fase e la successiva — nessuno "scorrimento" a blocchi.

const heroWrapper = document.getElementById("hero-wrapper");
const heroText = document.getElementById("hero-text");
const heroTransitionText = document.getElementById("hero-transition-text");
const scrollHint = document.getElementById("scroll-hint");

function updateHero() {
  const rect = heroWrapper.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  const progress = clamp(-rect.top / scrollable, 0, 1);

  // il testo originale della hero sparisce nel primo 30% dello scroll
  heroText.style.opacity = clamp(1 - progress / 0.3, 0, 1);
  scrollHint.style.opacity = clamp(1 - progress / 0.08, 0, 1);

  // il nuovo testo appare tra il 25% e il 55%
  const appear = clamp((progress - 0.25) / 0.3, 0, 1);
  // poi si sposta verso il basso e si rimpicciolisce tra il 60% e il 100%
  const move = clamp((progress - 0.6) / 0.4, 0, 1);

  heroTransitionText.style.opacity = appear;
  heroTransitionText.style.top = 46 + move * 34 + "vh";
  const scale = 1 + appear * 0.05 - move * 0.25;
  heroTransitionText.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

const SCENES = [
  {
    id: "strati",
    type: "video",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_3GaV1tebp6ZdOud63ROO5FRDuUT/hf_20260910_104505_d413281e-46a5-432d-b82c-db6a172ef827.mp4",
  },
  {
    id: "risultato",
    type: "video",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_3GaV1tebp6ZdOud63ROO5FRDuUT/hf_20260910_104510_2a9383a2-80e4-46ea-92c6-76c92a4d341e.mp4",
  },
  {
    id: "dettaglio",
    type: "video",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_3GaV1tebp6ZdOud63ROO5FRDuUT/hf_20260910_111606_7467ad80-df16-4ce4-8da8-4017d9693350.mp4",
  },
  {
    id: "contatti",
    type: "image", // torna all'immagine hero, chiudendo il loop
  },
];

const wrapper = document.getElementById("scenes-wrapper");
const videoA = document.getElementById("video-a");
const videoB = document.getElementById("video-b");
const imgContatti = document.getElementById("img-contatti");
const overlays = document.querySelectorAll(".overlay");

let activeVideo = videoA;
let inactiveVideo = videoB;
let currentSegmentIndex = -1;
let crossfading = false;
let targetTime = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function showOverlayFor(segmentId, visible) {
  overlays.forEach((overlay) => {
    const isTarget = overlay.dataset.segment === segmentId;
    overlay.classList.toggle("is-visible", isTarget && visible);
  });
}

function loadSegment(index, progress) {
  const scene = SCENES[index];

  if (scene.type === "image") {
    activeVideo.classList.remove("active");
    imgContatti.classList.add("active");
    currentSegmentIndex = index;
    window.setTimeout(() => {
      crossfading = false;
    }, 850);
    return;
  }

  // se arriviamo da un'immagine (es. tornando indietro dai Contatti),
  // nascondiamola prima di far ripartire un video
  imgContatti.classList.remove("active");

  inactiveVideo.src = scene.src;
  inactiveVideo.load();

  const onReady = () => {
    inactiveVideo.removeEventListener("loadedmetadata", onReady);
    inactiveVideo.currentTime = progress * (inactiveVideo.duration || 0);

    inactiveVideo.classList.add("active");
    activeVideo.classList.remove("active");

    const oldActive = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = oldActive;

    currentSegmentIndex = index;

    window.setTimeout(() => {
      crossfading = false;
    }, 850);
  };

  inactiveVideo.addEventListener("loadedmetadata", onReady);
}

function updateScenes() {
  const rect = wrapper.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollableHeight = rect.height - viewportHeight;

  const overallProgress = clamp(-rect.top / scrollableHeight, 0, 1);

  if (rect.top > 0 || rect.bottom < viewportHeight) {
    overlays.forEach((o) => o.classList.remove("is-visible"));
    if (rect.top > 0) return;
  }

  const rawIndex = overallProgress * SCENES.length;
  const segmentIndex = clamp(Math.floor(rawIndex), 0, SCENES.length - 1);
  const segmentProgress = clamp(rawIndex - segmentIndex, 0, 1);

  if (segmentIndex !== currentSegmentIndex && !crossfading) {
    crossfading = true;
    loadSegment(segmentIndex, segmentProgress);
  }

  const currentScene = SCENES[segmentIndex];
  if (!crossfading && currentScene.type === "video" && activeVideo.duration) {
    targetTime = segmentProgress * activeVideo.duration;
  }

  // l'ultima scena (Contatti) resta visibile fino in fondo alla pagina
  const isLast = segmentIndex === SCENES.length - 1;
  const upperBound = isLast ? 0.98 : 0.9;
  const showOverlay = !crossfading && segmentProgress > 0.12 && segmentProgress < upperBound;
  showOverlayFor(currentScene.id, showOverlay);
}

// caricamento iniziale del primo video
loadSegment(0, 0);
crossfading = true;
videoA.addEventListener(
  "loadedmetadata",
  () => {
    crossfading = false;
    currentSegmentIndex = 0;
  },
  { once: true }
);

// loop separato che avvicina gradualmente il video al fotogramma
// target invece di "saltarci" di scatto: molto più morbido
function smoothVideoLoop() {
  if (!crossfading && activeVideo.duration) {
    const diff = targetTime - activeVideo.currentTime;
    if (Math.abs(diff) > 0.02) {
      activeVideo.currentTime += diff * 0.15;
    }
  }
  window.requestAnimationFrame(smoothVideoLoop);
}
window.requestAnimationFrame(smoothVideoLoop);

let isProgrammaticScroll = false;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Scroll animato interamente sotto il nostro controllo: sappiamo con
// certezza quando finisce (niente timer approssimativi o eventi del
// browser che su salti lunghi arrivano tardi o troppo presto).
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
  updateHero();
  updateScenes();
});
window.addEventListener("load", () => {
  updateHero();
  updateScenes();
});

// Nav: scroll animato e preciso verso ogni fase, Contatti incluso
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

    let preciseTop;
    if (targetId === "contatti") {
      // quasi l'ultimo fotogramma: il pulsante WhatsApp è già visibile
      // (non il pixel esatto finale, che nasconderebbe l'overlay)
      preciseTop = wrapperTop + segmentIndex * segmentLength + segmentLength * 0.9;
    } else {
      // a met\u00e0 scena: l'overlay con i contenuti/CTA \u00e8 gi\u00e0 visibile
      preciseTop = wrapperTop + segmentIndex * segmentLength + segmentLength * 0.45;
    }

    const distance = Math.abs(preciseTop - window.scrollY);
    // durata proporzionale alla distanza, entro limiti ragionevoli
    const duration = clamp(distance / 2.2, 500, 2200);

    animateScrollTo(preciseTop, duration, () => {
      updateHero();
      updateScenes();
    });
  });
});
