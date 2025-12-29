"use client";

import { useState, useCallback, useRef } from "react";

type FileStatus = "ready" | "uploading" | "uploaded" | "error" | "compressing";
type Region = "indonesia" | "latam" | null;

interface CreativeData {
  type: string;
  nameOfHypothesis: string;
  aiFlag: string;
  style: string;
  mainTon: string;
  mainObject: string;
  headerText: string;
  uvp: string;
  product: string;
  offer: string;
}

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  creativeId?: number;
  rowIndex?: number;
  titleId?: number;
  error?: string;
  data?: CreativeData;
}

// Options for each field
const OPTIONS = {
  type: ["static", "video"],
  aiFlag: ["made AI", "not AI"],
  style: ["Real", "3D", "Illustration", "Minecraft style", "Pixar style", "Cartoon", "Other"],
  mainTon: ["bright", "light", "dark", "soft", "neutral"],
  mainObject: ["city", "boy", "girl", "boy_girl", "statue", "building", "object", "people", "offline", "none", "other"],
  uvp: ["direct_sale", "pain_point", "benefit", "FOMO", "social_proof", "other"],
  product: ["math_course", "programming_course", "english_course", "subscription", "other"],
  offer: ["free_lesson", "masterclass", "webinar", "free_course", "discount", "trial", "other"],
};

// Compress image to max 2MB while maintaining quality
async function compressImage(file: File, maxSizeMB = 2): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxSizeMB * 1024 * 1024) return file;
  
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    img.onload = () => {
      let { width, height } = img;
      const maxDimension = 2000;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
              return;
            }
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          },
          "image/jpeg",
          quality
        );
      };
      tryCompress();
    };
    
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileItems: FileItem[] = Array.from(newFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "ready" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...fileItems]);
    setSuccessMessage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFileData = useCallback(async (
    fileId: string,
    field: keyof CreativeData,
    value: string
  ) => {
    const fileItem = files.find(f => f.id === fileId);
    if (!fileItem?.data || !fileItem.rowIndex || !fileItem.creativeId) return;

    const newData = { ...fileItem.data, [field]: value };
    
    // Update local state immediately
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, data: newData } : f
      )
    );

    // Update in Google Sheets
    try {
      await fetch("/api/update-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: fileItem.rowIndex,
          creativeId: fileItem.creativeId,
          ...newData,
        }),
      });
    } catch (err) {
      console.error("Failed to update:", err);
    }
  }, [files]);

  const uploadFiles = useCallback(async () => {
    const readyFiles = files.filter((f) => f.status === "ready");
    if (readyFiles.length === 0) return;

    setIsUploading(true);
    setSuccessMessage(null);

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "ready" ? { ...f, status: "compressing" as FileStatus } : f
      )
    );

    try {
      const compressedFiles: { id: string; file: File }[] = [];
      for (const fileItem of readyFiles) {
        const compressed = await compressImage(fileItem.file);
        compressedFiles.push({ id: fileItem.id, file: compressed });
      }
      
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "compressing" ? { ...f, status: "uploading" as FileStatus } : f
        )
      );

      const formData = new FormData();
      compressedFiles.forEach(({ file }) => formData.append("files", file));
      formData.append("region", selectedRegion || "");

      const response = await fetch("/api/upload-creatives", {
        method: "POST",
        body: formData,
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        throw new Error(`Server error: ${response.status}`);
      }

      if (responseData.status === "ok") {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.status === "uploading") {
              const result = responseData.results.find(
                (r: { name: string; creativeId: number; rowIndex: number; titleId?: number; data?: CreativeData }) => 
                  r.name === f.file.name
              );
              if (result) {
                return {
                  ...f,
                  status: "uploaded" as FileStatus,
                  creativeId: result.creativeId,
                  rowIndex: result.rowIndex,
                  titleId: result.titleId,
                  data: result.data,
                };
              }
            }
            return f;
          })
        );
        setSuccessMessage("Creatives uploaded! Adjust parameters below if needed.");
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "uploading" ? { ...f, status: "error" as FileStatus, error: responseData.error } : f
          )
        );
      }
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading" || f.status === "compressing"
            ? { ...f, status: "error" as FileStatus, error: err instanceof Error ? err.message : "Upload failed" }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [files]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setSuccessMessage(null);
  }, []);

  const hasReadyFiles = files.some((f) => f.status === "ready");
  const canUpload = hasReadyFiles && selectedRegion !== null;

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-medium mb-8 text-center">Creative Upload</h1>

      {/* Region Selector */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-3 text-center">Select region before upload:</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setSelectedRegion("indonesia")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              selectedRegion === "indonesia"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🇮🇩 Indonesia
          </button>
          <button
            onClick={() => setSelectedRegion("latam")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              selectedRegion === "latam"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🌎 Latam
          </button>
        </div>
      </div>

      <div
        className={`border border-gray-200 rounded-lg p-12 text-center cursor-pointer transition-colors duration-150 ${
          isDragging ? "border-gray-400 bg-gray-50" : "hover:border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-gray-500 text-sm">Drop files here or click to select</p>
        <p className="text-gray-400 text-xs mt-2">Images and videos (1-20 files)</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearAll}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-4">
            {files.map((fileItem) => (
              <FileCard
                key={fileItem.id}
                fileItem={fileItem}
                onRemove={() => removeFile(fileItem.id)}
                onUpdateData={(field, value) => updateFileData(fileItem.id, field, value)}
              />
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6 text-center">
          {!selectedRegion && hasReadyFiles && (
            <p className="text-sm text-amber-600 mb-3">⚠️ Please select a region above</p>
          )}
          <button
            onClick={uploadFiles}
            disabled={!canUpload || isUploading}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              canUpload && !isUploading
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isUploading ? "Processing..." : `Upload to ${selectedRegion === "indonesia" ? "🇮🇩 Indonesia" : selectedRegion === "latam" ? "🌎 Latam" : "..."}`}
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mt-6 text-center">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}
    </main>
  );
}

function FileCard({
  fileItem,
  onRemove,
  onUpdateData,
}: {
  fileItem: FileItem;
  onRemove: () => void;
  onUpdateData: (field: keyof CreativeData, value: string) => void;
}) {
  const isUploaded = fileItem.status === "uploaded" && fileItem.data;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-medium truncate max-w-xs">{fileItem.file.name}</p>
          <p className="text-xs text-gray-400">
            {(fileItem.file.size / 1024 / 1024).toFixed(1)} MB
            {fileItem.creativeId && ` · V_ID: ${fileItem.creativeId}`}
            {fileItem.titleId && ` · Title_ID: ${fileItem.titleId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={fileItem.status} error={fileItem.error} />
          <button
            onClick={onRemove}
            className="text-gray-300 hover:text-gray-500 text-lg leading-none"
            disabled={fileItem.status === "uploading" || fileItem.status === "compressing"}
          >
            ×
          </button>
        </div>
      </div>

      {isUploaded && fileItem.data && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Visual parameters */}
          <div className="text-xs text-gray-500 font-medium mt-2 mb-1">Visual</div>
          <ChipRow
            label="type"
            value={fileItem.data.type}
            options={OPTIONS.type}
            onChange={(v) => onUpdateData("type", v)}
          />
          <ChipRowInput
            label="hypothesis"
            value={fileItem.data.nameOfHypothesis}
            onChange={(v) => onUpdateData("nameOfHypothesis", v)}
          />
          <ChipRow
            label="made_ai"
            value={fileItem.data.aiFlag}
            options={OPTIONS.aiFlag}
            onChange={(v) => onUpdateData("aiFlag", v)}
          />
          <ChipRow
            label="style"
            value={fileItem.data.style}
            options={OPTIONS.style}
            onChange={(v) => onUpdateData("style", v)}
          />
          <ChipRow
            label="main_ton"
            value={fileItem.data.mainTon}
            options={OPTIONS.mainTon}
            onChange={(v) => onUpdateData("mainTon", v)}
          />
          <ChipRow
            label="main_object"
            value={fileItem.data.mainObject}
            options={OPTIONS.mainObject}
            onChange={(v) => onUpdateData("mainObject", v)}
          />
          
          {/* Marketing parameters */}
          <div className="text-xs text-gray-500 font-medium mt-4 mb-1">Marketing</div>
          <ChipRowInput
            label="header_text"
            value={fileItem.data.headerText}
            onChange={(v) => onUpdateData("headerText", v)}
          />
          <ChipRow
            label="uvp"
            value={fileItem.data.uvp}
            options={OPTIONS.uvp}
            onChange={(v) => onUpdateData("uvp", v)}
          />
          <ChipRow
            label="product"
            value={fileItem.data.product}
            options={OPTIONS.product}
            onChange={(v) => onUpdateData("product", v)}
          />
          <ChipRow
            label="offer"
            value={fileItem.data.offer}
            options={OPTIONS.offer}
            onChange={(v) => onUpdateData("offer", v)}
          />
        </div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              value === opt
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipRowInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleSubmit = () => {
    if (inputValue.trim() && inputValue !== value) {
      onChange(inputValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="px-2 py-0.5 rounded text-xs border border-gray-300 focus:outline-none focus:border-gray-500 flex-1 max-w-xs"
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setInputValue(value); setIsEditing(true); }}
          className="px-2 py-0.5 rounded text-xs bg-gray-900 text-white hover:bg-gray-800 max-w-xs truncate"
          title={value}
        >
          {value}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status, error }: { status: FileStatus; error?: string }) {
  const styles: Record<FileStatus, string> = {
    ready: "bg-gray-100 text-gray-600",
    compressing: "bg-yellow-50 text-yellow-600",
    uploading: "bg-blue-50 text-blue-600",
    uploaded: "bg-green-50 text-green-600",
    error: "bg-red-50 text-red-600",
  };

  const labels: Record<FileStatus, string> = {
    ready: "ready",
    compressing: "compressing…",
    uploading: "uploading…",
    uploaded: "uploaded",
    error: error || "error",
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${styles[status]}`} title={error}>
      {labels[status]}
    </span>
  );
}
