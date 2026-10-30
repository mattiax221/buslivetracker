"use client";

import { useState } from "react";
import { X, Check, Copy, Share2, Send, MessageCircle } from "lucide-react";
import { ShareData, getWhatsAppShareUrl, getTelegramShareUrl, copyToClipboard } from "../lib/shareUtils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareData | null;
  hosted?: boolean;
}

export default function ShareModal({ isOpen, onClose, data, hosted = false }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = async () => {
    const fullText = `${data.text}\n\n📍 ${data.url}`;
    const success = await copyToClipboard(fullText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });
        onClose();
      } catch {
        // Ignored
      }
    }
  };

  const waUrl = getWhatsAppShareUrl(data);
  const tgUrl = getTelegramShareUrl(data);

  const panel = (
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">{data.title}</h3>
              <p className="text-[11px] text-gray-400">Condividi arrivi e percorsi in tempo reale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 bg-gray-50/80 m-4 rounded-2xl border border-gray-100 text-xs text-gray-700 font-sans whitespace-pre-line leading-relaxed">
          {data.text}
          <div className="mt-2 text-[11px] text-blue-600 font-semibold truncate">
            {data.url}
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="p-4 pt-0 space-y-2.5">
          {/* WhatsApp */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Condividi su WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-[#229ED9] hover:bg-[#1f8ec3] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Send className="w-5 h-5 fill-current" />
            <span>Condividi su Telegram</span>
          </a>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                copied
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-500" />
                  <span>Copia Testo & Link</span>
                </>
              )}
            </button>

            {/* Native Mobile Share if supported */}
            {typeof navigator !== "undefined" && "share" in navigator ? (
              <button
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Altre App...</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="py-2.5 px-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                Chiudi
              </button>
            )}
          </div>
        </div>
      </div>
  );

  if (hosted) return panel;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 animate-in fade-in duration-200">
      {panel}
    </div>
  );
}

