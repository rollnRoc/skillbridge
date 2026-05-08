"use client";

import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { AbovePanel } from "../ui/AbovePanel";
import { uploadDocument } from "../../lib/documents.api";
import { getApiErrorMessage } from "../../lib/api-client";

export function UploadPanel({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setUploading(true);
    setProgress(0);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));
    const iv = setInterval(() => setProgress((p) => Math.min(p + 12, 88)), 180);
    try {
      await uploadDocument(formData);
      setProgress(100);
      setTimeout(() => { onUploaded(); onClose(); }, 350);
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Yükleme sırasında hata oluştu. API bağlantısı veya dosya formatını kontrol edin."
        )
      );
      setUploading(false);
    } finally {
      clearInterval(iv);
    }
  };

  return (
    <AbovePanel
      title="Doküman Yükle"
      icon={Upload}
      iconColor="text-indigo-600"
      onClose={onClose}
      width={520}
    >
      <div className="p-5">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-400"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.pptx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700 text-sm">
            Sürükleyin veya <span className="text-indigo-600 underline cursor-pointer">seçin</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF · DOCX · TXT · PPTX &nbsp;·&nbsp; Maks 20 MB</p>
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Yükleniyor… {progress}%</p>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-3">{error}</p>}
      </div>
    </AbovePanel>
  );
}
