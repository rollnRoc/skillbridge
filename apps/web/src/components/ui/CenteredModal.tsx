"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { getUnifiedModalStyle } from "./modal-layout";

export function CenteredModal({
  title,
  icon: Icon,
  iconColor,
  badge,
  onClose,
  children,
  width = 1100,
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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return (
    createPortal(
      <AnimatePresence>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6"
          onClick={onClose}
        >
          {/* Panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            style={getUnifiedModalStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Icon style={{ width: 18, height: 18 }} className={iconColor} />
                <h3 className="font-semibold text-[#1A2E5A] text-sm">{title}</h3>
              </div>
              <div className="flex items-center gap-3">
                {badge}
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {children}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )
  );
}
