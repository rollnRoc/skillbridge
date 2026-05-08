"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { getUnifiedModalStyle } from "./modal-layout";

/**
 * Tam ekran karartma + ortada modal. Dashboard’daki kartların üstünde
 * `absolute` ile kaybolan panel yerine her zaman viewport ortasında görünür.
 */
export function AbovePanel({
  title,
  icon: Icon,
  iconColor,
  badge,
  onClose,
  children,
  width = 640,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  badge?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  void width;
  return (
    <AnimatePresence>
      <motion.div
        key="above-backdrop"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          key="above-panel"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 z-[10000] overflow-hidden flex flex-col"
          style={getUnifiedModalStyle()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Icon style={{ width: 18, height: 18 }} className={`flex-shrink-0 ${iconColor}`} />
              <h3 className="font-semibold text-[#1A2E5A] text-sm truncate">{title}</h3>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {badge}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
