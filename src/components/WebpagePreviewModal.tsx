/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Heart, 
  ExternalLink, 
  UploadCloud, 
  Check, 
  AlertCircle, 
  Chrome, 
  Tablet, 
  Smartphone,
  ChevronRight,
  RefreshCw,
  Clock,
  Unlock,
  Key,
  Globe,
  Settings,
  Share2
} from 'lucide-react';
import { BirthdayCard } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CelebrationCanvas, CelebrationCanvasRef } from './CelebrationCanvas';

interface WebpagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdayName: string;
  cards: BirthdayCard[];
  fireworkPreset: string;
  confettiPreset: string;
  musicType: 'retro' | 'uploaded';
  musicBase64: string;
  siteTitle?: string;
  orbitTitle?: string;
  orbitDescription?: string;
  currentProjectId: string;
  currentUser: any;
}

export function WebpagePreviewModal({
  isOpen,
  onClose,
  birthdayName,
  cards,
  fireworkPreset,
  confettiPreset,
  musicType,
  musicBase64,
  siteTitle = 'Celebrating Her Orbit',
  orbitTitle = 'A Special Memory Orbit',
  orbitDescription = 'Looking back at all the precious moments we shared. Tap below to celebrate her wonderful journey!',
  currentProjectId,
  currentUser,
}: WebpagePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'host'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  
  // Vercel deployment variables
  const [vercelToken, setVercelToken] = useState(() => localStorage.getItem('vercel_access_token') || '');
  const [projectName, setProjectName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<number>(0);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployUrl, setDeployUrl] = useState<string | null>(() => localStorage.getItem('vercel_deploy_url') || null);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareMethod, setShareMethod] = useState<'api' | 'clipboard' | null>(null);

  // Local live review interactions
  const [likedCards, setLikedCards] = useState<Record<string, boolean>>({});
  const [previewMuted, setPreviewMuted] = useState(true);
  const [isCelebrated, setIsCelebrated] = useState(false);
  
  // Lightbox modal variables
  const [lightboxCard, setLightboxCard] = useState<BirthdayCard | null>(null);

  const previewCelebrationRef = useRef<CelebrationCanvasRef | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Context for the Sound Preview
  const previewAudioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Project Name based on birthday celebrant
  useEffect(() => {
    if (birthdayName) {
      const slug = birthdayName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my';
      setProjectName(`birthday-for-${slug}`);
    }
  }, [birthdayName]);

  // Clean audio on close
  useEffect(() => {
    return () => {
      if (previewAudioCtxRef.current) {
        previewAudioCtxRef.current.close().catch(() => {});
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, [isOpen]);

  // Sync the vercelDeployUrl for this project from settings
  useEffect(() => {
    if (!isOpen || !currentProjectId) return;
    
    const fetchDeployUrl = async () => {
      try {
        const docRef = doc(db, 'settings', currentProjectId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.vercelDeployUrl) {
            setDeployUrl(data.vercelDeployUrl);
          } else {
            setDeployUrl(null);
          }
        } else {
          setDeployUrl(null);
        }
      } catch (e) {
        console.warn("Could not retrieve deploy url:", e);
      }
    };
    
    fetchDeployUrl();
  }, [isOpen, currentProjectId]);

  const fallbackCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deployUrl || '');
      setShareMethod('clipboard');
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = async () => {
    if (!deployUrl) return;

    const shareData = {
      title: `Happy Birthday ${birthdayName}! 🎂`,
      text: `Check out this digital birthday memories card generated with care for ${birthdayName}! 🎉`,
      url: deployUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareMethod('api');
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Share canceled by user.');
          return;
        }
        await fallbackCopyToClipboard();
      }
    } else {
      await fallbackCopyToClipboard();
    }
  };

  if (!isOpen) return null;

  // Toggle chime sound in the preview
  const playPreviewChime = () => {
    if (musicType === 'uploaded' && musicBase64) {
      try {
        if (!previewAudioRef.current || previewAudioRef.current.src !== musicBase64) {
          if (previewAudioRef.current) {
            previewAudioRef.current.pause();
          }
          const audio = new Audio(musicBase64);
          audio.loop = true;
          audio.volume = 0.35;
          previewAudioRef.current = audio;
        }
        previewAudioRef.current.play().catch(err => {
          console.warn("Blocked custom audio autoplay", err);
        });
        setPreviewMuted(false);
      } catch (err) {
        console.warn("Upload playback issue", err);
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      previewAudioCtxRef.current = ctx;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
      gainNode.connect(ctx.destination);

      const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 523.25];
      const birthMotif = [0, 0, 1, 0, 3, 2, 0, 0, 1, 0, 4, 3]; // Happy birthday tune notes indices
      
      birthMotif.forEach((noteIdx, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.frequency.setValueAtTime(notes[noteIdx % notes.length], ctx.currentTime + idx * 0.35);
        noteGain.gain.setValueAtTime(0.03, ctx.currentTime + idx * 0.35);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.35 + 0.3);
        
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.35);
        osc.stop(ctx.currentTime + idx * 0.35 + 0.32);
      });
      setPreviewMuted(false);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCelebrateAction = () => {
    setIsCelebrated(true);
    playPreviewChime();
    
    // Trigger custom firework & confetti burst inside the preview modal
    previewCelebrationRef.current?.burstAll(fireworkPreset, confettiPreset);

    setTimeout(() => {
      setIsCelebrated(false);
    }, 4000);
  };

  // Helper to trigger confetti in the main parent browser session
  const fireworkDirectly = () => {
    // Dynamically look up main app's fireworks trigger or make visual floats
  };

  // Like action toggle
  const toggleLike = (cardId: string) => {
    setLikedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Standalone public HTML generator
  const generateStandaloneHTML = () => {
    const cardsJson = JSON.stringify(cards, null, 2);
    const fbConfigJson = JSON.stringify(firebaseConfig, null, 2);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteTitle}</title>
    
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Load Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    
    <!-- Load Canvas Confetti for the fireworks effect -->
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
    
    <!-- Load Tone.js for code-generated sound effects -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    },
                    colors: {
                        brand: {
                            50: '#fdf2f8',
                            100: '#fce7f3',
                            500: '#ec4899',
                            600: '#db2777',
                            900: '#831843',
                        }
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-10px)' },
                        }
                    }
                }
            }
        }
    </script>
    
    <style>
        body {
            background: linear-gradient(135deg, #fdf2f8 0%, #f3e8ff 100%);
            min-height: 100vh;
            scroll-behavior: smooth;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
        }
        
        /* Scroll Animation Classes */
        .reveal-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.8s cubic-bezier(0.5, 0, 0, 1), transform 0.8s cubic-bezier(0.5, 0, 0, 1);
            will-change: opacity, transform;
        }
        .reveal-on-scroll.is-visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Custom play button overlay for video thumbnails */
        .play-overlay {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(4px);
        }

        /* Heart Like Animation */
        @keyframes heartPop {
            0% { transform: scale(1); }
            40% { transform: scale(1.4); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
        }
        .like-btn.liked {
            color: #ef4444; /* Tailwind red-500 */
        }
        .like-btn.liked svg {
            fill: #ef4444;
            animation: heartPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* Lightbox transitions */
        #lightbox {
            transition: opacity 0.4s ease, backdrop-filter 0.4s ease;
        }
        #lightboxContent {
            transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            transform: scale(0.95) translateY(20px);
        }
        #lightbox.is-open {
            opacity: 1;
            backdrop-filter: blur(8px);
        }
        #lightbox.is-open #lightboxContent {
            transform: scale(1) translateY(0);
        }

        /* Color maps matching app presets */
        .card-rose-gold {
            background: linear-gradient(to bottom right, rgba(255,228,230,0.85), rgba(255,251,235,0.7), rgba(254,205,211,0.7));
            border-color: rgba(251,113,133,0.25);
        }
        .card-starry-gold {
            background: linear-gradient(to bottom right, rgba(254,243,199,0.85), rgba(255,247,237,0.7), rgba(253,230,138,0.7));
            border-color: rgba(251,191,36,0.3);
        }
        .card-champagne-silk {
            background: linear-gradient(to bottom right, rgba(254,252,232,0.85), rgba(254,243,199,0.7));
            border-color: rgba(231,229,228,0.35);
        }
        .card-lavender-mist {
            background: linear-gradient(to bottom right, rgba(243,232,255,0.85), rgba(255,228,230,0.7));
            border-color: rgba(216,180,254,0.3);
        }
        .card-coral-breeze {
            background: linear-gradient(to bottom right, rgba(255,228,230,0.85), rgba(254,243,199,0.7));
            border-color: rgba(253,186,116,0.3);
        }
    </style>
</head>
<body class="text-gray-800 antialiased overflow-x-hidden selection:bg-brand-500 selection:text-white">

    <!-- Navigation / Header -->
    <header class="w-full pt-16 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col justify-center items-center reveal-on-scroll is-visible">
        <h1 class="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-brand-900 tracking-wide text-center drop-shadow-sm mb-4">
            Happy Birthday<br>
            <span id="target-name-banner" class="text-brand-600 animate-float inline-block mt-2">${birthdayName}! 🥰🫶</span>
        </h1>
        <div class="text-center mt-2 mb-8">
            <p class="text-lg md:text-xl text-gray-600 font-medium">A Beautiful Page of Wishes & Memories 🎂</p>
            <p class="text-sm text-gray-400 mt-1" id="time-stamp-byline"></p>
        </div>
    </header>

    <!-- Main Content Container -->
    <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        <!-- Action Section -->
        <section class="max-w-3xl mx-auto mb-20 reveal-on-scroll" style="transition-delay: 100ms;">
            <div class="glass-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden group">
                <!-- Decorative background blob -->
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse-slow"></div>
                <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse-slow delay-1000"></div>
                
                <div class="relative z-10">
                    <h2 class="font-serif text-2xl md:text-3xl font-semibold text-gray-800 mb-4">${orbitTitle}</h2>
                    <p class="text-gray-600 mb-8 max-w-xl mx-auto text-lg">${orbitDescription}</p>
                    
                    <!-- Celebrate Button Centered -->
                    <button id="celebrateBtn" class="inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform w-full sm:w-auto ring-4 ring-pink-100 relative overflow-hidden">
                        <span class="relative z-10">Celebrate! 🎉</span>
                        <div class="absolute inset-0 bg-white opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
                    </button>
                    <p id="audioHint" class="text-xs text-brand-600 mt-3 font-semibold">Turn on your sound! 🎵</p>
                </div>
            </div>
        </section>

        <!-- Dynamic Grid Section -->
        <section>
            <div class="text-center mb-12 reveal-on-scroll">
                <h2 class="font-serif text-3xl md:text-4xl font-semibold text-gray-800">Beautiful Shared Wishes</h2>
                <div class="w-24 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto mt-6 rounded-full"></div>
            </div>

            <!-- The Grid - Content injected via JS -->
            <div id="galleryGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <!-- Cards will be dynamically inserted here -->
            </div>
        </section>

    </main>

    <!-- Footer -->
    <footer class="w-full py-12 text-center text-gray-500 text-xs mt-16 border-t border-white/40">
        <p class="mb-1">Happy Birthday, ${birthdayName}. Deployed beautifully with ❤️</p>
        <p class="text-gray-400">Created via Memory Cards Hub with Firebase Live Sync Enabled</p>
    </footer>

    <!-- Fullscreen Lightbox Modal -->
    <div id="lightbox" class="fixed inset-0 z-[100] bg-gray-900/95 hidden flex-col items-center justify-center opacity-0 pointer-events-none">
        <!-- Close Button -->
        <button id="closeLightbox" class="absolute top-6 right-6 md:top-8 md:right-8 text-white/70 hover:text-white hover:rotate-90 transition-all duration-300 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <!-- Dynamic Content Container -->
        <div id="lightboxContent" class="w-full h-full max-w-5xl max-h-[75vh] px-4 md:px-12 flex flex-col items-center justify-center relative mt-8">
            <div id="mediaContainer" class="relative max-w-full max-h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/15 bg-black/40"></div>
        </div>

        <!-- Caption Container -->
        <div id="lightboxCaption" class="text-white text-center mt-6 max-w-2xl px-6 pb-8">
            <h3 id="captionTitle" class="text-xl md:text-2xl font-serif font-bold mb-3 text-pink-100 drop-shadow-md"></h3>
            <p id="captionDesc" class="text-gray-300 text-xs md:text-sm leading-relaxed"></p>
        </div>
    </div>

    <!-- Active Real-time Firebase Sync SDK setup -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

        // Precompiled Static JSON fallback cards when offline or initial load
        const fallbackCards = ${cardsJson};
        const firebaseConfig = ${fbConfigJson};

        // Render current local timestamp
        document.getElementById('time-stamp-byline').innerText = new Date().toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Initialize lists & DOM
        const gridContainer = document.getElementById('galleryGrid');
        let currentLikesState = JSON.parse(localStorage.getItem('user_memory_likes') || '{}');

        // Main rendering helper Function
        function renderBirthdayPage(cardsList) {
            gridContainer.innerHTML = '';
            
            cardsList.forEach((card) => {
                const colorPreset = card.presetColor || 'rose-gold';
                const hasImage = !!card.imageUrl;
                
                // Card visual asset inside standard layout frame
                let mediaAssetHtml = '';
                if (hasImage) {
                    const isVideo = card.imageUrl.startsWith('data:video') || card.imageUrl.includes('.mp4');
                    if (isVideo) {
                        mediaAssetHtml = \`
                            <div class="w-full aspect-video bg-black/10 overflow-hidden relative">
                                <video src="\${card.imageUrl}" class="w-full h-full object-cover" muted loop playsinline></video>
                                <div class="absolute inset-0 flex items-center justify-center play-overlay bg-black/20">
                                    <div class="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center shadow">
                                        <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
                                    </div>
                                </div>
                            </div>
                        \`;
                    } else {
                        mediaAssetHtml = \`
                            <div class="w-full aspect-video bg-amber-50/10 overflow-hidden relative">
                                <img src="\${card.imageUrl}" alt="\${card.title}" class="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500">
                            </div>
                        \`;
                    }
                } else {
                    // Placeholder background
                    mediaAssetHtml = \`
                        <div class="w-full h-12 bg-transparent"></div>
                    \`;
                }

                const isLiked = currentLikesState[card.id] ? 'liked' : '';
                const likedOpacity = currentLikesState[card.id] ? '1' : '0';

                const cardHTML = \`
                    <article class="reveal-on-scroll glass-card card-\${colorPreset} rounded-2xl overflow-hidden group cursor-pointer hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 border p-5 flex flex-col justify-between h-full relative" data-id="\${card.id}">
                        
                        <button class="like-btn \${isLiked} absolute top-3 right-3 bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full p-2 text-stone-600 transition-all z-20 shadow-sm border border-white/40">
                            <svg class="w-4.5 h-4.5 heart-icon pointer-events-none" fill="currentColor" fill-opacity="\${likedOpacity}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                        </button>

                        <div>
                            \${mediaAssetHtml}
                            <div class="p-2 pt-4">
                                <h3 class="font-serif text-xl font-bold text-stone-900 mb-2 leading-tight pr-8">\${card.title}</h3>
                                <p class="text-stone-600 leading-relaxed text-sm mb-4 font-normal">\${card.description}</p>
                            </div>
                        </div>

                        <div class="border-t border-stone-500/10 pt-3 mt-4 flex justify-between items-center text-[10px] text-stone-500 font-semibold tracking-wider uppercase">
                            <span>by \${card.authorName || 'Kind Soul'}</span>
                            <span class="text-stone-400">\${new Date(card.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                    </article>
                \`;
                gridContainer.insertAdjacentHTML('beforeend', cardHTML);
            });

            // Re-bind click handlers for new cards
            document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('is-visible'));
        }

        // Initialize static content initially
        renderBirthdayPage(fallbackCards);

        // 2. Setup Fire real-time listener if configurations match
        try {
            const fbApp = initializeApp(firebaseConfig);
            const fbDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
            const liveQuery = query(collection(fbDb, 'birthday_content'), orderBy('createdAt', 'desc'));
            
            onSnapshot(liveQuery, (snapshot) => {
                const liveCards = [];
                snapshot.forEach((snap) => {
                    const d = snap.data();
                    
                    // Filter cards client side by project to isolate memory spaces
                    const targetProjId = '${currentProjectId}';
                    if (targetProjId === 'celebrant') {
                        if (d.projectId && d.projectId !== 'celebrant') return;
                    } else {
                        if (d.projectId !== targetProjId) return;
                    }

                    liveCards.push({
                        id: snap.id,
                        title: d.title || 'Untitled Memory',
                        description: d.description || '',
                        imageUrl: d.imageUrl || '',
                        presetColor: d.presetColor || 'rose-gold',
                        createdAt: d.createdAt?.seconds ? d.createdAt.seconds * 1000 : Number(d.createdAt || Date.now()),
                        authorName: d.authorName || 'Kind Soul'
                    });
                });
                
                if (liveCards.length > 0) {
                    renderBirthdayPage(liveCards);
                }
            }, (err) => {
                console.warn('Realtime sync disabled: ', err.message);
            });
        } catch (e) {
            console.warn('Could not launch live Firebase connection:', e);
        }

        // Like button clicks using Event delegation
        gridContainer.addEventListener('click', (e) => {
            const likeBtn = e.target.closest('.like-btn');
            if (likeBtn) {
                e.stopPropagation();
                const article = likeBtn.closest('article');
                const cardId = article.getAttribute('data-id');
                
                const originallyLiked = currentLikesState[cardId];
                if (originallyLiked) {
                    likeBtn.classList.remove('liked');
                    likeBtn.querySelector('.heart-icon').setAttribute('fill-opacity', '0');
                    delete currentLikesState[cardId];
                } else {
                    likeBtn.classList.add('liked');
                    likeBtn.querySelector('.heart-icon').setAttribute('fill-opacity', '1');
                    currentLikesState[cardId] = true;
                }
                localStorage.setItem('user_memory_likes', JSON.stringify(currentLikesState));
                return;
            }

            const article = e.target.closest('article');
            if (article) {
                const cardId = article.getAttribute('data-id');
                // Open lightbox
                const targetCard = fallbackCards.find(c => c.id == cardId);
                if (targetCard) {
                    openLightbox(targetCard);
                }
            }
        });

        // Lightbox Modals
        const lightbox = document.getElementById('lightbox');
        const mediaContainer = document.getElementById('mediaContainer');
        const closeBtn = document.getElementById('closeLightbox');
        const captionTitle = document.getElementById('captionTitle');
        const captionDesc = document.getElementById('captionDesc');

        function openLightbox(card) {
            mediaContainer.innerHTML = '';
            captionTitle.textContent = card.title;
            captionDesc.textContent = card.description;

            if (card.imageUrl) {
                const isVideo = card.imageUrl.startsWith('data:video') || card.imageUrl.includes('.mp4');
                if (isVideo) {
                    const video = document.createElement('video');
                    video.src = card.imageUrl;
                    video.controls = true;
                    video.autoplay = true;
                    video.className = 'w-full h-full object-contain max-h-[60vh] bg-black rounded-lg';
                    mediaContainer.appendChild(video);
                } else {
                    const img = document.createElement('img');
                    img.src = card.imageUrl;
                    img.className = 'w-full h-full object-contain max-h-[60vh] rounded-lg';
                    mediaContainer.appendChild(img);
                }
            }

            lightbox.classList.remove('hidden');
            lightbox.classList.remove('pointer-events-none');
            void lightbox.offsetWidth;
            lightbox.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        }

        function closeLightboxUI() {
            lightbox.classList.remove('is-open');
            setTimeout(() => {
                lightbox.classList.add('hidden');
                lightbox.classList.add('pointer-events-none');
                mediaContainer.innerHTML = '';
                document.body.style.overflow = '';
            }, 400);
        }

        closeBtn.addEventListener('click', closeLightboxUI);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target === document.getElementById('lightboxContent')) {
                closeLightboxUI();
            }
        });

        // Synthesize a beautiful chimes music sound playing Happy Birthday tune
        const celebrateBtn = document.getElementById('celebrateBtn');
        async function playCelebrationMusic() {
            try {
                await Tone.start();
                const synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 2 }
                }).toDestination();
                
                const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.35 }).toDestination();
                synth.connect(reverb);

                const now = Tone.now();
                // Play Happy Birthday snippet melody chimes
                synth.triggerAttackRelease("C5", "8n", now, 0.4);
                synth.triggerAttackRelease("C5", "8n", now + 0.3, 0.4);
                synth.triggerAttackRelease("D5", "4n", now + 0.6, 0.4);
                synth.triggerAttackRelease("C5", "4n", now + 1.2, 0.4);
                synth.triggerAttackRelease("F5", "4n", now + 1.8, 0.4);
                synth.triggerAttackRelease("E5", "2n", now + 2.4, 0.4);
            } catch (e) {
                console.warn(e);
            }
        }

        celebrateBtn.addEventListener('click', () => {
            playCelebrationMusic();
            
            // Trigger confetti bursts
            const end = Date.now() + 3500;
            const interval = setInterval(() => {
                if (Date.now() > end) return clearInterval(interval);
                confetti({
                    startVelocity: 30,
                    spread: 360,
                    ticks: 60,
                    origin: { x: Math.random(), y: Math.random() - 0.2 }
                });
            }, 250);
        });
    </script>
</body>
</html>`;
  };

  // Perform Vercel Deploy request directly to api.vercel.com
  const handleDeployToVercel = async () => {
    const formattedToken = vercelToken.trim();
    const formattedProject = projectName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (!formattedToken) {
      setErrorMessage('Please enter your Vercel Access Token to continue!');
      return;
    }
    if (!formattedProject) {
      setErrorMessage('Please specify a unique project name!');
      return;
    }

    setErrorMessage('');
    setIsDeploying(true);
    setDeployStep(1);
    setDeployUrl(null);
    localStorage.removeItem('vercel_deploy_url');
    setDeployLogs([
      '⚡ Initializing deployment configuration...',
      `📦 Committing project target: ${formattedProject}`,
      '📝 Compiling public static assets and memory records...'
    ]);

    // Save token to localStorage for convenience
    localStorage.setItem('vercel_access_token', formattedToken);

    try {
      // Step 1: Generate static HTML code
      await new Promise(resolve => setTimeout(resolve, 1000));
      const fileData = generateStandaloneHTML();
      
      setDeployStep(2);
      setDeployLogs(prev => [
        ...prev,
        '✨ Generated standalone public landing page HTML (with embedded Firebase Live Sync bindings!)',
        '🔑 Authenticating with Vercel API...'
      ]);

      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Make the POST request to Vercel Deploy API
      setDeployStep(3);
      setDeployLogs(prev => [
        ...prev,
        '📤 Multiplexing upload packets to Vercel API v13...',
        '🚀 Creating static direct file deployment...'
      ]);

      const reqBody = {
        name: formattedProject,
        files: [
          {
            file: 'index.html',
            data: fileData
          }
        ],
        projectSettings: {
          framework: null
        }
      };

      const res = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${formattedToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const failMessage = errorData.error?.message || `API Response Status: ${res.status}`;
        throw new Error(failMessage);
      }

      const responseData = await res.json();
      
      setDeployStep(4);
      setDeployLogs(prev => [
        ...prev,
        '✅ Files successfully accepted by Vercel serverless worker!',
        '🔗 Binding dynamic custom serverless domain url...',
        `🌎 Active URL parsed: https://${responseData.url || `${formattedProject}.vercel.app`}`
      ]);

      await new Promise(resolve => setTimeout(resolve, 1200));

      setDeployStep(5);
      const activeDeployedUrl = `https://${responseData.url}`;
      setDeployUrl(activeDeployedUrl);
      localStorage.setItem('vercel_deploy_url', activeDeployedUrl);

      // Save to Firestore Project document to support project management history
      if (currentProjectId && currentUser) {
        try {
          const docRef = doc(db, 'settings', currentProjectId);
          const snap = await getDoc(docRef);
          const currentData = snap.exists() ? snap.data() : {};
          await setDoc(docRef, {
            ...currentData,
            vercelDeployUrl: activeDeployedUrl,
            vercelProjectName: formattedProject,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
          });
        } catch (fsErr) {
          console.error("Failed to persist deployment details on settings document:", fsErr);
        }
      }

      setDeployLogs(prev => [
        ...prev,
        '✨ SUCCESS! Your celebratory web page is officially live on the internet! 🎉'
      ]);

    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'An unexpected error occurred during Vercel file push operations.');
      setDeployLogs(prev => [
        ...prev,
        `❌ FAILED: ${e.message || 'Deployment canceled due to networking issues.'}`
      ]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-stone-100"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white flex items-center justify-center">
                <Globe size={18} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 leading-none">Public Page Manager</h3>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">Preview, test, and host the special birthday greeting card</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Device switcher */}
              {activeTab === 'preview' && (
                <div className="bg-stone-200/60 p-1 rounded-xl flex items-center gap-1.5 text-stone-500 mr-4">
                  <button 
                    onClick={() => setViewport('desktop')}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${viewport === 'desktop' ? 'bg-white text-stone-900 shadow-sm' : 'hover:text-stone-800'}`}
                  >
                    <Chrome size={13} />
                    <span className="hidden sm:inline">Desktop View</span>
                  </button>
                  <button 
                    onClick={() => setViewport('mobile')}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${viewport === 'mobile' ? 'bg-white text-stone-900 shadow-sm' : 'hover:text-stone-800'}`}
                  >
                    <Smartphone size={13} />
                    <span className="hidden sm:inline">Mobile View</span>
                  </button>
                </div>
              )}

              {/* Tab Selector Buttons */}
              <div className="bg-stone-200/60 p-1 rounded-xl flex items-center gap-1.5 mr-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'preview' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-800'}`}
                >
                  Live Preview
                </button>
                <button
                  onClick={() => setActiveTab('host')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'host' ? 'bg-stone-900 text-stone-50 shadow-sm' : 'text-stone-600 hover:text-stone-800'}`}
                >
                  <UploadCloud size={12} />
                  Host on Vercel
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Master Workspace Layout */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-stone-50">
            
            {activeTab === 'preview' ? (
              /* View 1: Public Live Preview page simulation render */
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center transition-all bg-stone-100/40">
                <motion.div
                  layout
                  className={`w-full bg-gradient-to-br from-[#fdf2f8] to-[#f3e8ff] transition-all rounded-3xl overflow-hidden shadow-lg border border-stone-200 relative ${
                    viewport === 'mobile' ? 'max-w-[400px] min-h-[750px] aspect-[9/16]' : 'max-w-7xl min-h-[580px]'
                  }`}
                >
                  {/* Public Body Simulated Screen */}
                  <CelebrationCanvas ref={previewCelebrationRef} />
                  <div className="py-12 px-6 sm:px-10 flex flex-col items-center">
                    
                    {/* Decorative Blobs */}
                    <div className="absolute top-10 left-5 w-32 h-32 bg-pink-200/40 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-64 right-10 w-44 h-44 bg-purple-200/40 rounded-full blur-2xl pointer-events-none" />

                    {/* Navigation */}
                    <div className="text-center w-full z-10 mb-10">
                      <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-brand-900 tracking-wide leading-tight drop-shadow-sm">
                        Happy Birthday<br />
                        <span className="text-brand-600 inline-block mt-1 animate-pulse">{birthdayName}! 🥰🫶</span>
                      </h2>
                      <p className="text-stone-500 font-medium text-xs mt-3 uppercase tracking-wider">Celebrating 24 Beautiful Years of Joy 🎂</p>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    {/* Celebration Hero Box */}
                    <div className="glass-card rounded-2xl w-full max-w-xl p-6 text-center z-10 mb-12 shadow-sm border border-white/60 relative overflow-hidden">
                      <h3 className="font-serif text-lg font-bold text-stone-800">{orbitTitle}</h3>
                      <p className="text-xs text-stone-600 leading-relaxed max-w-md mx-auto mt-2 mb-5">
                        {orbitDescription}
                      </p>

                      <button
                        onClick={handleCelebrateAction}
                        className={`inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-extrabold rounded-full shadow hover:shadow-md hover:scale-103 transition-all transform cursor-pointer ring-4 ring-pink-100 ${isCelebrated ? 'animate-bounce' : ''}`}
                      >
                        Celebrate! 🎉
                      </button>
                      <p className="text-[10px] text-brand-600 font-bold mt-2.5 animate-pulse">
                        Click to play magic chimes! 🎵
                      </p>
                    </div>

                    {/* Cards Shared Column */}
                    <div className="w-full z-10">
                      <div className="text-center mb-8">
                        <h4 className="font-serif text-xl font-bold text-stone-800">Beautiful Shared Wishes</h4>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto mt-2.5 rounded-full" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cards.map((card) => {
                          const isLiked = likedCards[card.id];
                          const opacityHeart = isLiked ? 'fill-red-500 text-red-500' : 'text-stone-500';
                          
                          // Style based on design presets
                          let presetStyle = 'bg-white/70 border-stone-200';
                          if (card.presetColor === 'rose-gold') presetStyle = 'bg-gradient-to-br from-rose-50/80 via-amber-50/50 to-rose-100/50 border-rose-200';
                          if (card.presetColor === 'starry-gold') presetStyle = 'bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-100/50 border-amber-200';
                          if (card.presetColor === 'champagne-silk') presetStyle = 'bg-gradient-to-br from-amber-50/50 to-stone-100/50 border-stone-200';
                          if (card.presetColor === 'lavender-mist') presetStyle = 'bg-gradient-to-br from-purple-50/80 to-rose-50/50 border-purple-200';
                          if (card.presetColor === 'coral-breeze') presetStyle = 'bg-gradient-to-br from-rose-50/80 to-orange-50/50 border-orange-200';

                          return (
                            <motion.div
                              onClick={() => setLightboxCard(card)}
                              whileHover={{ y: -4 }}
                              key={card.id}
                              className={`rounded-xl p-4 border flex flex-col justify-between h-full relative cursor-pointer group shadow-sm transition-all ${presetStyle}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(card.id);
                                }}
                                className={`absolute top-2.5 right-2.5 bg-white/50 hover:bg-white/90 p-1.5 rounded-full shadow-sm transition-all text-xs z-10 border border-stone-200/40 ${opacityHeart}`}
                              >
                                <Heart size={14} className={isLiked ? 'fill-current' : ''} />
                              </button>

                              <div>
                                {card.imageUrl && (
                                  <div className="rounded-lg overflow-hidden aspect-video bg-black/5 mb-3 select-none pointer-events-none relative flex items-center justify-center">
                                    {(card.imageUrl.startsWith('data:video') || card.imageUrl.includes('.mp4')) ? (
                                      <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                                        <div className="bg-white/80 p-2 rounded-full shadow">
                                          <ChevronRight size={16} className="text-stone-800 ml-0.5" />
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={card.imageUrl} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                )}
                                <h5 className="font-serif font-bold text-stone-900 text-sm leading-tight pr-6">{card.title}</h5>
                                <p className="text-xs text-stone-600 mt-1 leading-relaxed font-light line-clamp-3">{card.description}</p>
                              </div>

                              <div className="border-t border-stone-300/30 pt-2.5 mt-3 flex justify-between items-center text-[9px] text-stone-500 font-bold uppercase tracking-wider font-mono">
                                <span>by {card.authorName || 'Kind Soul'}</span>
                                <span className="text-stone-400">{new Date(card.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </motion.div>
              </div>
            ) : (
              /* View 2: Host on Vercel deployment setup & workflow */
              <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="bg-stone-900 text-stone-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm border border-stone-800">
                    <div className="p-3 bg-stone-800 rounded-xl text-amber-400 shrink-0">
                      <Globe size={20} />
                    </div>
                    <div className="text-stone-300">
                      <h4 className="font-sans font-bold text-white text-sm">Deploy Standalone Page to Vercel</h4>
                      <p className="text-xs text-stone-400 leading-relaxed mt-1">
                        Publishing creates a hosted website that running independently on Vercel. 
                        It links to your <strong className="text-amber-400">Firebase Database</strong> so any future memory cards added or modified in this editor appear <strong className="text-amber-400">instantly in real-time</strong> on the Vercel site too!
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                      {/* Form Field 1: Vercel Access Token */}
                      <div>
                        <label className="text-xs font-bold text-stone-700 tracking-wide uppercase flex items-center justify-between">
                          <span>Vercel Access Token</span>
                          <a 
                            href="https://vercel.com/settings/tokens" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5 font-bold"
                          >
                            Create Token <ExternalLink size={10} />
                          </a>
                        </label>
                        <p className="text-[10px] text-stone-400 mt-0.5 mb-2">Configure a scoping token from your Vercel Dashboard Settings.</p>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="copy & paste ver_..."
                            value={vercelToken}
                            onChange={(e) => setVercelToken(e.target.value)}
                            className="w-full bg-white border border-stone-200/85 focus:border-stone-900 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-stone-100 pr-10"
                            disabled={isDeploying}
                          />
                          <div className="absolute right-3 top-3.5 text-stone-300">
                            <Key size={14} />
                          </div>
                        </div>
                      </div>

                      {/* Form Field 2: Vercel Project Name */}
                      <div>
                        <label className="text-xs font-bold text-stone-700 tracking-wide uppercase">Vercel Project Name</label>
                        <p className="text-[10px] text-stone-400 mt-0.5 mb-2">The subdomain name prefix on the final .vercel.app deployment.</p>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. birthday-for-sophia"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full bg-white border border-stone-200/85 focus:border-stone-900 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-stone-100 pr-10"
                            disabled={isDeploying}
                          />
                          <div className="absolute right-3 top-3.5 text-stone-300">
                            <Globe size={14} />
                          </div>
                        </div>
                        {projectName && (
                          <span className="text-[9px] text-stone-400 font-mono block mt-1">
                            Planned site: <strong className="text-stone-600">https://{projectName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}.vercel.app</strong>
                          </span>
                        )}
                      </div>

                      {/* Trigger Button */}
                      <button
                        onClick={handleDeployToVercel}
                        disabled={isDeploying}
                        className="w-full bg-stone-950 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-101 cursor-pointer hover:bg-stone-900 disabled:opacity-50 disabled:scale-100 min-h-[44px]"
                      >
                        {isDeploying ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-amber-400" />
                            <span>Deploying Standalone Page...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={14} className="text-amber-400" />
                            <span>Authorize & Publish Standalone Page</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Deploy Pipeline Action Box Logs console output */}
                    <div className="bg-stone-950 rounded-2xl p-5 border border-stone-800 flex flex-col h-[320px] shadow-inner justify-between font-mono">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-stone-850">
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Deployment Pipeline Output</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                        </div>
                        <div className="space-y-2 mt-4 text-[10px] text-stone-300 overflow-y-auto max-h-[190px]">
                          {deployLogs.length === 0 ? (
                            <p className="text-stone-500 italic">No task initialized. Press Deploy to publish static files to Vercel...</p>
                          ) : (
                            deployLogs.map((log, index) => (
                              <p key={index} className="leading-relaxed">{log}</p>
                            ))
                          )}
                        </div>
                      </div>

                      {errorMessage && (
                        <div className="bg-red-950/40 border border-red-900 text-red-200 p-2.5 rounded-xl flex items-start gap-2 text-[10px]">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional deployment success card */}
                {deployUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-gradient-to-tr from-amber-50 to-emerald-50/20 border border-amber-200/50 rounded-2xl flex items-center justify-between mt-6 shadow-sm gap-4 flex-wrap"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0 mt-0.5">
                        <Check size={18} />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-stone-900 text-sm">Deployment Active & Live!</h4>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                          Your live celebrant greeting card renders perfectly under Vercel! Copy, send and surprise her!
                        </p>
                        <p className="text-[10px] font-mono text-emerald-700 font-semibold mt-1.5 underline select-all break-all">{deployUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleShare}
                        className="bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                      >
                        {shareSuccess ? (
                          <>
                            <Check size={12} className="text-stone-950 animate-bounce" />
                            <span>{shareMethod === 'api' ? 'Shared! 🎉' : 'Copied link!'}</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={12} className="text-stone-950" />
                            <span>Share Webpage</span>
                          </>
                        )}
                      </button>

                      <a
                        href={deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs font-bold px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                      >
                        <span>Visit Live Website</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

          </div>
        </motion.div>

        {/* Inner Preview Lightbox Modal */}
        {lightboxCard && (
          <div 
            onClick={() => setLightboxCard(null)}
            className="fixed inset-0 z-55 bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          >
            <button 
              onClick={() => setLightboxCard(null)}
              className="absolute top-6 right-6 p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="max-w-4xl max-h-[70vh] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl bg-stone-900/10">
              {lightboxCard.imageUrl && (
                (lightboxCard.imageUrl.startsWith('data:video') || lightboxCard.imageUrl.includes('.mp4')) ? (
                  <video src={lightboxCard.imageUrl} controls autoPlay className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                  <img src={lightboxCard.imageUrl} className="max-w-full max-h-[70vh] object-contain" />
                )
              )}
            </div>
            <div className="text-center text-white mt-5 max-w-xl px-4">
              <h4 className="font-serif text-lg font-bold text-pink-200">{lightboxCard.title}</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed max-w-lg mx-auto">{lightboxCard.description}</p>
              <span className="text-[10px] font-mono text-stone-500 block mt-2">by {lightboxCard.authorName}</span>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
