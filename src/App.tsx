/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Sparkles, 
  Cake, 
  Gift, 
  Plus, 
  RotateCcw, 
  Camera, 
  Edit2, 
  Check, 
  Smile, 
  Volume2, 
  VolumeX,
  Compass,
  LogOut,
  LogIn,
  User as UserIcon,
  Lock,
  Share2,
  ExternalLink,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  Search,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { CelebrationCanvas, CelebrationCanvasRef } from './components/CelebrationCanvas';
import { BirthdayCards } from './components/BirthdayCards';
import { CardEditorModal } from './components/CardEditorModal';
import { UploadSection } from './components/UploadSection';
import { BirthdayCard, UploadedVideo } from './types';
import { WebpagePreviewModal } from './components/WebpagePreviewModal';

// Import Firebase components
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocFromServer,
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';

// Standard placeholder initial memories
const DEFAULT_CARDS: BirthdayCard[] = [
  {
    id: 'memory-1',
    title: 'Radiant Golden Sunshine',
    description: 'Capturing that flawless autumn afternoon when your laughter echoed across the city. Your happiness and vibrant energy have an uncanny ability to warm the coldest rooms!',
    presetColor: 'rose-gold',
    createdAt: Date.now() - 3600000 * 24 * 5, // 5 days ago
    authorId: 'system-default',
    authorName: 'A Loving Bestie',
    authorEmail: 'bestie@gmail.com'
  },
  {
    id: 'memory-2',
    title: 'Make a Magical Wish',
    description: 'Close your eyes, breathe in the fragrance of fresh lavender, and blow out the candles! May your year ahead be layered with joyful surprises, brave new paths, and golden hours.',
    presetColor: 'starry-gold',
    createdAt: Date.now() - 3600000 * 24 * 2, // 2 days ago
    authorId: 'system-default',
    authorName: 'Warm Universe',
    authorEmail: 'universe@gmail.com'
  },
  {
    id: 'memory-3',
    title: 'A Beautiful Chapter of Journeys',
    description: 'To all the morning coffees, spontaneous long-distance road trips, and stellar stargazing nights we shared. Your spirit is an endless adventure, and celebrating you is our favorite tradition.',
    presetColor: 'champagne-silk',
    createdAt: Date.now() - 3600000 * 4, // 4 hours ago
    authorId: 'system-default',
    authorName: 'Cozy Traveler',
    authorEmail: 'traveler@gmail.com'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string; vercelProjectName?: string } | null>(null);
  const [deleteVercelCheckbox, setDeleteVercelCheckbox] = useState(true);

  const [currentProjectId, setCurrentProjectId] = useState<string>(() => localStorage.getItem('current_project_id') || 'celebrant');
  const [allCards, setAllCards] = useState<BirthdayCard[]>([]);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectCelebrantName, setNewProjectCelebrantName] = useState('');

  const [birthdayName, setBirthdayName] = useState<string>('Sophia');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(birthdayName);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BirthdayCard | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [fireworkPreset, setFireworkPreset] = useState<string>('rainbow');
  const [confettiPreset, setConfettiPreset] = useState<string>('ribbon');
  const [musicType, setMusicType] = useState<'retro' | 'uploaded'>('retro');
  const [musicBase64, setMusicBase64] = useState<string>('');
  const [musicFileName, setMusicFileName] = useState<string>('');
  const [musicDuration, setMusicDuration] = useState<number>(0);
  const [isMusicUploading, setIsMusicUploading] = useState<boolean>(false);

  const [siteTitle, setSiteTitle] = useState<string>('Celebrating Her Orbit');
  const [orbitTitle, setOrbitTitle] = useState<string>('A Special Memory Orbit');
  const [orbitDescription, setOrbitDescription] = useState<string>('Looking back at all the precious moments we shared. Tap below to celebrate her wonderful journey!');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);

  // Compute cards dynamically based on current project ID
  const cards = allCards.filter(c => {
    if (currentProjectId === 'celebrant') {
      return !c.projectId || c.projectId === 'celebrant';
    }
    return c.projectId === currentProjectId;
  });

  // Filter computed cards by user search keywords in real-time
  const filteredCards = cards.filter(c => {
    if (!searchQuery.trim()) return true;
    const queryTerm = searchQuery.toLowerCase();
    const titleMatch = c.title?.toLowerCase().includes(queryTerm) || false;
    const descMatch = c.description?.toLowerCase().includes(queryTerm) || false;
    const authorMatch = c.authorName?.toLowerCase().includes(queryTerm) || false;
    return titleMatch || descMatch || authorMatch;
  });

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'error' | 'success' }[]>([]);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  };

  // Background audio helper state (synthesized ambient tune)
  const [isMuted, setIsMuted] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const uploadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthIntervalRef = useRef<any>(null);

  const celebrationRef = useRef<CelebrationCanvasRef | null>(null);

  // Sync window browser tab title dynamically
  useEffect(() => {
    document.title = `${siteTitle} | Happy Birthday ${birthdayName}!`;
  }, [siteTitle, birthdayName]);

  // Test connection on boot according to structural constraints
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'settings', currentProjectId));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, [currentProjectId]);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
      if (user) {
        setAuthError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Celebrant Name & Customizations for active project id
  useEffect(() => {
    const docRef = doc(db, 'settings', currentProjectId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.name) {
          setBirthdayName(data.name);
          setTempName(data.name);
        } else {
          setBirthdayName('Sophia');
          setTempName('Sophia');
        }
        if (data.fireworkPreset) setFireworkPreset(data.fireworkPreset);
        if (data.confettiPreset) setConfettiPreset(data.confettiPreset);
        if (data.musicType) setMusicType(data.musicType);
        if (data.musicBase64) setMusicBase64(data.musicBase64);
        if (data.musicFileName) setMusicFileName(data.musicFileName);
        if (data.musicDuration) setMusicDuration(data.musicDuration);
        if (data.siteTitle) setSiteTitle(data.siteTitle);
        if (data.orbitTitle) setOrbitTitle(data.orbitTitle);
        if (data.orbitDescription) setOrbitDescription(data.orbitDescription);
      } else {
        // Fallback for new empty projects
        setBirthdayName('Sophia');
        setTempName('Sophia');
        setFireworkPreset('rainbow');
        setConfettiPreset('ribbon');
        setMusicType('retro');
        setMusicBase64('');
        setMusicFileName('');
        setMusicDuration(0);
        setSiteTitle('Celebrating Her Orbit');
        setOrbitTitle('A Special Memory Orbit');
        setOrbitDescription('Looking back at all the precious moments we shared. Tap below to celebrate her wonderful journey!');
      }
    }, (error) => {
      console.warn('Realtime sync for settings doc:', error.message);
    });
    return () => unsubscribe();
  }, [currentProjectId]);

  // Realtime load all settings documents created by logged-in user to show their history
  useEffect(() => {
    if (!currentUser) {
      setMyProjects([]);
      return;
    }
    
    const q = query(collection(db, 'settings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.updatedBy === currentUser.uid || docSnap.id === 'celebrant') {
          projectsList.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      // Sort projects by updatedAt
      projectsList.sort((a,b) => {
        const timeA = a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : Number(a.updatedAt || 0);
        const timeB = b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : Number(b.updatedAt || 0);
        return timeB - timeA;
      });
      setMyProjects(projectsList);
    }, (error) => {
      console.warn('Realtime projects query:', error.message);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync Cards listing with Firestore
  useEffect(() => {
    const q = query(collection(db, 'birthday_content'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveCards: BirthdayCard[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        liveCards.push({
          id: snap.id,
          projectId: d.projectId || 'celebrant',
          title: d.title || 'Untitled Memory',
          description: d.description || '',
          imageUrl: d.imageUrl || '',
          presetColor: d.presetColor || 'rose-gold',
          createdAt: d.createdAt?.seconds ? d.createdAt.seconds * 1000 : Number(d.createdAt || Date.now()),
          authorId: d.authorId || '',
          authorName: d.authorName || 'Kind Soul',
          authorEmail: d.authorEmail || ''
        });
      });
      
      setAllCards(liveCards);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'birthday_content');
    });
    return () => unsubscribe();
  }, []);

  // Listen for "?card=cardId" URLs and scroll to that card with a highlight glow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardIdParam = params.get('card');
    if (cardIdParam && allCards.length > 0) {
      const cardExists = allCards.some(c => c.id === cardIdParam);
      if (cardExists) {
        setHighlightedCardId(cardIdParam);
        const timer = setTimeout(() => {
          const element = document.getElementById(`birthday-card-${cardIdParam}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [allCards, currentProjectId]);

  // Login click
  const handleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      celebrationRef.current?.firework();
    } catch (err: any) {
      console.error('Sign In Issue:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('The sign-in popup was closed before completion. If the popup didn\'t appear, please check if your browser\'s blocker blocked it, or try opening this page in a new window/tab!');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('The sign-in popup was blocked by your browser. Please allow popups for this site, or open this page in a new window/tab.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setAuthError('The active login popup was cancelled. Please try again.');
      } else {
        setAuthError(err?.message || String(err));
      }
    }
  };

  // Logout click
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Sign Out Issue:', err);
    }
  };

  // Name handling saving to Firestore settings
  const handleSaveName = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }

    if (!currentUser) {
      showToast("Please connect to your Google Account at the top-right to customize the celebrant's name!", 'error');
      setIsEditingName(false);
      return;
    }

    try {
      await handleUpdateCustomizations({ name: trimmed });
      setIsEditingName(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Unified audio and synthethizer playback loop
  useEffect(() => {
    if (isMuted) {
      if (uploadedAudioRef.current) {
        uploadedAudioRef.current.pause();
      }
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } else {
      if (musicType === 'uploaded' && musicBase64) {
        if (synthIntervalRef.current) {
          clearInterval(synthIntervalRef.current);
          synthIntervalRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        if (!uploadedAudioRef.current || uploadedAudioRef.current.src !== musicBase64) {
          if (uploadedAudioRef.current) {
            uploadedAudioRef.current.pause();
          }
          const audio = new Audio(musicBase64);
          audio.loop = true;
          audio.volume = 0.35;
          uploadedAudioRef.current = audio;
        }
        uploadedAudioRef.current.play().catch(err => {
          console.warn("Blocked custom audio autoplay, waiting for interaction", err);
        });
      } else {
        if (uploadedAudioRef.current) {
          uploadedAudioRef.current.pause();
        }

        if (!synthIntervalRef.current) {
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const playChimeSequence = () => {
              const now = ctx.currentTime;
              const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00]; // major scale chimes
              const pattern = [0, 2, 4, 3, 5, 4];
              
              pattern.forEach((noteIdx, order) => {
                const osc = ctx.createOscillator();
                const noteGain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(notes[noteIdx], now + order * 0.4);
                
                noteGain.gain.setValueAtTime(0.04, now + order * 0.4);
                noteGain.gain.exponentialRampToValueAtTime(0.0001, now + order * 0.4 + 0.35);
                
                osc.connect(noteGain);
                noteGain.connect(ctx.destination);
                
                osc.start(now + order * 0.4);
                osc.stop(now + order * 0.4 + 0.4);
              });
            };

            playChimeSequence();
            synthIntervalRef.current = setInterval(playChimeSequence, 3200);
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }
  }, [isMuted, musicType, musicBase64]);

  // Clean audio on component unmount
  useEffect(() => {
    return () => {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (uploadedAudioRef.current) {
        uploadedAudioRef.current.pause();
      }
    };
  }, []);

  const toggleMusic = () => {
    setIsMuted(prev => !prev);
  };

  const handleShareClick = async () => {
    const shareData = {
      title: `${siteTitle} | Happy Birthday ${birthdayName}!`,
      text: `Check out my birthday celebration for ${birthdayName}! 🎂✨`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast("Shared successfully! 🎁🎉", "success");
      } catch (error: any) {
        // Only report actual errors, ignore AbortError from cancellations
        if (error?.name !== 'AbortError') {
          console.error("Web share failed:", error);
          showToast("Sharing failed. Copied link instead!", "info");
          try {
            await navigator.clipboard.writeText(window.location.href);
          } catch (_) {}
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link copied to clipboard! Share it with friends. 📋💖", "success");
      } catch (err) {
        showToast("Could not copy link to clipboard.", "error");
      }
    }
  };

  // Custom visual presets & custom audio save handler
  const handleUpdateCustomizations = async (updates: {
    name?: string;
    fireworkPreset?: string;
    confettiPreset?: string;
    musicType?: 'retro' | 'uploaded';
    musicBase64?: string;
    musicFileName?: string;
    musicDuration?: number;
    siteTitle?: string;
    orbitTitle?: string;
    orbitDescription?: string;
  }) => {
    if (!currentUser) {
      showToast("Please connect to your Google Account at the top-right first to customize celebration assets!", 'error');
      return;
    }
    try {
      const docRef = doc(db, 'settings', currentProjectId);
      const currentDoc = await getDoc(docRef);
      const docData = currentDoc.exists() ? currentDoc.data() : {};
      
      const payload: any = {
        name: updates.name !== undefined ? updates.name : (docData.name || birthdayName),
        fireworkPreset: updates.fireworkPreset !== undefined ? updates.fireworkPreset : (docData.fireworkPreset || fireworkPreset),
        confettiPreset: updates.confettiPreset !== undefined ? updates.confettiPreset : (docData.confettiPreset || confettiPreset),
        musicType: updates.musicType !== undefined ? updates.musicType : (docData.musicType || musicType),
        musicBase64: updates.musicBase64 !== undefined ? updates.musicBase64 : (docData.musicBase64 || musicBase64),
        musicFileName: updates.musicFileName !== undefined ? updates.musicFileName : (docData.musicFileName || musicFileName),
        musicDuration: updates.musicDuration !== undefined ? updates.musicDuration : (docData.musicDuration || musicDuration),
        siteTitle: updates.siteTitle !== undefined ? updates.siteTitle : (docData.siteTitle || siteTitle),
        orbitTitle: updates.orbitTitle !== undefined ? updates.orbitTitle : (docData.orbitTitle || orbitTitle),
        orbitDescription: updates.orbitDescription !== undefined ? updates.orbitDescription : (docData.orbitDescription || orbitDescription),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (docData.vercelDeployUrl) {
        payload.vercelDeployUrl = docData.vercelDeployUrl;
      }
      if (docData.vercelProjectName) {
        payload.vercelProjectName = docData.vercelProjectName;
      }
      
      await setDoc(docRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/${currentProjectId}`);
    }
  };

  // Automated teardown from both Firestore and Vercel simultaneously - Custom UI Popup Trigger
  const handleDeleteProject = (projId: string, projName: string, vercelProjectName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (projId === 'celebrant') {
      showToast("Cannot delete the Default Folder!", "error");
      return;
    }

    if (!currentUser) {
      showToast("Please sign in to delete projects.", "error");
      return;
    }

    setProjectToDelete({ id: projId, name: projName, vercelProjectName });
    setDeleteVercelCheckbox(true);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const { id: projId, name: projName, vercelProjectName } = projectToDelete;
    
    // Close the custom confirmation dialog
    setProjectToDelete(null);

    setIsDeletingProject(true);
    showToast(`Cleaning up project assets for "${projName}"...`, "info");

    try {
      // 1. Remove from Vercel if requested
      if (deleteVercelCheckbox && vercelProjectName) {
        const token = localStorage.getItem('vercel_access_token');
        if (token) {
          try {
            const res = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectName}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (res.ok) {
              showToast("Successfully deleted the project and domains from Vercel!", "success");
            } else {
              const errData = await res.json().catch(() => ({}));
              console.error("Vercel Delete Error Payload:", errData);
              showToast(`Vercel cleanup failed: ${errData.error?.message || res.status}. Database files cleaned up but Vercel site is still live.`, "error");
            }
          } catch (vErr: any) {
            console.error("Vercel Network Error:", vErr);
            showToast(`Could not contact Vercel: ${vErr.message}`, "error");
          }
        } else {
          showToast("Vercel token not found in settings. Skipping Vercel live cleanup.", "info");
        }
      }

      // 2. Delete memory cards belonging to this project
      const associatedCards = allCards.filter(c => c.projectId === projId);
      for (const card of associatedCards) {
        try {
          await deleteDoc(doc(db, 'birthday_content', card.id));
        } catch (cErr) {
          console.error(`Failed to delete card ${card.id}:`, cErr);
        }
      }

      // 3. Delete the settings document
      try {
        await deleteDoc(doc(db, 'settings', projId));
      } catch (firestoreError) {
        handleFirestoreError(firestoreError, OperationType.DELETE, `settings/${projId}`);
      }
      showToast(`Successfully deleted celebration space for "${projName}"! 🎉`, "success");

      // 4. Default back to 'celebrant' sandbox if we deleted the active project
      if (currentProjectId === projId) {
        localStorage.setItem('current_project_id', 'celebrant');
        setCurrentProjectId('celebrant');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Project deletion failed: ${err.message}`, "error");
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Safe file upload with format, length (max 180s) and size verification
  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      showToast("Please connect to your Google Account at the top-right bar to upload custom music!", 'error');
      return;
    }

    if (file.size > 850000) {
      showToast("The audio file exceeds the database size limit of 850 KB. Please choose a small, compressed audio track suitable for instant cloud delivery.", 'error');
      return;
    }

    setIsMusicUploading(true);

    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);

    audio.addEventListener('loadedmetadata', async () => {
      const duration = audio.duration;
      if (duration > 180) {
        showToast(`Validation failed: Audio duration is ${Math.round(duration)} seconds, which exceeds the limit of 180 seconds (3 minutes). Please upload a shorter sound file.`, 'error');
        setIsMusicUploading(false);
        URL.revokeObjectURL(audioUrl);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        try {
          await handleUpdateCustomizations({
            musicType: 'uploaded',
            musicBase64: base64String,
            musicFileName: file.name,
            musicDuration: Math.round(duration)
          });
        } catch (error) {
          console.error("Save custom music error:", error);
        } finally {
          setIsMusicUploading(false);
          URL.revokeObjectURL(audioUrl);
        }
      };
      reader.readAsDataURL(file);
    });

    audio.addEventListener('error', () => {
      showToast("Failed to analyze audio file. Please certify the file is a valid web audio format (.mp3, .wav, or .m4a).", 'error');
      setIsMusicUploading(false);
      URL.revokeObjectURL(audioUrl);
    });
  };

  // Add / Edit Card Save callback
  const handleSaveCard = async (cardData: Omit<BirthdayCard, 'createdAt' | 'authorId' | 'authorName' | 'authorEmail'>) => {
    if (!currentUser) {
      showToast("Please connect with Google first at the top-right corner to publish cards!", 'error');
      return;
    }

    const cardId = cardData.id || Math.random().toString(36).substring(2, 9);
    const docRef = doc(db, 'birthday_content', cardId);

    // Verify ownership during edit updates
    if (cardData.id) {
      const existing = cards.find(c => c.id === cardData.id);
      if (existing && existing.authorId !== currentUser.uid && existing.authorId !== 'system-default') {
        showToast("You are not authorized to modify memory cards posted by others!", 'error');
        return;
      }
    }

    const payload = {
      id: cardId,
      projectId: currentProjectId,
      title: cardData.title,
      description: cardData.description,
      presetColor: cardData.presetColor || 'rose-gold',
      imageUrl: cardData.imageUrl || '',
      createdAt: serverTimestamp(),
      authorId: currentUser.uid,
      authorName: currentUser.displayName || 'Kind Guest',
      authorEmail: currentUser.email || ''
    };

    try {
      await setDoc(docRef, payload);
      setIsModalOpen(false);
      celebrationRef.current?.firework();
      showToast("Memory card saved successfully!", 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `birthday_content/${cardId}`);
    }
  };

  const handleDeleteCard = async (id: string) => {
    const cardToDel = cards.find(c => c.id === id);
    if (!cardToDel) return;

    if (!currentUser) {
      showToast("Please connect with Google first to manage cards.", 'error');
      return;
    }

    const activeProjectSettings = myProjects.find(p => p.id === cardToDel.projectId);
    const isProjectOwner = activeProjectSettings && activeProjectSettings.updatedBy === currentUser.uid;

    if (cardToDel.authorId !== currentUser.uid && !isProjectOwner) {
      showToast("You are only permitted to delete memory cards you created or those in spaces you own!", 'error');
      return;
    }

    if (window.confirm('Are you absolute certain you want to delete this memory card?')) {
      try {
         await deleteDoc(doc(db, 'birthday_content', id));
         celebrationRef.current?.firework();
         showToast("Memory card deleted successfully!", 'success');
      } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `birthday_content/${id}`);
      }
    }
  };

  const handleEditTrigger = (card: BirthdayCard) => {
    if (!currentUser) {
      showToast("Sign in with Google to edit cards.", 'error');
      return;
    }
    if (card.authorId !== currentUser.uid && card.authorId !== 'system-default') {
      showToast("You can only modify cards you created.", 'error');
      return;
    }
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleResetToDefault = async () => {
    if (!currentUser) {
      showToast("Please connect to your Google Account in the top bar to reset elements.", 'error');
      return;
    }
    if (window.confirm('Delete memories you authored and reset the default birthday name?')) {
      const myCards = cards.filter(c => c.authorId === currentUser.uid);
      for (const card of myCards) {
        try {
          await deleteDoc(doc(db, 'birthday_content', card.id));
        } catch (e) {}
      }

      try {
        await setDoc(doc(db, 'settings', currentProjectId), {
          name: 'Sophia',
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        });
      } catch (e) {}

      celebrationRef.current?.firework();
    }
  };

  const handleVideoProcessedSuccess = (video: UploadedVideo) => {
    // Staggered celebration explosion to welcome the video
    celebrationRef.current?.burstAll(fireworkPreset, confettiPreset);
  };

  const triggerCelebrateBurst = () => {
    celebrationRef.current?.burstAll(fireworkPreset, confettiPreset);
  };

  return (
    <div id="birthday-app-root" className="min-h-screen relative overflow-x-hidden selection:bg-amber-500/20 selection:text-amber-200 selection:font-medium flex flex-col md:flex-row bg-[#0c0c0e] text-[#ededf2] w-full">
      {/* Dynamic Celebration Particle Engine */}
      <CelebrationCanvas ref={celebrationRef} />

      {/* Floating Sparkles & Soft Ambient Lights */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-amber-500/5 via-rose-500/5 to-transparent pointer-events-none -z-10" />
      <div className="absolute top-20 left-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-3xl pointer-events-none -z-10 animate-pulse duration-4000" />
      <div className="absolute top-80 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-rose-500/5 to-transparent blur-3xl pointer-events-none -z-10 animate-pulse duration-3000" />

      {/* Mobile Top Header (only on small viewport screens) */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#131316] border-b border-[#202026] sticky top-0 z-45 shadow-lg w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#e28a50] to-[#b3573c] text-white flex items-center justify-center font-bold">
            <Cake size={15} />
          </div>
          <span className="font-serif font-black text-stone-200 text-xs tracking-tight">{siteTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(prev => !prev)}
            className="p-2 bg-[#1b1b22] border border-[#2a2a35] rounded-lg hover:bg-[#20202a] text-stone-300 font-bold transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* Desktop Persistent / Mobile Slide-over Sidebar Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-[#131316] border-r border-[#202026] p-5 flex flex-col justify-between z-45 transform transition-transform duration-300 md:translate-x-0 md:static md:h-screen sticky top-0 shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden text-left">
          {/* Sidebar Top Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#202026] mb-5 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shrink-0 select-none">
                <Cake size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif font-black text-stone-100 text-sm leading-tight truncate" title={siteTitle}>
                  {siteTitle}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 animate-pulse" />
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider truncate">
                    {birthdayName}'s Space
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden text-stone-400 hover:text-stone-200 p-1.5 hover:bg-[#1a1a22] border border-[#232329] rounded-lg"
            >
              <X size={15} />
            </button>
          </div>

          {/* Core Space Swapper Panel */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
            <div className="flex items-center justify-between border-b border-[#202026] pb-1.5 mb-1 select-none">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#88889c]">
                Celebration Spaces
              </span>
              <button
                onClick={() => {
                  if (!currentUser) {
                    showToast("Please Connect Account Google first to create new pages!", "error");
                    return;
                  }
                  setIsCreateProjectOpen(!isCreateProjectOpen);
                }}
                className="text-[9px] font-black text-amber-400 hover:text-amber-350 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-0.5 cursor-pointer border border-[#c19a4e]/20 transition-all font-sans"
              >
                <Plus size={10} /> New
              </button>
            </div>

            {isCreateProjectOpen && (
              <div className="bg-[#1a1a22] rounded-xl p-3 border border-[#2a2a35] flex flex-col gap-2 overflow-hidden text-xs">
                <p className="text-[9px] text-[#88889c] font-bold">Celebrant's Name:</p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Sophia, Joe"
                    value={newProjectCelebrantName}
                    onChange={(e) => setNewProjectCelebrantName(e.target.value)}
                    className="bg-[#111115] border border-[#2d2d3d] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 flex-1 min-w-0"
                  />
                  <button
                    onClick={async () => {
                      const trimmed = newProjectCelebrantName.trim();
                      if (!trimmed) return;
                      try {
                        const newId = 'project-' + Math.random().toString(36).substring(2, 9);
                        await setDoc(doc(db, 'settings', newId), {
                          name: trimmed,
                          updatedAt: serverTimestamp(),
                          updatedBy: currentUser?.uid,
                          siteTitle: `Happy Birthday ${trimmed}`,
                          orbitTitle: `A special memory orbit for ${trimmed}`,
                          orbitDescription: `Reflecting on all the moments that make ${trimmed} shine. Leave your memories below!`
                        });
                        localStorage.setItem('current_project_id', newId);
                        setCurrentProjectId(newId);
                        setIsCreateProjectOpen(false);
                        setNewProjectCelebrantName('');
                        showToast(`Created celebration page for ${trimmed}! 🎂🎉`, "success");
                      } catch (e) {
                        showToast("Could not create celebration space.", "error");
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Go
                  </button>
                </div>
              </div>
            )}

            {/* Project List */}
            <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-0.5 text-left font-sans">
              {/* Box option */}
              <button
                onClick={() => {
                  localStorage.setItem('current_project_id', 'celebrant');
                  setCurrentProjectId('celebrant');
                  showToast("Switched to the Default Folder!", "info");
                }}
                className={`w-full p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all text-xs cursor-pointer ${
                  currentProjectId === 'celebrant'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : 'bg-[#181820] border-[#252530] hover:bg-[#202029] text-stone-305 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200 font-serif">Default Folder</span>
                  {currentProjectId === 'celebrant' && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full text-left font-sans animate-pulse" />}
                </div>
                <span className="text-[9px] text-stone-500 font-mono">Default space • Initialized</span>
              </button>

              {myProjects.map((proj) => {
                const isActive = proj.id === currentProjectId;
                const isLive = !!proj.vercelDeployUrl;
                if (proj.id === 'celebrant') return null;

                return (
                  <div
                    key={proj.id}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between gap-2 transition-all text-xs ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-[#181820] border-[#252530] hover:bg-[#202029] text-stone-300'
                    }`}
                  >
                    <button
                      onClick={() => {
                        localStorage.setItem('current_project_id', proj.id);
                        setCurrentProjectId(proj.id);
                        showToast(`Loaded ${proj.name}'s page!`, "success");
                      }}
                      className="flex-1 text-left flex flex-col gap-0.5 cursor-pointer min-w-0 focus:outline-none"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-stone-200 font-serif truncate max-w-[124px]">
                          {proj.name}
                        </span>
                        {isLive && (
                          <span className="text-[8px] text-emerald-400 font-extrabold bg-[#12281a] border border-emerald-500/30 px-1 rounded uppercase tracking-wider">Live</span>
                        )}
                        {isActive && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0 animate-pulse" />}
                      </div>
                      <span className="text-[9px] text-stone-550 text-stone-500 font-mono truncate">ID: {proj.id}</span>
                    </button>
                    
                    {proj.updatedBy === currentUser?.uid && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, proj.name, proj.vercelProjectName, e)}
                        className="text-stone-400 hover:text-rose-500 p-0.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="Delete Celebration Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Dock Footer */}
        <div className="border-t border-[#202026] pt-4 mt-auto space-y-3 text-left">
          {/* Profile Auth Box */}
          {authChecking ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#181820] border border-[#252530] text-[11px] text-stone-400">
              <Sparkles size={12} className="animate-spin text-amber-500" />
              <span>Verifying Connection...</span>
            </div>
          ) : currentUser ? (
            <div className="relative font-sans">
              {/* Profile Auth Box */}
              <div className="bg-[#181820] border border-[#252530] p-2.5 rounded-2xl flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-8 h-8 rounded-full object-cover border border-stone-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-stone-200 text-xs truncate leading-tight">
                    {currentUser.displayName}
                  </p>
                  <span className="text-[9px] text-[#88889c] block truncate">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`p-1.5 rounded-lg shrink-0 transition-all duration-150 cursor-pointer ${
                    isUserMenuOpen 
                      ? 'text-amber-400 bg-amber-500/15 border border-amber-500/20' 
                      : 'text-stone-400 hover:text-stone-100 hover:bg-[#202029] border border-transparent'
                  }`}
                  title="Settings & Workspace Options"
                >
                  <Settings size={14} className={isUserMenuOpen ? 'animate-spin-once' : ''} />
                </button>
              </div>

              {/* Settings Dropdown Popover */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    {/* Tiny transparent click-away shield */}
                    <div 
                      className="fixed inset-0 z-30 cursor-default" 
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-[#121217] border border-[#252535] rounded-2xl p-2.5 shadow-2xl z-35 flex flex-col space-y-1.5 text-left font-sans select-none"
                    >
                      <div className="px-2 py-1 border-b border-[#1f1f2a]/50 mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#88889c]">
                          Workspace Menu
                        </span>
                        <span className="text-[9px] text-[#4d4d5d] font-mono">v1.2</span>
                      </div>

                      {/* Option: Ambient Music */}
                      <button
                        onClick={() => {
                          toggleMusic();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-stone-300 hover:text-stone-100 hover:bg-[#1a1a24] transition-colors cursor-pointer text-xs font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          {isMuted ? (
                            <VolumeX size={13.5} className="text-stone-500 shrink-0" />
                          ) : (
                            <Volume2 size={13.5} className="text-amber-450 text-amber-500 animate-pulse shrink-0" />
                          )}
                          <span>Music Audio Tracker</span>
                        </div>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          isMuted ? 'bg-[#21212a] text-stone-500' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isMuted ? 'Off' : 'On'}
                        </span>
                      </button>

                      {/* Option: Reset Workspace Defaults */}
                      <button
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await handleResetToDefault();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-stone-300 hover:text-stone-100 hover:bg-[#1a1a24] transition-colors cursor-pointer text-xs font-semibold"
                      >
                        <RotateCcw size={13.5} className="text-stone-500 shrink-0" />
                        <span>Reset Workspace Defaults</span>
                      </button>

                      {/* Divider */}
                      <div className="border-t border-[#1f1f2a]/50 my-1 pt-1" />

                      {/* Option: Disconnect Account / Sign Out */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs font-bold"
                      >
                        <LogOut size={13.5} className="shrink-0 text-rose-400" />
                        <span>Sign Out Account</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full py-2 px-3 bg-gradient-to-r from-amber-550 to-amber-600 bg-amber-500 hover:bg-amber-400 text-stone-900 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-101 cursor-pointer min-h-[42px]"
            >
              <LogIn size={13} />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Shade overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-stone-950/60 z-35 md:hidden pointer-events-auto"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Board Workspace Panel */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto w-full bg-[#0a0a0d]">
        {/* Workspace Sticky Top Banner Bar */}
        <header className="bg-[#0f0f13]/90 backdrop-blur-md border-b border-[#202026] px-6 py-4 sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3 flex-shrink-0">
            <h1 className="font-serif font-extrabold text-stone-100 text-sm hidden md:inline-block">
              Memory Platform & Theme Orchestrator
            </h1>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full font-sans uppercase font-bold tracking-wider border border-amber-500/20">
              {currentProjectId === 'celebrant' ? 'Default Folder' : 'active workspace'}
            </span>
          </div>

          {/* AI Studio Styled Real-time Search Box */}
          <div id="dashboard-search-container" className="flex-1 max-w-sm md:max-w-md relative mx-0 sm:mx-4 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-stone-500" />
            </div>
            <input
              id="cards-search-input"
              type="text"
              placeholder="Search memories by title, description or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 bg-[#14141a] border border-[#2b2b3b] focus:border-amber-500 text-xs text-stone-200 placeholder-stone-500 rounded-xl transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                title="Clear search filter"
              >
                <X size={13} className="hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              id="top-bar-preview-btn"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-102 cursor-pointer min-h-[38px] uppercase tracking-wider"
            >
              <Compass size={14} className="text-stone-900 animate-pulse" />
              <span>Live Preview & Host</span>
            </button>
          </div>
        </header>

        {/* Outer body wrap container */}
        <div className="w-full flex-1">



          <AnimatePresence>
            {false && isProjectPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-100/90 p-4 z-50 text-left"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-2.5">
                  <div>
                    <h4 className="font-serif font-black text-stone-800 text-sm">Celebration Pages History</h4>
                    <p className="text-[10px] text-stone-400 font-mono">Create, manage and update public links</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        showToast("Please Connect Account Google first at the top-right to create new pages!", "error");
                        return;
                      }
                      setIsCreateProjectOpen(!isCreateProjectOpen);
                    }}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all border border-amber-200/30"
                  >
                    <Plus size={11} /> New Page
                  </button>
                </div>

                {isCreateProjectOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-stone-50 rounded-xl p-3 mb-3 border border-stone-200/60 flex flex-col gap-2 overflow-hidden text-xs"
                  >
                    <p className="text-[10px] text-stone-500 font-bold">Name of the birthday person:</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Uncle Joe, Sophia"
                        value={newProjectCelebrantName}
                        onChange={(e) => setNewProjectCelebrantName(e.target.value)}
                        className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 flex-1"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          const trimmed = newProjectCelebrantName.trim();
                          if (!trimmed) return;
                          try {
                            const newId = 'project-' + Math.random().toString(36).substring(2, 9);
                            
                            await setDoc(doc(db, 'settings', newId), {
                              name: trimmed,
                              updatedAt: serverTimestamp(),
                              updatedBy: currentUser?.uid,
                              siteTitle: `Happy Birthday ${trimmed}`,
                              orbitTitle: `A special memory orbit for ${trimmed}`,
                              orbitDescription: `Reflecting on all the moments that make ${trimmed} shine. Leave your memories below!`
                            });

                            localStorage.setItem('current_project_id', newId);
                            setCurrentProjectId(newId);
                            setIsCreateProjectOpen(false);
                            setNewProjectCelebrantName('');
                            setIsProjectPanelOpen(false);
                            showToast(`Created celebration page for ${trimmed}! 🎂🎉`, "success");
                          } catch (e: any) {
                            console.error(e);
                            showToast("Could not create new page, please try again.", "error");
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                      >
                        Create
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {myProjects.length === 0 && (
                    <div className="py-6 px-3 text-center text-stone-400 text-[10px] font-medium border border-dashed border-stone-200 rounded-xl bg-stone-50 leading-relaxed">
                      Connect your Google Account to create, save and reload your customized pages history!
                    </div>
                  )}

                  {!myProjects.some(p => p.id === 'celebrant') && (
                    <div 
                      className={`p-2.5 rounded-xl border flex flex-col justify-between hover:bg-stone-50/50 transition-all ${
                        currentProjectId === 'celebrant' 
                          ? 'border-amber-400/80 bg-amber-50/20' 
                          : 'border-stone-100 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-xs text-stone-800 font-serif">Original Sandbox (Sophia)</h5>
                          <p className="text-[9px] text-stone-400 font-mono mt-0.5">ID: celebrant • Default landing area</p>
                        </div>
                        {currentProjectId === 'celebrant' ? (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0">Active</span>
                        ) : (
                          <button
                            onClick={() => {
                              localStorage.setItem('current_project_id', 'celebrant');
                              setCurrentProjectId('celebrant');
                              setIsProjectPanelOpen(false);
                              showToast("Switched to original sandbox!", "info");
                            }}
                            className="text-[9px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 px-2 py-1 rounded cursor-pointer"
                          >
                            Load
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {myProjects.map((proj) => {
                    const isActive = proj.id === currentProjectId;
                    const isVercelLive = !!proj.vercelDeployUrl;
                    
                    return (
                      <div 
                        key={proj.id}
                        className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          isActive 
                            ? 'border-amber-405/80 bg-gradient-to-br from-amber-50/20 to-amber-100/5' 
                            : 'border-stone-100 bg-white hover:bg-stone-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <h5 className="font-bold text-xs text-stone-900 font-serif truncate">
                                {proj.name}
                              </h5>
                              {isVercelLive && (
                                <span className="text-[8px] text-emerald-600 font-black bg-emerald-50 px-1 rounded border border-emerald-100/50 flex items-center gap-0.5 shrink-0 uppercase tracking-wider">
                                  Live
                                </span>
                              )}
                            </div>
                            <p className="text-[8px] text-stone-400 font-mono truncate">ID: {proj.id}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isActive ? (
                              <span className="bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Active</span>
                            ) : (
                              <button
                                onClick={() => {
                                  localStorage.setItem('current_project_id', proj.id);
                                  setCurrentProjectId(proj.id);
                                  setIsProjectPanelOpen(false);
                                  showToast(`Loaded ${proj.name}'s page! 🎈`, "success");
                                }}
                                className="text-[9px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Load
                              </button>
                            )}
                            {proj.updatedBy === currentUser?.uid && (
                              <button
                                onClick={(e) => handleDeleteProject(proj.id, proj.name, proj.vercelProjectName, e)}
                                className="text-stone-400 hover:text-red-500 p-1 rounded hover:bg-red-55/40 transition-colors cursor-pointer"
                                title="Delete Project Space"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {isVercelLive && (
                          <div className="flex items-center justify-between border-t border-stone-50/80 pt-1.5 mt-1 text-[9px] bg-stone-50/30 p-1 rounded">
                            <span className="text-stone-400 font-mono truncate max-w-[130px]" title={proj.vercelProjectName}>
                              Slug: {proj.vercelProjectName}
                            </span>
                            <a 
                              href={proj.vercelDeployUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-600 hover:text-amber-800 font-bold flex items-center gap-0.5 shrink-0"
                            >
                              Visit Deployed <ExternalLink size={9} />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Obsolete layout buttons cleared */}

      {authError && (
        <div id="auth-error-banner" className="max-w-3xl mx-auto px-4 mt-6">
          <div className="bg-rose-50 border border-rose-205/60 rounded-2xl p-4 flex items-start gap-3 relative animate-fade-in shadow-xs">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 shrink-0">
              <Lock size={15} />
            </div>
            <div className="flex-1 space-y-1">
              <h5 className="font-serif font-black text-rose-900 text-xs text-left">Sign In Connection Note</h5>
              <p className="text-[11px] text-rose-700 leading-relaxed text-left">{authError}</p>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer absolute top-3 right-3 text-xs font-bold leading-none"
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
       {/* Primary Brand Stage (Banner Header Area) */}
      <header id="birthday-main-header" className="max-w-5xl mx-auto px-4 pt-10 pb-12 text-center relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="inline-block"
        >
          {/* Greeting Icon Decor */}
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181822] border border-[#282838] shadow-md mb-6 animate-bounce duration-3000">
            <Cake className="text-amber-400" size={15} />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#cccccc]">{siteTitle}</span>
            <Gift className="text-rose-450 text-rose-400" size={15} />
          </div>

          {/* Core Celebrant Name Banner */}
          <div className="relative group max-w-4xl mx-auto mb-5 px-4">
            {isEditingName ? (
              <div id="inline-name-edit-field" className="flex items-center justify-center gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={tempName}
                  maxLength={24}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="bg-[#111116] border border-[#2d2d3e] text-white rounded-xl px-4 py-2.5 text-center text-3xl font-serif font-black focus:outline-none focus:border-amber-500 max-w-full"
                  autoFocus
                />
                <button
                  id="confirm-name-change-btn"
                  onClick={handleSaveName}
                  className="p-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <h1 
                id="birthday-person-header-title"
                className="font-serif text-4xl sm:text-6xl md:text-7xl font-extrabold text-stone-100 tracking-tight leading-tight flex items-center justify-center flex-wrap gap-x-4 cursor-pointer hover:opacity-90 select-none group relative"
                onClick={() => {
                  if (!currentUser) {
                    showToast("Please connect to your Google Account first to personalize the birthday person's name!", 'error');
                    return;
                  }
                  setTempName(birthdayName);
                  setIsEditingName(true);
                }}
                title="Click to personalize her name!"
              >
                <span>Happy Birthday,</span>
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-rose-405 from-rose-400 via-orange-400 to-amber-400 underline decoration-amber-400/40 decoration-wavy decoration-3 select-all">
                  {birthdayName}!
                </span>
                <button
                  id="trigger-inline-name-edit"
                  className="opacity-0 group-hover:opacity-100 p-1.5 ml-1 bg-[#1a1a24] text-amber-400 hover:text-amber-300 rounded-lg border border-[#2d2d3e] shadow-md transition-all text-xs flex items-center gap-1 cursor-pointer absolute -right-12 top-1/2 transform -translate-y-1/2"
                >
                  <Edit2 size={13} />
                </button>
              </h1>
            )}
          </div>

          <p className="max-w-xl mx-auto text-sm md:text-base text-stone-400 font-light leading-relaxed mb-8 px-4">
            Today we reflect on all the sparkling days, quiet kindness, and wonderful warmth you bring to our galaxy. You deserve a year filled with grand adventures and pure magic!
          </p>

          {/* Prime Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4">
            <button
              id="congratulations-burst-trigger-btn"
              onClick={triggerCelebrateBurst}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black px-7 py-3.5 rounded-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:scale-101 cursor-pointer min-h-[48px]"
            >
              <Sparkles className="text-stone-950 animate-spin duration-3000" size={18} />
              Celebrate with Fireworks!
            </button>
            <button
              id="add-memory-lead-btn"
              onClick={() => {
                if (!currentUser) {
                  showToast("Please connect with Google first to add celebratory memory cards!", 'error');
                  return;
                }
                setEditingCard(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto bg-[#131318] hover:bg-[#1a1a24] text-[#e2e2ec] font-semibold px-6 py-3.5 rounded-full border border-[#282838] transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center gap-2 hover:scale-101 cursor-pointer min-h-[48px]"
            >
              <Plus size={18} className="text-amber-400" />
              Add Memory Card
            </button>
          </div>
        </motion.div>
      </header>

      {/* Main Responsive Grid & Upload Theater Content */}
      <main id="birthday-main-content-area" className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24">
        
        {/* Left 8 Columns: Dynamic Birthday Cards Deck */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#202026] pb-4 mb-2">
            <div className="flex items-center gap-2">
              <Camera className="text-rose-450 text-rose-400" size={18} />
              <h2 className="font-serif text-xl md:text-2xl font-bold text-[#e2e2ec] tracking-tight">Memory Cards & Wishes</h2>
            </div>
          </div>

          <BirthdayCards
            cards={filteredCards}
            onEdit={handleEditTrigger}
            onDelete={handleDeleteCard}
            currentUserId={currentUser?.uid}
            highlightedCardId={highlightedCardId}
          />

          {/* Combined Video Upload and Theme & Color Selectors (Horizontal Display) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#121217] border border-[#20202a] p-6 rounded-2xl shadow-xl mt-8 relative overflow-hidden text-left">
            {/* Direct Video Upload Processing Widget */}
            <div className="space-y-4">
              <UploadSection 
                onVideoProcessed={handleVideoProcessedSuccess}
                onTriggerCelebrate={triggerCelebrateBurst}
                currentUser={currentUser}
                onSignInTrigger={handleLogin}
              />
            </div>

            {/* Custom Theme & Color Selection customizer container */}
            <div className="space-y-6 flex flex-col justify-start relative select-none">
              {/* Beautiful Authorization Guard Overlay */}
              {!currentUser && (
                <div className="absolute inset-0 bg-[#0d0d12]/92 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all rounded-xl select-none">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2 shadow-xs animate-pulse">
                    <Lock size={16} />
                  </div>
                  <h4 className="font-serif font-black text-stone-100 text-xs uppercase tracking-wider mb-1">Authorization Required</h4>
                  <p className="text-[10px] text-stone-400 max-w-[200px] leading-relaxed mb-4">
                    Connect to your Google Account first to personalize celebration presets and colors.
                  </p>
                  <button
                    onClick={handleLogin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 duration-150 font-bold text-[10px] uppercase tracking-wider rounded-full shadow-sm cursor-pointer min-h-[34px]"
                  >
                    <LogIn size={11} />
                    <span>Log In to Unlock</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 border-b border-[#20202a] pb-3">
                <Sparkles className="text-amber-500 animate-pulse" size={17} />
                <h3 className="font-serif font-black text-stone-100 text-sm">Theme & Style Presets 🎨</h3>
              </div>

              {/* Firework Preset Picker (Theme Selection) */}
              <div className="space-y-2 text-left">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#88889c]">
                  Theme Preset (Fireworks Style)
                </label>
                <div className="flex flex-wrap gap-2 justify-start">
                  {[
                    { value: 'rainbow', label: 'Rainbow 🌈' },
                    { value: 'rose-gold', label: 'Rose Gold ✨' },
                    { value: 'starry-gold', label: 'Starry Amber 🌟' },
                    { value: 'lavender', label: 'Lavender 💜' },
                    { value: 'heart-burst', label: 'Heart Burst 💖' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        handleUpdateCustomizations({ fireworkPreset: item.value });
                        celebrationRef.current?.firework(item.value);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        fireworkPreset === item.value
                          ? 'bg-amber-600 border-amber-600 text-stone-950 shadow-md font-bold'
                          : 'bg-[#1c1c24] border-[#292938] text-stone-300 hover:bg-[#232330]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confetti Preset Picker (Color Selection) */}
              <div className="space-y-2 text-left">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#88889c]">
                  Color Style (Confetti Preset)
                </label>
                <div className="flex flex-wrap gap-2 justify-start">
                  {[
                    { value: 'ribbon', label: 'Ribbons 🎊' },
                    { value: 'stars', label: 'Stars ⭐' },
                    { value: 'hearts', label: 'Hearts ❤️' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        handleUpdateCustomizations({ confettiPreset: item.value });
                        celebrationRef.current?.confetti(item.value);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        confettiPreset === item.value
                          ? 'bg-amber-600 border-amber-600 text-stone-950 shadow-md font-bold'
                          : 'bg-[#1c1c24] border-[#292938] text-stone-300 hover:bg-[#232330]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Soundtrack and Orbit Brander */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Music Orchestrator Configurator Card */}
          <div className="bg-[#121217] border border-[#20202a] p-5 rounded-2xl shadow-md space-y-5 relative overflow-hidden text-left">
            {/* Beautiful Authorization Guard Overlay */}
            {!currentUser && (
              <div className="absolute inset-0 bg-[#0d0d12]/92 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2 shadow-xs animate-pulse">
                  <Lock size={16} />
                </div>
                <h4 className="font-serif font-black text-stone-100 text-xs uppercase tracking-wider mb-1">Authorization Required</h4>
                <p className="text-[10px] text-stone-400 max-w-[200px] leading-relaxed mb-4">
                  Connect to your Google Account first to personalize templates and customized celebration tracks.
                </p>
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 duration-150 font-bold text-[10px] uppercase tracking-wider rounded-full shadow-sm cursor-pointer min-h-[34px]"
                >
                  <LogIn size={11} />
                  <span>Log In to Unlock</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-[#20202a] pb-3 text-left">
              <Compass className="text-amber-500 animate-pulse" size={17} />
              <h3 className="font-serif font-black text-stone-100 text-sm">Celebration Soundtrack 🎵</h3>
            </div>

            {/* Background Music Mode */}
            <div className="space-y-3 pt-1 text-left">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#88889c]">
                Select Soundtrack Style
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#0c0c11]/80 p-1 rounded-xl border border-[#20202e]">
                <button
                  onClick={() => handleUpdateCustomizations({ musicType: 'retro' })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    musicType === 'retro'
                      ? 'bg-[#181825] border border-[#2b2b3a] text-amber-400 shadow-md font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Retro Chimes 🎹
                </button>
                <button
                  onClick={() => handleUpdateCustomizations({ musicType: 'uploaded' })}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    musicType === 'uploaded'
                      ? 'bg-[#181825] border border-[#2b2b3a] text-amber-400 shadow-md font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Custom Audio 🎵
                </button>
              </div>

              {musicType === 'uploaded' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-[#161210] border border-[#30201a]/40 text-left animate-fade-in">
                  {musicFileName ? (
                    <div className="text-xs space-y-1 text-left">
                      <p className="font-extrabold text-stone-200 flex items-center justify-between gap-1.5 leading-none">
                        <span className="truncate max-w-[150px]">🎵 {musicFileName}</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-md font-mono border border-amber-500/20">{musicDuration}s</span>
                      </p>
                      <p className="text-[10px] text-stone-500">Successfully validated & synced to database.</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 italic text-left">No custom audio file loaded yet.</p>
                  )}

                  <div className="relative">
                    <input
                      type="file"
                      accept="audio/*"
                      id="music-custom-file-input"
                      onChange={handleMusicUpload}
                      disabled={isMusicUploading}
                      className="hidden"
                    />
                    <label
                      htmlFor="music-custom-file-input"
                      className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-dashed transition-all cursor-pointer min-h-[44px] ${
                        isMusicUploading
                          ? 'bg-[#121217] border-[#252533] text-stone-50 animate-pulse'
                          : 'bg-[#181824] border-[#2c2c3e] hover:bg-[#202030] text-amber-450 text-amber-405 text-amber-400'
                      }`}
                    >
                      {isMusicUploading ? (
                        <>
                          <Compass className="animate-spin text-amber-500" size={14} />
                          <span>Processing Audio...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>{musicFileName ? 'Replace Audio' : 'Upload Audio'}</span>
                        </>
                      )}
                    </label>
                  </div>
                  <p className="text-[9px] text-stone-500 leading-tight">
                    * Supports .mp3, .wav, or .m4a. Max size: 850 KB, Max duration: 180 seconds.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Site & Memories Orbit Personalizer Card */}
          <div className="bg-[#121217] border border-[#20202a] p-5 rounded-2xl shadow-md space-y-4 relative overflow-hidden">
            {/* Beautiful Authorization Guard Overlay */}
            {!currentUser && (
              <div className="absolute inset-0 bg-[#0d0d12]/92 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2 shadow-xs animate-pulse">
                  <Lock size={16} />
                </div>
                <h4 className="font-serif font-black text-stone-100 text-xs uppercase tracking-wider mb-1">Authorization Required</h4>
                <p className="text-[10px] text-stone-500 max-w-[200px] leading-relaxed mb-4">
                  Connect to your Google Account first to personalize the site branding titles and memory orbit content.
                </p>
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white duration-150 font-bold text-[10px] uppercase tracking-wider rounded-full shadow-sm cursor-pointer min-h-[34px]"
                >
                  <LogIn size={11} />
                  <span>Log In to Unlock</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 font-serif">
              <Compass className="text-rose-500 animate-pulse" size={17} />
              <h3 className="font-serif font-black text-stone-900 text-sm">Site & Orbit Customizer ✍️</h3>
            </div>

            {/* Site Branding Title */}
            <div className="space-y-1">
              <label htmlFor="site-title-input" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#88889c]">
                Site Branding Title
              </label>
              <input
                id="site-title-input"
                type="text"
                value={siteTitle}
                maxLength={40}
                onChange={(e) => setSiteTitle(e.target.value)}
                onBlur={() => handleUpdateCustomizations({ siteTitle })}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCustomizations({ siteTitle })}
                className="w-full bg-[#14141a] border border-[#2d2d3e] focus:border-amber-500 rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none transition-all"
                placeholder="Celebrating Her Orbit"
              />
            </div>

            {/* Memory Orbit Section Title */}
            <div className="space-y-1">
              <label htmlFor="orbit-title-input" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#88889c]">
                Memory Orbit Title
              </label>
              <input
                id="orbit-title-input"
                type="text"
                value={orbitTitle}
                maxLength={45}
                onChange={(e) => setOrbitTitle(e.target.value)}
                onBlur={() => handleUpdateCustomizations({ orbitTitle })}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCustomizations({ orbitTitle })}
                className="w-full bg-[#14141a] border border-[#2d2d3e] focus:border-amber-500 rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none transition-all"
                placeholder="A Special Memory Orbit"
              />
            </div>

            {/* Memory Orbit Section Description */}
            <div className="space-y-1">
              <label htmlFor="orbit-desc-input" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#88889c]">
                Memory Orbit Description
              </label>
              <textarea
                id="orbit-desc-input"
                value={orbitDescription}
                rows={2}
                maxLength={200}
                onChange={(e) => setOrbitDescription(e.target.value)}
                onBlur={() => handleUpdateCustomizations({ orbitDescription })}
                className="w-full bg-[#14141a] border border-[#2d2d3e] focus:border-amber-500 rounded-xl px-3 py-2 text-stone-200 text-xs focus:outline-none transition-all resize-none"
                placeholder="Looking back at all the precious moments we shared."
              />
            </div>

            <p className="text-[10px] text-stone-500 leading-normal italic pt-1">
              * Changes auto-save on blur / Enter and apply to the live deployed website in real-time!
            </p>
          </div>

        </div>
      </main>

      {/* Immersive Full-Width Onboarding User Guide & Planner Section */}
      <section id="onboarding-guide-section" className="max-w-7xl mx-auto px-4 md:px-8 pb-24 w-full text-left">
        <div className="bg-[#121217] border border-[#20202a] p-6 md:p-8 rounded-2xl shadow-xl w-full">
          <h4 id="planner-guide-heading" className="font-serif font-bold text-stone-200 text-lg flex items-center gap-2.5 mb-3">
            <Compass className="text-amber-500 animate-pulse animate-spin duration-3000" size={20} /> Creator's User Guide & Planner Layout
          </h4>
          <p className="text-sm text-[#9999ad] leading-relaxed mb-6">
            Follow these systematic milestones to design and deploy an unforgettable, high-fidelity immersive surprise celebration page:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-[#0c0c11]/50 border border-[#1a1a24] p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs font-sans">1</div>
              <h5 className="text-xs font-bold text-stone-200 uppercase tracking-wider">Custom Name Setup</h5>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Type the celebrant's exact name in the customizable top header banner of the edit hub.
              </p>
            </div>
            <div className="bg-[#0c0c11]/50 border border-[#1a1a24] p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs font-sans">2</div>
              <h5 className="text-xs font-bold text-stone-200 uppercase tracking-wider">Memories & Wishes</h5>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Add gorgeous memory cards with heartwarming birthday wishes, custom colors, and personalized photos.
              </p>
            </div>
            <div className="bg-[#0c0c11]/50 border border-[#1a1a24] p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs font-sans">3</div>
              <h5 className="text-xs font-bold text-stone-200 uppercase tracking-wider">Cinematic Video</h5>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Drag, drop or select a high-fidelity video clip memory inside the video upload manager block.
              </p>
            </div>
            <div className="bg-[#0c0c11]/50 border border-[#1a1a24] p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs font-sans">4</div>
              <h5 className="text-xs font-bold text-stone-200 uppercase tracking-wider">Trigger Burst</h5>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Click "Celebrate with Fireworks!" at the top of your layout to trigger real-time custom particles on screen!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

      {/* Dynamic Pop-up Creator/Modifier Modal */}
      <CardEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCard}
        editingCard={editingCard}
      />

      {/* Dynamic Live Web Page Preview & Vercel Publisher Modal */}
      <WebpagePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        birthdayName={birthdayName}
        cards={cards}
        fireworkPreset={fireworkPreset}
        confettiPreset={confettiPreset}
        musicType={musicType}
        musicBase64={musicBase64}
        siteTitle={siteTitle}
        orbitTitle={orbitTitle}
        orbitDescription={orbitDescription}
        currentProjectId={currentProjectId}
        currentUser={currentUser}
      />

      {/* Dynamic Project Delete Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div id="delete-project-modal-backdrop" className="fixed inset-0 bg-[#060608]/90 backdrop-blur-md z-55 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#121218] border border-[#2d2d3e] rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden text-left"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 id="delete-modal-title" className="font-serif font-black text-[#e2e2ec] text-md leading-snug">
                    Delete Celebration Space?
                  </h3>
                  <p className="text-xs text-[#9999ad] leading-relaxed">
                    You are preparing to permanently destroy <span className="font-bold text-stone-200">"{projectToDelete.name}"</span>. This action is irreversible and cannot be undone!
                  </p>
                </div>
              </div>

              {projectToDelete.vercelProjectName ? (
                <div className="bg-[#181313] border border-[#302020] rounded-xl p-3.5 mb-5 space-y-2 select-none">
                  <label htmlFor="delete-vercel-domain-cb" className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      id="delete-vercel-domain-cb"
                      checked={deleteVercelCheckbox}
                      onChange={(e) => setDeleteVercelCheckbox(e.target.checked)}
                      className="mt-0.5 rounded border-[#303040] bg-[#0f0f15] text-[#3b82f6] focus:ring-rose-500 accent-rose-600 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-rose-300">Remove from Vercel as well?</span>
                      <p className="text-[10px] text-stone-500 leading-normal">
                        This will automatically dismantle the live production web host project <code className="font-mono bg-[#201515] text-rose-400/90 px-1 py-0.5 rounded text-[9px]">{projectToDelete.vercelProjectName}</code> so the public link disappears completely.
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="bg-[#12121a] border border-[#20202e] rounded-xl p-3 mb-5">
                  <p className="text-[11px] text-stone-500 italic">
                    * This local folder has not been deployed to Vercel yet, so no public domain requires teardown.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5">
                <button
                  id="cancel-delete-modal-btn"
                  onClick={() => setProjectToDelete(null)}
                  className="px-4 py-2 bg-transparent text-stone-300 hover:text-stone-100 font-semibold text-xs rounded-xl border border-[#2b2b3b] hover:bg-[#1a1a24] transition-all cursor-pointer min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-modal-btn"
                  onClick={handleConfirmDeleteProject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-101 cursor-pointer min-h-[38px] flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Dismantle Workspace</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beautiful Floating Toast Notification Queue */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border backdrop-blur-md text-xs font-semibold select-none ${
                toast.type === 'error'
                  ? 'bg-rose-50/95 border-rose-200/80 text-rose-800 shadow-rose-100/50'
                  : toast.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-200/80 text-emerald-800 shadow-emerald-100/50'
                  : 'bg-stone-50/95 border-stone-200/80 text-stone-800 shadow-stone-100/50'
              }`}
            >
              {toast.type === 'error' ? (
                <div className="w-5 h-5 rounded-full bg-rose-500 text-white shrink-0 flex items-center justify-center font-bold text-[10px] shadow-xs">!</div>
              ) : toast.type === 'success' ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0 flex items-center justify-center font-bold text-[10px] shadow-xs">✓</div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-stone-500 text-white shrink-0 flex items-center justify-center font-bold text-[10px] shadow-xs">i</div>
              )}
              <div className="flex-1 leading-normal font-medium text-stone-700">
                {toast.message}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-stone-400 hover:text-stone-700 font-bold ml-1 transition-colors text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
