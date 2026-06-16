/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image, Sparkles } from 'lucide-react';
import { BirthdayCard } from '../types';

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: any) => void;
  editingCard?: BirthdayCard | null;
}

const COLOR_PRESETS = [
  { id: 'rose-gold', label: 'Rose Gold Glow', value: 'from-rose-100 to-amber-100 border-rose-200 text-stone-800' },
  { id: 'starry-gold', label: 'Starry Gold', value: 'from-amber-100 via-orange-50 to-amber-200 border-amber-300 text-stone-800' },
  { id: 'champagne-silk', label: 'Champagne Silk', value: 'from-amber-50 to-orange-100 border-stone-200 text-stone-800' },
  { id: 'lavender-mist', label: 'Lavender Mist', value: 'from-purple-100 to-rose-100 border-purple-200 text-stone-800' },
  { id: 'coral-breeze', label: 'Coral Breeze', value: 'from-rose-100 to-orange-100 border-orange-200 text-stone-800' },
];

export function CardEditorModal({ isOpen, onClose, onSave, editingCard }: CardEditorModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [presetColor, setPresetColor] = useState('rose-gold');
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state with editing card
  useEffect(() => {
    if (editingCard) {
      setTitle(editingCard.title);
      setDescription(editingCard.description);
      setPresetColor(editingCard.presetColor || 'rose-gold');
      setImagePreview(editingCard.imageUrl);
    } else {
      setTitle('');
      setDescription('');
      setPresetColor('rose-gold');
      setImagePreview(undefined);
    }
  }, [editingCard, isOpen]);

  const [isCompressing, setIsCompressing] = useState(false);

  const compressAndSetImage = (file: File) => {
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800; // Downscale to maximum 800px width/height
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImagePreview(event.target?.result as string);
          setIsCompressing(false);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG format with 0.7 quality to reduce file size to ~30-85KB
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImagePreview(compressedBase64);
        setIsCompressing(false);
      };
      img.onerror = () => {
        setImagePreview(event.target?.result as string);
        setIsCompressing(false);
      };
    };
    reader.onerror = () => {
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSetImage(file);
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
    if (file && file.type.startsWith('image/')) {
      compressAndSetImage(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onSave({
      id: editingCard?.id || Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      description: description.trim(),
      imageUrl: imagePreview,
      presetColor,
    });
    
    setTitle('');
    setDescription('');
    setImagePreview(undefined);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            id="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />

          {/* Dialog Panel */}
          <motion.div
            id="card-editor-modal-container"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-stone-50 rounded-2xl border border-stone-200 p-6 md:p-8 shadow-2xl overflow-hidden z-10"
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-300 via-amber-300 to-yellow-300" />
            
            <button
              id="close-modal-btn"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <h3 id="modal-heading" className="font-serif text-2xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
              <Sparkles className="text-amber-500 animate-pulse" size={22} />
              {editingCard ? 'Refining This Memory' : 'Adding a Memory Card'}
            </h3>

            <form id="card-editor-form" onSubmit={handleFormSubmit} className="space-y-5">
              {/* Title Input */}
              <div>
                <label htmlFor="card-title-field" className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Card Title
                </label>
                <input
                  id="card-title-field"
                  type="text"
                  required
                  placeholder="e.g. Her Sweet Smile, Radiant Summer Day..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all min-h-[44px]"
                />
              </div>

              {/* Description Input */}
              <div>
                <label htmlFor="card-desc-field" className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Sweet Description
                </label>
                <textarea
                  id="card-desc-field"
                  required
                  rows={3}
                  placeholder="Tell the beautiful story or write down a beautiful wish..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Memory Photo (Optional)
                </label>
                <div
                  id="image-dropzone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={isCompressing ? undefined : triggerFileSelect}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isCompressing
                      ? 'border-amber-400 bg-amber-50/20 cursor-wait animate-pulse'
                      : isDragging 
                        ? 'border-amber-400 bg-amber-50/50' 
                        : imagePreview 
                          ? 'border-stone-300 bg-stone-100' 
                          : 'border-stone-200 hover:border-amber-300 hover:bg-stone-100/50'
                  }`}
                >
                  <input
                    id="modal-image-file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    disabled={isCompressing}
                    className="hidden"
                  />

                  {isCompressing ? (
                    <div className="py-4 flex flex-col items-center justify-center text-amber-600">
                      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs font-semibold">Optimizing custom photo...</p>
                      <p className="text-[10px] text-stone-400 mt-1">Trimming dimensions & bytes for instant cloud delivery</p>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative group max-h-40 overflow-hidden rounded-lg flex items-center justify-center">
                      <img
                        referrerPolicy="no-referrer"
                        src={imagePreview}
                        alt="Preview"
                        className="object-cover max-h-36 max-w-full rounded-md shadow-sm transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <p className="text-white text-xs font-medium flex items-center gap-1">
                          <Image size={14} /> Replace Photo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 flex flex-col items-center justify-center text-stone-500">
                      <Upload size={24} className="mb-2 text-stone-400" />
                      <p className="text-xs font-medium text-stone-700">Drag & drop photo here or click to browse</p>
                      <p className="text-[10px] text-stone-400 mt-1">Accepts PNG, JPG, WEBP, GIF</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Color Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
                  Aesthetic Card Theme
                </label>
                <div id="preset-color-options" className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      id={`preset-color-${preset.id}`}
                      type="button"
                      onClick={() => setPresetColor(preset.id)}
                      className={`px-3 py-2 text-xs rounded-lg text-left border font-medium transition-all cursor-pointer min-h-[44px] flex items-center gap-2 ${
                        presetColor === preset.id
                          ? 'border-stone-800 bg-stone-900 text-stone-50 ring-2 ring-stone-900/10 scale-[1.02]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${preset.value.split(' ').slice(0, 2).join(' ')}`} />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 pt-4 border-t border-stone-100">
                <button
                  id="cancel-modal-btn"
                  type="button"
                  onClick={onClose}
                  disabled={isCompressing}
                  className="flex-1 border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-800 font-medium py-3 rounded-xl transition-colors min-h-[44px] cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nevermind
                </button>
                <button
                  id="save-modal-btn"
                  type="submit"
                  disabled={!title.trim() || !description.trim() || isCompressing}
                  className="flex-1 bg-stone-900 text-stone-50 hover:bg-stone-800 focus:ring-4 focus:ring-stone-900/20 font-medium py-3 rounded-xl transition-colors min-h-[44px] cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCompressing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-stone-50 border-t-transparent rounded-full animate-spin" />
                      Optimizing...
                    </>
                  ) : editingCard ? (
                    'Apply Edits'
                  ) : (
                    'Place Card'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
