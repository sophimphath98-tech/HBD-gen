/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Film, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Layers, Lock, LogIn } from 'lucide-react';
import { UploadedVideo } from '../types';

interface UploadSectionProps {
  onVideoProcessed: (video: UploadedVideo) => void;
  onTriggerCelebrate: () => void;
  currentUser: any;
  onSignInTrigger: () => void;
}

const STAGES = [
  { text: 'Demuxing container stream...', start: 0, end: 15 },
  { text: 'Analyzing lighting & saturation channels...', start: 15, end: 40 },
  { text: 'Infusing festive golden glimmers...', start: 40, end: 70 },
  { text: 'Compressing standard layout bitrates...', start: 70, end: 88 },
  { text: 'Finalizing birthday sparkle filter rendering...', start: 88, end: 98 },
  { text: 'Birthday magic generated successfully!', start: 98, end: 100 },
];

export function UploadSection({ onVideoProcessed, onTriggerCelebrate, currentUser, onSignInTrigger }: UploadSectionProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<UploadedVideo | null>(null);

  // Processing simulation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const handleVideoFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please upload a valid Mp4, Webm, or Mov video format.');
      return;
    }

    setErrorMessage('');
    setVideoFile(file);
    setCurrentVideo(null);
    
    // Revoke any existing preview url
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleConfirmFinalize = () => {
    if (videoFile) {
      startProcessingSimulation(videoFile);
    }
  };

  const startProcessingSimulation = (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Initiating video process analyzer...');

    const duration = 4000; // 4 seconds total processing
    const stepTime = 120; // tick rate
    const increment = (100 / (duration / stepTime));

    let currentVal = 0;

    intervalRef.current = window.setInterval(() => {
      currentVal += increment;
      if (currentVal >= 100) {
        currentVal = 100;
        clearInterval(intervalRef.current!);
        
        // Find final stage
        setStatusMessage(STAGES[STAGES.length - 1].text);
        
        // Finalize 
        setTimeout(() => {
          const videoUrl = previewUrl || URL.createObjectURL(file);
          const newVideo: UploadedVideo = {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            url: videoUrl,
            uploadDate: Date.now(),
          };
          
          setCurrentVideo(newVideo);
          setIsProcessing(false);
          setPreviewUrl(null); // Clear preview since it is finalized now
          onVideoProcessed(newVideo);
          
          // Trigger confetti + firework shockwave
          onTriggerCelebrate();
        }, 500);
      } else {
        const matchingStage = STAGES.find(s => currentVal >= s.start && currentVal < s.end);
        if (matchingStage) {
          setStatusMessage(matchingStage.text);
        }
      }
      setProgress(Math.min(Math.round(currentVal), 100));
    }, stepTime);
  };

  const handleFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleVideoFile(file);
    }
  };

  const clickInput = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setVideoFile(null);
    setCurrentVideo(null);
    setProgress(0);
    setIsProcessing(false);
    setErrorMessage('');
  };

  return (
    <div id="video-upload-module" className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
      {/* Elegant Authorization-Required Lock Overlay */}
      {!currentUser && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[3px] z-20 flex flex-col items-center justify-center p-6 text-center transition-all animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-3 shadow-xs animate-pulse">
            <Lock size={20} />
          </div>
          <h4 className="font-serif font-black text-stone-900 text-sm mb-1.5">Authorization Required 🔒</h4>
          <p className="text-[11px] text-stone-500 max-w-[210px] leading-relaxed mb-4">
            Connect to your Google Account first to process and play beautiful cinematic video memories inside the vault.
          </p>
          <button
            onClick={onSignInTrigger}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 duration-150 font-bold text-xs rounded-full shadow-sm cursor-pointer min-h-[40px]"
          >
            <LogIn size={13} />
            <span>Sign In to Unlock</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-5 border-b border-stone-100 pb-4">
        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
          <Film size={18} />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-900 leading-none">Celebration Video Vault</h3>
          <p className="text-xs text-stone-500 mt-1">Upload memories to enjoy beautiful high-fidelity playback.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* State 1: Error Notification */}
        {errorMessage && (
          <motion.div
            id="upload-error-alert"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5"
          >
            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Format Error:</span> {errorMessage}
            </div>
          </motion.div>
        )}

        {/* State 2: Upload Dropzone (Default) */}
        {!isProcessing && !currentVideo && !previewUrl && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={clickInput}
            className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-amber-400 bg-amber-50/40 scale-[1.01]' 
                : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50/80'
            }`}
          >
            <input
              id="video-file-picker"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelectChange}
              accept="video/*"
              className="hidden"
            />
            
            <div className="max-w-xs mx-auto flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shadow-sm mb-4 group-hover:scale-105 transition-transform">
                <Video className="text-stone-400" size={24} />
              </div>
              <p className="text-sm font-semibold text-stone-800 mb-1">
                Drag and drop your video file
              </p>
              <p className="text-xs text-stone-500 mb-4">
                Or click to browse your folders
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-stone-50 text-[11px] font-bold tracking-wider uppercase rounded-full shadow-sm transition-all min-h-[38px]">
                Choose Birthday Video
              </div>
              <p className="text-[10px] text-stone-400 mt-2.5">
                Supports Mp4, Webm, or Mov formats
              </p>
            </div>
          </motion.div>
        )}

        {/* State 2.5: Video Player Preview (Before finalizing) */}
        {!isProcessing && !currentVideo && previewUrl && (
          <motion.div
            key="preview-player"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="relative rounded-xl overflow-hidden aspect-video bg-black shadow-md border border-stone-200">
              <video
                id="pre-finalize-video-preview"
                src={previewUrl}
                controls
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-amber-400 text-stone-950 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase pointer-events-none flex items-center gap-1">
                <Sparkles size={11} className="animate-spin duration-3000" /> Preview File
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/70 p-4 rounded-xl space-y-3">
              <div>
                <p className="text-xs font-bold text-stone-800 truncate">
                  {videoFile ? videoFile.name : 'Selected Video'}
                </p>
                <p className="text-[10px] text-stone-400">
                  Size: {videoFile ? formatSize(videoFile.size) : '0 MB'} • Tap play to preview, then finalize below!
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  id="cancel-preview-btn"
                  type="button"
                  onClick={handleReset}
                  className="flex-1 text-xs text-stone-600 hover:text-stone-800 border border-stone-200 hover:border-stone-300 bg-white py-2 rounded-xl font-semibold transition-colors cursor-pointer min-h-[40px]"
                >
                  Change Video
                </button>
                <button
                  id="confirm-finalize-btn"
                  type="button"
                  onClick={handleConfirmFinalize}
                  className="flex-1 text-xs text-stone-50 bg-stone-900 hover:bg-stone-800 py-2 rounded-xl font-bold transition-all hover:scale-101 cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 size={14} className="text-amber-400" />
                  Finalize & Upload
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 3: Active Processing Pipeline */}
        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-amber-100 bg-amber-50/15 rounded-xl p-6 md:p-8 relative overflow-hidden"
          >
            {/* Animated background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-200/10 blur-2xl pointer-events-none animate-pulse" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-600 bg-amber-100/50 rounded px-2 py-0.5 animate-pulse flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" /> Processing Media
              </span>
              <span className="font-mono text-sm font-bold text-stone-700">{progress}%</span>
            </div>

            {/* Custom Progress Bar Track */}
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-5 border border-stone-200/35">
              <motion.div
                id="upload-progress-bar-fill"
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                style={{ width: `${progress}%` }}
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>

            <div className="flex items-start gap-3">
              <Layers className="text-amber-500 shrink-0 mt-0.5 animate-bounce duration-2000" size={16} />
              <div className="flex-1 min-w-0">
                <p id="parsing-status-step" className="text-xs font-semibold text-stone-800 truncate mb-0.5">
                  {statusMessage}
                </p>
                <p className="text-[10px] text-stone-400">
                  {videoFile ? videoFile.name : 'Unknown filename'} ({videoFile ? formatSize(videoFile.size) : '0 MB'})
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 4: Completed Live Video Player */}
        {currentVideo && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Embedded theater frame */}
            <div className="relative rounded-xl overflow-hidden aspect-video bg-black shadow-lg border border-stone-200 group">
              <video
                id="birthday-theatre-video-player"
                src={currentVideo.url}
                controls
                className="w-full h-full object-contain"
                poster=""
              />
              <div className="absolute top-3 left-3 bg-stone-900/60 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] text-amber-300 font-bold tracking-wide uppercase pointer-events-none flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" /> Celebration Theater
              </div>
            </div>

            {/* Completion details and reset action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50 border border-stone-200/70 p-4 rounded-xl">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 truncate max-w-[200px] sm:max-w-sm">
                    {currentVideo.name}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Size: {formatSize(currentVideo.size)} • Transcoded ready
                  </p>
                </div>
              </div>
              <button
                id="reset-video-btn"
                onClick={handleReset}
                className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 hover:border-stone-300 bg-white px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer min-h-[38px] flex items-center gap-1 shrink-0"
              >
                Upload Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
