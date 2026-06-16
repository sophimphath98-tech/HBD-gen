/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles, Smile, Star, Trash2, Edit3, MessageCircle, Link2, Check } from 'lucide-react';
import { BirthdayCard } from '../types';

interface BirthdayCardsProps {
  cards: BirthdayCard[];
  onEdit: (card: BirthdayCard) => void;
  onDelete: (id: string) => void;
  currentUserId?: string | null;
  highlightedCardId?: string | null;
}

const COLOR_PRESET_MAP: Record<string, string> = {
  'rose-gold': 'bg-gradient-to-br from-rose-100/70 via-amber-50/50 to-rose-200/50 border-rose-200/60 shadow-rose-100/40',
  'starry-gold': 'bg-gradient-to-br from-amber-100/60 via-orange-50/50 to-amber-200/40 border-amber-300/60 shadow-amber-100/40',
  'champagne-silk': 'bg-gradient-to-br from-amber-50/70 to-orange-100/50 border-stone-200/60 shadow-stone-100/30',
  'lavender-mist': 'bg-gradient-to-br from-purple-100/65 to-rose-100/50 border-purple-200/60 shadow-purple-100/30',
  'coral-breeze': 'bg-gradient-to-br from-rose-100/70 to-orange-100/50 border-orange-200/60 shadow-orange-100/30',
};

// Gets decorative preset icons
function getDecorIcon(id: string) {
  const index = id.charCodeAt(0) % 5;
  switch (index) {
    case 0: return <Heart className="text-rose-400 group-hover:scale-110 transition-transform" size={24} />;
    case 1: return <Sparkles className="text-amber-400 animate-pulse" size={24} />;
    case 2: return <Smile className="text-amber-500" size={24} />;
    case 3: return <Star className="text-orange-400 rotate-12" size={24} />;
    default: return <MessageCircle className="text-rose-400" size={24} />;
  }
}

export function BirthdayCards({ cards, onEdit, onDelete, currentUserId, highlightedCardId }: BirthdayCardsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (cardId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?card=${cardId}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          setCopiedId(cardId);
          setTimeout(() => setCopiedId(null), 2500);
        }).catch(() => {
          fallbackCopyText(shareUrl, cardId);
        });
      } else {
        fallbackCopyText(shareUrl, cardId);
      }
    } catch (err) {
      fallbackCopyText(shareUrl, cardId);
    }
  };

  const fallbackCopyText = (text: string, cardId: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedId(cardId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  if (cards.length === 0) {
    return (
      <div id="empty-cards-state" className="text-center py-16 px-4 bg-stone-50 border border-stone-200/80 rounded-2xl max-w-md mx-auto">
        <Sparkles className="mx-auto text-amber-300 mb-3 animate-spin duration-3000" size={40} />
        <h4 className="font-serif text-lg font-medium text-stone-800">No memories placed yet</h4>
        <p className="text-sm text-stone-500 mt-1 max-w-xs mx-auto">
          Be the first to leave a happy memory, deep wish, or precious photo for them!
        </p>
      </div>
    );
  }

  // Animation constants for layout transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 120
      }
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
  };

  return (
    <motion.div
      id="cards-grid-layout"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
    >
      {cards.map((card) => {
        const presetClass = COLOR_PRESET_MAP[card.presetColor || 'rose-gold'] || COLOR_PRESET_MAP['rose-gold'];
        const canEdit = !!(currentUserId && (card.authorId === currentUserId || card.authorId === 'system-default'));
        const canDelete = !!(currentUserId && card.authorId === currentUserId);
        const isHighlighted = card.id === highlightedCardId;

        return (
          <motion.div
            key={card.id}
            id={`birthday-card-${card.id}`}
            variants={cardVariants}
            layoutId={`card-layout-${card.id}`}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-5 md:p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 flex flex-col justify-between ${presetClass} ${
              isHighlighted ? 'ring-4 ring-amber-500/80 shadow-2xl border-amber-400 scale-[1.03] z-10' : ''
            }`}
          >
            {/* Soft decorative blur behind images */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-amber-400/10 to-rose-400/0 blur-2xl pointer-events-none group-hover:from-amber-400/20 group-hover:to-rose-400/10 transition-all duration-500" />

            <div>
              {/* Media Holder */}
              {card.imageUrl ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 bg-stone-900/5 group-hover:shadow-sm transition-all">
                  <img
                    referrerPolicy="no-referrer"
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover transform duration-500 ease-out group-hover:scale-103"
                  />
                  <div className="absolute top-2 left-2 bg-white/70 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
                    {getDecorIcon(card.id)}
                    <span className="text-[10px] uppercase font-bold text-stone-700 tracking-wider">Memory Photo</span>
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center mb-4 border border-stone-200/40">
                  {getDecorIcon(card.id)}
                </div>
              )}

              {/* Card Meta Content */}
              <h4 className="font-serif text-lg md:text-xl font-bold text-stone-800 tracking-tight leading-snug mb-2 group-hover:text-stone-900 transition-colors">
                {card.title}
              </h4>
              <p className="text-sm text-stone-600 leading-relaxed font-normal whitespace-pre-wrap">
                {card.description}
              </p>
            </div>

            {/* Bottom control strip */}
            <div className="border-t border-stone-500/10 pt-4 mt-5">
              {card.authorName && (
                <div id="author-byline" className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-2">
                  by {card.authorName}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400 font-medium">
                  {new Date(card.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>

                <div className="flex items-center gap-1">
                  {/* Share/Copy Link Action */}
                  <button
                    id={`copy-card-link-btn-${card.id}`}
                    onClick={() => handleCopyLink(card.id)}
                    className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center relative group/copybtn"
                    title="Copy direct memory link"
                  >
                    {copiedId === card.id ? (
                      <Check size={14} className="text-emerald-600 animate-pulse font-extrabold" />
                    ) : (
                      <Link2 size={14} />
                    )}
                    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-stone-50 text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover/copybtn:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {copiedId === card.id ? 'Copied!' : 'Copy Link'}
                    </span>
                  </button>

                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1 border-l border-stone-200/50 pl-1 ml-1">
                      {canEdit && (
                        <button
                          id={`edit-card-btn-${card.id}`}
                          onClick={() => onEdit(card)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Modify Memory"
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          id={`delete-card-btn-${card.id}`}
                          onClick={() => onDelete(card.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Remove Memory"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
