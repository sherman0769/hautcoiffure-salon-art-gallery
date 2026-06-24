import './style.css';
import { lookbookData } from './data.js';

// Global State
let currentPage = 1;
const itemsPerPage = 16;
let activeCategory = 'all';
let searchQuery = '';
let currentPlaylistIndex = 0;
let isPlaying = false;
let userVolume = 0.5;
let userSelectedLayout = false;

// Web Audio API Synthesizer State (Procedural audio engine)
let audioCtx = null;
let synthOscillators = [];
let synthGainNode = null;
let filterNode = null;
let lfoNode = null;

// Audio Playlist: local Web Audio moods by default. External URLs stay opt-in only.
const playlist = [
  {
    title: "HautCoiffure Ambient Atelier",
    url: "procedural",
    chordFreqs: [110.00, 164.81, 220.00, 277.18, 415.30],
    filterFrequency: 220,
    lfoFrequency: 0.055,
    lfoDepth: 90,
    gainScale: 0.32
  },
  {
    title: "Velvet Gallery Drone",
    url: "procedural",
    chordFreqs: [98.00, 146.83, 196.00, 246.94, 369.99],
    filterFrequency: 190,
    lfoFrequency: 0.042,
    lfoDepth: 70,
    gainScale: 0.28
  },
  {
    title: "Aurora Color Wash",
    url: "procedural",
    chordFreqs: [123.47, 185.00, 246.94, 311.13, 466.16],
    filterFrequency: 260,
    lfoFrequency: 0.068,
    lfoDepth: 110,
    gainScale: 0.26
  }
];

// Initialize Audio Element for MP3 streams
const audio = new Audio();
audio.crossOrigin = "anonymous";
audio.loop = true;

// DOM Elements
const preloader = document.getElementById('preloader');
const ambientGlow = document.getElementById('ambientGlow');
const navLinks = document.querySelectorAll('.nav-link');
const headerMusicToggle = document.getElementById('headerMusicToggle');
const headerShareBtn = document.getElementById('headerShareBtn');

// Custom Cursor Elements
const customCursor = document.getElementById('customCursor');
const customCursorDot = document.getElementById('customCursorDot');

// Horizontal Scroll Elements
const exScrollWrapper = document.getElementById('exhibitionScrollWrapper');
const exTrack = document.getElementById('exhibitionTrack');
const exhibitPrevBtn = document.getElementById('exhibitPrevBtn');
const exhibitNextBtn = document.getElementById('exhibitNextBtn');
const exhibitionProgressBar = document.getElementById('exhibitionProgressBar');

// Lookbook Elements
const lookbookGrid = document.getElementById('lookbookGrid');
const lookbookFilters = document.getElementById('lookbookFilters');
const lookbookSearch = document.getElementById('lookbookSearch');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadedCountEl = document.getElementById('loadedCount');
const layoutToggles = document.getElementById('layoutToggles');

// Audio Lounge Elements
const audioLounge = document.getElementById('audioLounge');
const audioLoungeHeader = document.getElementById('audioLoungeHeader');
const audioExpandBtn = document.getElementById('audioExpandBtn');
const audioPlayPauseBtn = document.getElementById('audioPlayPauseBtn');
const audioPrevBtn = document.getElementById('audioPrevBtn');
const audioNextBtn = document.getElementById('audioNextBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const audioVolume = document.getElementById('audioVolume');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackStatus = document.getElementById('currentTrackStatus');
const sunoUrlInput = document.getElementById('sunoUrlInput');
const sunoLoadBtn = document.getElementById('sunoLoadBtn');

// PWA Install Prompt Elements
const installPrompt = document.getElementById('installPrompt');
const installAppBtn = document.getElementById('installAppBtn');
const installDismissBtn = document.getElementById('installDismissBtn');

// Lightbox Elements
const lightboxModal = document.getElementById('lightboxModal');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxDesc = document.getElementById('lightboxDesc');
const lightboxCategory = document.getElementById('lightboxCategory');
const lightboxOrigin = document.getElementById('lightboxOrigin');
const lightboxViews = document.getElementById('lightboxViews');
const cssGradientCode = document.getElementById('cssGradientCode');
const copyCssBtn = document.getElementById('copyCssBtn');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxCloseActionBtn = document.getElementById('lightboxCloseActionBtn');

// Toast Element
const toastNotification = document.getElementById('toastNotification');
const toastText = document.getElementById('toastText');

let deferredInstallPrompt = null;

function showToast(message, duration = 2500) {
  toastText.textContent = message;
  toastNotification.classList.add('active');
  setTimeout(() => {
    toastNotification.classList.remove('active');
  }, duration);
}

function shouldShowInstallPrompt() {
  return installPrompt &&
    !isStandaloneMode() &&
    localStorage.getItem('hautcoiffureInstallDismissed') !== 'true' &&
    !lightboxModal.classList.contains('active') &&
    window.scrollY < 240 &&
    (window.location.hash === '' || window.location.hash === '#entrance');
}

function revealInstallPrompt() {
  if (shouldShowInstallPrompt()) {
    installPrompt.classList.add('active');
  }
}

function hideInstallPrompt() {
  installPrompt?.classList.remove('active');
}

function resetToastMessage(message = "CSS 漸層代碼已成功複製！") {
  setTimeout(() => {
    toastText.textContent = message;
  }, 300);
}

/* ==========================================================================
   1. Preloader & Page Initialization
   ========================================================================== */
window.addEventListener('load', () => {
  setTimeout(() => {
    preloader.style.opacity = '0';
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
  }, 1200);
  
  renderLookbook(true);
  setLookbookLayout(getDefaultLayoutCols(), false);
  registerServiceWorker();
  scheduleInstallPrompt();
});

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.error('Service worker registration failed:', err);
  });
}

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function scheduleInstallPrompt() {
  setTimeout(() => {
    revealInstallPrompt();
  }, 1800);
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  revealInstallPrompt();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installPrompt.classList.remove('active');
  showToast('HautCoiffure 已加入您的桌面。');
});

/* ==========================================================================
   2. Custom Liquid Cursor Tracking (Speed-Deformation Physics)
   ========================================================================== */
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;

let prevMouseX = 0;
let prevMouseY = 0;
let cursorAngle = 0;
let cursorScaleX = 1;
let cursorScaleY = 1;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  customCursorDot.style.left = `${mouseX}px`;
  customCursorDot.style.top = `${mouseY}px`;
});

function animateCursor() {
  const dx = mouseX - cursorX;
  const dy = mouseY - cursorY;
  
  // Smooth LERP tracking
  cursorX += dx * 0.15;
  cursorY += dy * 0.15;
  
  customCursor.style.left = `${cursorX}px`;
  customCursor.style.top = `${cursorY}px`;
  
  // Speed-deformation logic (stretches along movement vector)
  const moveX = mouseX - prevMouseX;
  const moveY = mouseY - prevMouseY;
  const speed = Math.sqrt(moveX * moveX + moveY * moveY);
  
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  
  if (speed > 1) {
    // Calculate movement angle
    cursorAngle = Math.atan2(moveY, moveX) * 180 / Math.PI;
    
    // Stretch proportional to speed, cap at 0.7 stretch
    const stretch = Math.min(speed / 30, 0.7);
    cursorScaleX = 1 + stretch;
    cursorScaleY = 1 - stretch * 0.4;
  } else {
    // Decelerate back to normal scale
    cursorScaleX += (1 - cursorScaleX) * 0.15;
    cursorScaleY += (1 - cursorScaleY) * 0.15;
  }
  
  // Apply liquid stretch transform
  const isHovered = customCursor.classList.contains('hovering');
  const baseScale = isHovered ? 1.7 : 1.0;
  
  customCursor.style.transform = `translate3d(-50%, -50%, 0) rotate(${cursorAngle}deg) scaleX(${cursorScaleX * baseScale}) scaleY(${cursorScaleY * baseScale})`;
  
  requestAnimationFrame(animateCursor);
}
requestAnimationFrame(animateCursor);

// Bind custom cursor hover states
function updateCursorHoverBindings() {
  const hoverElements = document.querySelectorAll(
    'a, button, input, select, textarea, .hover-target, .lookbook-item, .exhibit-card, .filter-btn, .layout-btn, .install-card'
  );
  
  hoverElements.forEach(el => {
    el.removeEventListener('mouseenter', addCursorHoverClass);
    el.removeEventListener('mouseleave', removeCursorHoverClass);
    
    el.addEventListener('mouseenter', addCursorHoverClass);
    el.addEventListener('mouseleave', removeCursorHoverClass);
  });
}

function addCursorHoverClass() {
  customCursor.classList.add('hovering');
}

function removeCursorHoverClass() {
  customCursor.classList.remove('hovering');
}

updateCursorHoverBindings();

/* ==========================================================================
   3. Horizontal Scroll & Entrance Parallax Background
   ========================================================================== */
exScrollWrapper.addEventListener('wheel', (e) => {
  if (e.deltaY !== 0) {
    e.preventDefault();
    exScrollWrapper.scrollLeft += e.deltaY * 1.5;
  }
});

function getExhibitionStep() {
  return Math.min(window.innerWidth * 0.86, 460);
}

function updateExhibitionProgress() {
  const maxScroll = exScrollWrapper.scrollWidth - exScrollWrapper.clientWidth;
  const progress = maxScroll > 0 ? exScrollWrapper.scrollLeft / maxScroll : 0;
  exhibitionProgressBar.style.width = `${Math.max(6, progress * 100)}%`;
  exhibitPrevBtn.disabled = progress <= 0.01;
  exhibitNextBtn.disabled = progress >= 0.99;
}

function scrollExhibition(direction) {
  exScrollWrapper.scrollBy({
    left: getExhibitionStep() * direction,
    behavior: 'smooth'
  });
}

exhibitPrevBtn.addEventListener('click', () => scrollExhibition(-1));
exhibitNextBtn.addEventListener('click', () => scrollExhibition(1));

exScrollWrapper.addEventListener('scroll', updateExhibitionProgress, { passive: true });
window.addEventListener('resize', updateExhibitionProgress);
exScrollWrapper.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    scrollExhibition(-1);
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    scrollExhibition(1);
  }
});

requestAnimationFrame(updateExhibitionProgress);

// Drag to scroll
let isDown = false;
let startX;
let scrollLeft;

exScrollWrapper.addEventListener('mousedown', (e) => {
  isDown = true;
  exScrollWrapper.style.cursor = 'grabbing';
  startX = e.pageX - exScrollWrapper.offsetLeft;
  scrollLeft = exScrollWrapper.scrollLeft;
  customCursor.classList.add('hovering');
});

exScrollWrapper.addEventListener('mouseleave', () => {
  isDown = false;
  exScrollWrapper.style.cursor = 'grab';
  customCursor.classList.remove('hovering');
});

exScrollWrapper.addEventListener('mouseup', () => {
  isDown = false;
  exScrollWrapper.style.cursor = 'grab';
  customCursor.classList.remove('hovering');
});

exScrollWrapper.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - exScrollWrapper.offsetLeft;
  const walk = (x - startX) * 2;
  exScrollWrapper.scrollLeft = scrollLeft - walk;
});

// Parallax scrolling for entrance backdrop image
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY > 240) {
    hideInstallPrompt();
  }

  const entranceBg = document.getElementById('entranceBg');
  if (entranceBg) {
    // Displaces backdrop at 40% speed and scales it up slightly on scroll
    entranceBg.style.transform = `scale(1.05) translateY(${scrollY * 0.4}px)`;
    // Smoothly fades background visual out as user scrolls down
    entranceBg.style.opacity = Math.max(0.08, 0.35 - scrollY / 900);
  }
});

/* ==========================================================================
   4. Dynamic Ambient Theme & Blob Shifting (Intersection Observer)
   ========================================================================== */
const themes = {
  entrance: 'radial-gradient(circle at 10% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(183, 110, 121, 0.03) 0%, transparent 40%), radial-gradient(circle at 50% 50%, #080808 0%, #030303 100%)',
  sculptural: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(212, 175, 55, 0.01) 0%, transparent 50%), radial-gradient(circle at 50% 50%, #08090a 0%, #030303 100%)',
  chroma: 'radial-gradient(circle at 40% 20%, rgba(183, 110, 121, 0.04) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(88, 86, 214, 0.04) 0%, transparent 45%), radial-gradient(circle at 50% 50%, #0a070e 0%, #030303 100%)',
  organic: 'radial-gradient(circle at 20% 80%, rgba(143, 188, 143, 0.03) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(212, 175, 55, 0.03) 0%, transparent 55%), radial-gradient(circle at 50% 50%, #070906 0%, #030303 100%)',
  cyber: 'radial-gradient(circle at 10% 80%, rgba(0, 191, 255, 0.03) 0%, transparent 40%), radial-gradient(circle at 95% 20%, rgba(255, 20, 147, 0.03) 0%, transparent 45%), radial-gradient(circle at 50% 50%, #06090e 0%, #030303 100%)',
  lookbook: 'radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.04) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(14, 14, 14, 0.9) 0%, transparent 50%), radial-gradient(circle at 50% 50%, #050505 0%, #020202 100%)'
};

const blob1 = document.querySelector('.glow-blob-1');
const blob2 = document.querySelector('.glow-blob-2');
const blob3 = document.querySelector('.glow-blob-3');

function shiftTheme(themeName) {
  if (!themes[themeName]) return;
  ambientGlow.style.background = themes[themeName];
  
  switch(themeName) {
    case 'sculptural':
      blob1.style.background = 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)';
      blob2.style.background = 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)';
      blob3.style.background = 'radial-gradient(circle, rgba(142,142,147,0.1) 0%, transparent 70%)';
      break;
    case 'chroma':
      blob1.style.background = 'radial-gradient(circle, rgba(255,20,147,0.18) 0%, transparent 70%)';
      blob2.style.background = 'radial-gradient(circle, rgba(88,86,214,0.18) 0%, transparent 70%)';
      blob3.style.background = 'radial-gradient(circle, rgba(0,191,255,0.12) 0%, transparent 70%)';
      break;
    case 'organic':
      blob1.style.background = 'radial-gradient(circle, rgba(143,188,143,0.15) 0%, transparent 70%)';
      blob2.style.background = 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)';
      blob3.style.background = 'radial-gradient(circle, rgba(139,69,19,0.08) 0%, transparent 70%)';
      break;
    case 'cyber':
      blob1.style.background = 'radial-gradient(circle, rgba(0,255,255,0.2) 0%, transparent 70%)';
      blob2.style.background = 'radial-gradient(circle, rgba(255,0,255,0.2) 0%, transparent 70%)';
      blob3.style.background = 'radial-gradient(circle, rgba(0,0,255,0.12) 0%, transparent 70%)';
      break;
    default:
      blob1.style.background = 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)';
      blob2.style.background = 'radial-gradient(circle, rgba(183,110,121,0.12) 0%, transparent 70%)';
      blob3.style.background = 'radial-gradient(circle, rgba(88,86,214,0.12) 0%, transparent 70%)';
  }
}

// Observer for horizontal room tracks
const introPanels = document.querySelectorAll('.exhibit-room-intro');
const introObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const themeName = entry.target.getAttribute('data-theme');
      shiftTheme(themeName);
    }
  });
}, {
  root: exScrollWrapper,
  threshold: 0.5
});
introPanels.forEach(panel => introObserver.observe(panel));

// Observer for vertical pages
const sections = document.querySelectorAll('main > section');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });

      if (id === 'entrance') {
        shiftTheme('entrance');
        setTimeout(revealInstallPrompt, 400);
      } else if (id === 'lookbook') {
        shiftTheme('lookbook');
        hideInstallPrompt();
      } else {
        hideInstallPrompt();
      }
    }
  });
}, {
  threshold: 0.3
});
sections.forEach(sec => sectionObserver.observe(sec));

/* ==========================================================================
   5. Lookbook Masonry & Staggered delay cascading animations
   ========================================================================== */
function getFilteredItems() {
  return lookbookData.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery) ||
      item.modelOrigin.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });
}

function renderLookbook(reset = false) {
  if (reset) {
    lookbookGrid.innerHTML = '';
    currentPage = 1;
  }

  const filteredItems = getFilteredItems();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
  const itemsToRender = filteredItems.slice(startIndex, endIndex);

  if (reset && filteredItems.length === 0) {
    lookbookGrid.innerHTML = `
      <div class="lookbook-empty-state">
        <span>NO MATCH</span>
        <p>目前沒有符合條件的髮藝靈感。</p>
      </div>
    `;
    loadedCountEl.textContent = `(0 / 0)`;
    loadMoreBtn.style.display = 'none';
    return;
  }

  itemsToRender.forEach(item => {
    const card = document.createElement('div');
    card.className = 'lookbook-item';
    card.setAttribute('data-id', item.id);
    
    let catChinese = '';
    switch(item.category) {
      case 'sculptural': catChinese = '前衛剪裁'; break;
      case 'color': catChinese = '極光色彩'; break;
      case 'braids': catChinese = '大地編髮'; break;
      case 'wave': catChinese = '韓式微捲'; break;
      case 'cyber': catChinese = '賽博之光'; break;
      case 'classic': catChinese = '經典造型'; break;
    }

    card.innerHTML = `
      <div class="lookbook-item-img-container">
        <img src="${item.url}" alt="${item.title}" class="lookbook-img" />
        <div class="lookbook-item-hover-glow"></div>
        <div class="lookbook-item-info">
          <div class="lookbook-item-meta">
            <span class="lookbook-item-tag">${catChinese}</span>
            <span class="lookbook-item-origin">${item.modelOrigin}</span>
          </div>
          <h4 class="lookbook-item-title">${item.title}</h4>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openLightbox(item));
    lookbookGrid.appendChild(card);
  });

  // Staggered float up animation for the newly rendered cards
  const newCards = lookbookGrid.querySelectorAll('.lookbook-item:not(.show)');
  newCards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add('show');
    }, idx * 45); // 45ms stagger offset
  });

  // Fade-in images
  const images = lookbookGrid.querySelectorAll('.lookbook-img');
  images.forEach(img => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => {
        img.classList.add('loaded');
      });
    }
  });

  loadedCountEl.textContent = `(${endIndex} / ${filteredItems.length})`;
  
  if (endIndex >= filteredItems.length) {
    loadMoreBtn.style.display = 'none';
  } else {
    loadMoreBtn.style.display = 'flex';
  }

  updateCursorHoverBindings();
}

// Category filter
lookbookFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  lookbookFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  activeCategory = btn.getAttribute('data-category');
  renderLookbook(true);
});

// Search
let searchTimeout;
lookbookSearch.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderLookbook(true);
  }, 300);
});

// Load more
loadMoreBtn.addEventListener('click', () => {
  currentPage++;
  renderLookbook(false);
});

/* ==========================================================================
   6. Layout View Switcher (Dynamic Columns)
   ========================================================================== */
function setLookbookLayout(cols, announce = false) {
  layoutToggles.querySelectorAll('.layout-btn').forEach(button => {
    const isActive = button.getAttribute('data-cols') === cols;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  lookbookGrid.className = `lookbook-grid cols-${cols}`;

  if (announce) {
    const label = layoutToggles.querySelector(`.layout-btn[data-cols="${cols}"] span`)?.textContent || '版面';
    showToast(`已切換為${label}模式`, 1600);
  }

  updateCursorHoverBindings();
}

function getDefaultLayoutCols() {
  return window.matchMedia('(max-width: 760px)').matches ? '2' : '4';
}

layoutToggles.addEventListener('click', (e) => {
  const btn = e.target.closest('.layout-btn');
  if (!btn) return;

  const cols = btn.getAttribute('data-cols');
  userSelectedLayout = true;
  setLookbookLayout(cols, true);
});

window.addEventListener('resize', () => {
  if (!userSelectedLayout) {
    setLookbookLayout(getDefaultLayoutCols(), false);
  }
});

/* ==========================================================================
   7. Lightbox Modal
   ========================================================================== */
function openLightbox(item) {
  hideInstallPrompt();
  lightboxImg.src = item.url;
  lightboxTitle.textContent = item.title;
  lightboxDesc.textContent = item.description;
  
  let catText = '';
  switch(item.category) {
    case 'sculptural': catText = 'Room I: Sculptural Silhouette (雕塑輪廓)'; break;
    case 'color': catText = 'Room II: Chroma Spectrum (流光光譜)'; break;
    case 'braids': catText = 'Room III: Organic Whisper (大地呢喃)'; break;
    case 'wave': catText = 'Room IV: Cybernetic Neon (賽博之光)'; break;
    case 'cyber': catText = 'Room IV: Cybernetic Neon (賽博之光)'; break;
    case 'classic': catText = 'Inspiration: Classic Aesthetics (經典美學)'; break;
  }
  lightboxCategory.textContent = catText;
  lightboxOrigin.textContent = `精緻五官選自：${item.modelOrigin}`;
  lightboxViews.textContent = `${item.views} 瀏覽`;

  let gradientCode = '';
  switch(item.category) {
    case 'sculptural':
      gradientCode = 'background: linear-gradient(135deg, #161819 0%, #2a2d30 50%, #050607 100%);';
      break;
    case 'color':
      gradientCode = 'background: linear-gradient(135deg, #321639 0%, #151532 50%, #070714 100%);';
      break;
    case 'braids':
      gradientCode = 'background: linear-gradient(135deg, #1d1e16 0%, #2f2a20 50%, #0f100d 100%);';
      break;
    case 'wave':
      gradientCode = 'background: linear-gradient(135deg, #2d1b1b 0%, #191414 50%, #0a0606 100%);';
      break;
    case 'cyber':
      gradientCode = 'background: linear-gradient(135deg, #11172a 0%, #2b1140 52%, #030711 100%);';
      break;
    default:
      gradientCode = 'background: linear-gradient(135deg, #221c13 0%, #151310 50%, #0a0a0a 100%);';
  }
  cssGradientCode.textContent = gradientCode;
  
  lightboxModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxModal.classList.remove('active');
  document.body.style.overflow = '';
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxCloseActionBtn.addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', closeLightbox);

// Connect 12 Horizonal Signature Cards to Lightbox
document.querySelectorAll('.exhibit-card').forEach((card, index) => {
  card.addEventListener('click', () => {
    const title = card.querySelector('h4').textContent;
    const desc = card.querySelector('.exhibit-desc').textContent;
    const imgUrl = card.querySelector('img').src;
    const roomNum = card.getAttribute('data-room');
    const origin = card.querySelector('.exhibit-region').textContent;
    
    let category = 'sculptural';
    if (roomNum === '2') category = 'color';
    else if (roomNum === '3') category = 'braids';
    else if (roomNum === '4') category = 'cyber';

    const item = {
      id: `exhibit-${index}`,
      url: imgUrl,
      title: title,
      description: desc,
      category: category,
      modelOrigin: origin,
      views: 890 + index * 65
    };
    
    openLightbox(item);
  });
});

/* ==========================================================================
   8. Copy Styling Code & Toast Notifications
   ========================================================================== */
copyCssBtn.addEventListener('click', () => {
  const code = cssGradientCode.textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    showToast("CSS 漸層代碼已成功複製！");
  }).catch(err => {
    console.error('Failed to copy gradient: ', err);
  });
});

headerShareBtn.addEventListener('click', async () => {
  const shareData = {
    title: document.title,
    text: 'HautCoiffure 高奢髮藝展館：瀏覽 200+ 款沙龍藝術靈感。',
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    showToast('分享連結已複製。');
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Share failed:', err);
    }
  }
});

installAppBtn.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installPrompt.classList.remove('active');
    return;
  }

  showToast('iPhone 請使用 Safari 分享選單加入主畫面。', 3600);
});

installDismissBtn.addEventListener('click', () => {
  localStorage.setItem('hautcoiffureInstallDismissed', 'true');
  hideInstallPrompt();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightboxModal.classList.contains('active')) {
    closeLightbox();
  }
});

/* ==========================================================================
   9. Web Audio API Procedural Synthesizer Engine
   ========================================================================== */
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function startProceduralSynth() {
  initAudioContext();
  const track = playlist[currentPlaylistIndex] || playlist[0];
  
  // Master Gain control
  synthGainNode = audioCtx.createGain();
  synthGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  
  // Cutoff Filter
  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(track.filterFrequency || 220, audioCtx.currentTime);
  filterNode.Q.setValueAtTime(4, audioCtx.currentTime);
  
  // LFO sweep cutoff (creates slow sea-wave like filter sweeps)
  lfoNode = audioCtx.createOscillator();
  lfoNode.type = 'sine';
  lfoNode.frequency.setValueAtTime(track.lfoFrequency || 0.06, audioCtx.currentTime);
  
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(track.lfoDepth || 90, audioCtx.currentTime);
  
  lfoNode.connect(lfoGain);
  lfoGain.connect(filterNode.frequency);
  lfoNode.start();
  
  // Soft chord harmony detuned oscillators.
  const chordFreqs = track.chordFreqs || [110.00, 164.81, 220.00, 277.18, 415.30];
  chordFreqs.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    osc.type = index % 2 === 0 ? 'triangle' : 'sine';
    
    // Add micro-detuning per voice for choral thickness
    const detuneOffset = (Math.random() - 0.5) * 0.4;
    osc.frequency.setValueAtTime(freq + detuneOffset, audioCtx.currentTime);
    
    const voiceGain = audioCtx.createGain();
    // Soft volume per voice
    voiceGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    
    osc.connect(voiceGain);
    voiceGain.connect(filterNode);
    osc.start();
    synthOscillators.push(osc);
  });
  
  filterNode.connect(synthGainNode);
  synthGainNode.connect(audioCtx.destination);
  
  // Fade in synth volume smoothly over 1.2s to prevent click pop
  synthGainNode.gain.linearRampToValueAtTime(userVolume * (track.gainScale || 0.32), audioCtx.currentTime + 1.2);
}

function stopProceduralSynth() {
  if (synthGainNode && audioCtx) {
    const gainToStop = synthGainNode;
    const oscillatorsToStop = [...synthOscillators];
    const lfoToStop = lfoNode;

    synthOscillators = [];
    synthGainNode = null;
    filterNode = null;
    lfoNode = null;

    // Fade out volume over 0.7s
    gainToStop.gain.cancelScheduledValues(audioCtx.currentTime);
    gainToStop.gain.setValueAtTime(gainToStop.gain.value, audioCtx.currentTime);
    gainToStop.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.7);
    
    setTimeout(() => {
      // Disconnect and stop voices
      oscillatorsToStop.forEach(osc => {
        try { osc.stop(); } catch(e) {}
        try { osc.disconnect(); } catch(e) {}
      });
      
      if (lfoToStop) {
        try { lfoToStop.stop(); } catch(e) {}
        try { lfoToStop.disconnect(); } catch(e) {}
      }

      try { gainToStop.disconnect(); } catch(e) {}
    }, 800);
  }
}

/* ==========================================================================
   10. Premium Audio Player Actions (MP3 + Procedural Fades)
   ========================================================================== */
audioLoungeHeader.addEventListener('click', (e) => {
  if (e.target.closest('.audio-control-btn') || e.target.closest('.audio-expand-btn')) return;
  audioLounge.classList.toggle('expanded');
});
audioExpandBtn.addEventListener('click', () => {
  audioLounge.classList.toggle('expanded');
});

function setAudioVisualState(playing) {
  audioLounge.classList.toggle('playing', playing);
  headerMusicToggle.classList.toggle('playing', playing);
  headerMusicToggle.setAttribute('aria-pressed', String(playing));
  audioPlayPauseBtn.setAttribute('aria-pressed', String(playing));
  playIcon.style.display = playing ? 'none' : 'block';
  pauseIcon.style.display = playing ? 'block' : 'none';
}

function updateTrackUI() {
  currentTrackTitle.textContent = playlist[currentPlaylistIndex].title;
  currentTrackStatus.textContent = isPlaying ? "全站播放中" : "點擊播放全局背景音樂";
}

function fadeAudio(targetVolume, onComplete) {
  const step = 0.05;
  const intervalTime = 40;
  const currentVol = audio.volume;
  const difference = targetVolume - currentVol;
  
  if (difference === 0) {
    if (onComplete) onComplete();
    return;
  }

  const stepsCount = Math.max(1, Math.abs(difference / step));
  const volumeIncrement = difference / stepsCount;
  let currentStep = 0;

  const fadeInterval = setInterval(() => {
    let nextVol = audio.volume + volumeIncrement;
    if (nextVol > 1) nextVol = 1;
    if (nextVol < 0) nextVol = 0;
    
    audio.volume = nextVol;
    currentStep++;

    if (currentStep >= stepsCount) {
      clearInterval(fadeInterval);
      audio.volume = targetVolume;
      if (onComplete) onComplete();
    }
  }, intervalTime);
}

function togglePlayPause() {
  const isProcedural = playlist[currentPlaylistIndex].url === 'procedural';

  if (isPlaying) {
    currentTrackStatus.textContent = "正在淡出...";
    
    if (isProcedural) {
      stopProceduralSynth();
      isPlaying = false;
      setAudioVisualState(false);
      updateTrackUI();
    } else {
      fadeAudio(0, () => {
        audio.pause();
        isPlaying = false;
        setAudioVisualState(false);
        updateTrackUI();
      });
    }
  } else {
    currentTrackStatus.textContent = "正在啟動...";
    
    if (isProcedural) {
      try {
        startProceduralSynth();
        isPlaying = true;
        setAudioVisualState(true);
        updateTrackUI();
      } catch (err) {
        console.error("Synthesizer audio block:", err);
        showToast('背景音樂啟動失敗，請再點一次播放。', 2600);
      }
    } else {
      audio.src = playlist[currentPlaylistIndex].url;
      audio.volume = 0;
      audio.play().then(() => {
        isPlaying = true;
        setAudioVisualState(true);
        updateTrackUI();
        fadeAudio(userVolume);
      }).catch(err => {
        console.error("Audio playback blocked:", err);
        // Fallback to procedural synth if network loop blocks loading!
        currentPlaylistIndex = 0;
        startProceduralSynth();
        isPlaying = true;
        setAudioVisualState(true);
        updateTrackUI();
      });
    }
  }
}

audioPlayPauseBtn.addEventListener('click', togglePlayPause);
headerMusicToggle.addEventListener('click', togglePlayPause);

audioVolume.addEventListener('input', (e) => {
  userVolume = parseFloat(e.target.value);
  if (isPlaying) {
    const isProcedural = playlist[currentPlaylistIndex].url === 'procedural';
    if (isProcedural && synthGainNode) {
      const track = playlist[currentPlaylistIndex] || playlist[0];
      synthGainNode.gain.setValueAtTime(userVolume * (track.gainScale || 0.32), audioCtx.currentTime);
    } else {
      audio.volume = userVolume;
    }
  }
});

function changeTrack(direction) {
  const wasPlaying = isPlaying;
  const isCurrentlyProcedural = playlist[currentPlaylistIndex].url === 'procedural';

  const performChange = () => {
    currentPlaylistIndex = (currentPlaylistIndex + direction + playlist.length) % playlist.length;
    const isNextProcedural = playlist[currentPlaylistIndex].url === 'procedural';
    
    updateTrackUI();
    
    if (wasPlaying) {
      if (isNextProcedural) {
        startProceduralSynth();
        isPlaying = true;
        setAudioVisualState(true);
        updateTrackUI();
      } else {
        audio.src = playlist[currentPlaylistIndex].url;
        audio.volume = 0;
        audio.play().then(() => {
          isPlaying = true;
          setAudioVisualState(true);
          fadeAudio(userVolume);
        }).catch(err => {
          console.error("Playback block. Falling back to synth.", err);
          currentPlaylistIndex = 0;
          startProceduralSynth();
          isPlaying = true;
          setAudioVisualState(true);
          updateTrackUI();
        });
      }
    }
  };

  if (isPlaying) {
    if (isCurrentlyProcedural) {
      stopProceduralSynth();
      performChange();
    } else {
      fadeAudio(0, () => {
        audio.pause();
        performChange();
      });
    }
  } else {
    // Just change index when paused
    currentPlaylistIndex = (currentPlaylistIndex + direction + playlist.length) % playlist.length;
    updateTrackUI();
  }
}

audioPrevBtn.addEventListener('click', () => changeTrack(-1));
audioNextBtn.addEventListener('click', () => changeTrack(1));

// Custom MP3 / external stream loader
sunoLoadBtn.addEventListener('click', () => {
  const url = sunoUrlInput.value.trim();
  if (url === '') return;

  const isCurrentlyProcedural = playlist[currentPlaylistIndex].url === 'procedural';
  
  const performLoad = () => {
    const customSong = {
      title: "自訂外部音源",
      url: url
    };
    
    if (playlist[playlist.length - 1].title.includes("自訂")) {
      playlist.pop();
    }
    
    playlist.push(customSong);
    currentPlaylistIndex = playlist.length - 1;
    audio.src = url;
    audio.volume = 0;
    
    updateTrackUI();
    
    audio.play().then(() => {
      isPlaying = true;
      setAudioVisualState(true);
      fadeAudio(userVolume);
      
      showToast("自訂音訊載入成功並開始播放！");
      resetToastMessage();
      
    }).catch(err => {
      console.error("Playback error on URL. Falling back to Synth.", err);
      // Fallback
      currentPlaylistIndex = 0;
      startProceduralSynth();
      isPlaying = true;
      setAudioVisualState(true);
      updateTrackUI();
      
      showToast("直鏈加載失敗，切回程序合成器播放！");
      resetToastMessage();
    });
  };

  if (isPlaying) {
    if (isCurrentlyProcedural) {
      stopProceduralSynth();
      performLoad();
    } else {
      fadeAudio(0, () => {
        audio.pause();
        performLoad();
      });
    }
  } else {
    performLoad();
  }
});

audio.addEventListener('ended', () => {
  changeTrack(1);
});

setAudioVisualState(false);
updateTrackUI();
