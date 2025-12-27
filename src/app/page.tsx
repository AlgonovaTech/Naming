"use client";

import { useState, useCallback, useRef } from "react";

type FileStatus = "ready" | "uploading" | "uploaded" | "error";

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  creativeId?: number;
  rowIndex?: number;
  error?: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFiles = useCallback(async () => {
    const readyFiles = files.filter((f) => f.status === "ready");
    if (readyFiles.length === 0) return;

    setIsUploading(true);
    setSuccessMessage(null);

    // Mark all as uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "ready" ? { ...f, status: "uploading" as FileStatus } : f
      )
    );

    try {
      const formData = new FormData();
      readyFiles.forEach((fileItem) => {
        formData.append("files", fileItem.file);
      });

      const response = await fetch("/api/upload-creatives", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "ok") {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.status === "uploading") {
              const result = data.results.find(
                (r: { name: string }) => r.name === f.file.name
              );
              if (result) {
                return {
                  ...f,
                  status: "uploaded" as FileStatus,
                  creativeId: result.creativeId,
                  rowIndex: result.rowIndex,
                };
              }
            }
            return f;
          })
        );
        setSuccessMessage(
          "Creatives sent. Naming will appear in sheet automatically."
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "uploading"
              ? { ...f, status: "error" as FileStatus, error: data.error }
              : f
          )
        );
      }
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading"
            ? {
                ...f,
                status: "error" as FileStatus,
                error: err instanceof Error ? err.message : "Upload failed",
              }
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

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-medium mb-8 text-center">Creative Upload</h1>

      {/* Drop Zone */}
      <div
        className={`
          border border-gray-200 rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-150
          ${isDragging ? "border-gray-400 bg-gray-50" : "hover:border-gray-300"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-gray-500 text-sm">
          Drop files here or click to select
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Images and videos (1-20 files)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="border border-gray-200 rounded-lg p-4 relative"
              >
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 text-lg leading-none"
                  disabled={fileItem.status === "uploading"}
                >
                  ×
                </button>
                <p className="text-sm truncate pr-6 mb-2">{fileItem.file.name}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {(fileItem.file.size / 1024).toFixed(1)} KB
                </p>
                <StatusBadge
                  status={fileItem.status}
                  creativeId={fileItem.creativeId}
                  error={fileItem.error}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={uploadFiles}
            disabled={!hasReadyFiles || isUploading}
            className={`
              px-6 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                hasReadyFiles && !isUploading
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mt-6 text-center">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}
    </main>
  );
}

function StatusBadge({
  status,
  creativeId,
  error,
}: {
  status: FileStatus;
  creativeId?: number;
  error?: string;
}) {
  const styles: Record<FileStatus, string> = {
    ready: "bg-gray-100 text-gray-600",
    uploading: "bg-blue-50 text-blue-600",
    uploaded: "bg-green-50 text-green-600",
    error: "bg-red-50 text-red-600",
  };

  const labels: Record<FileStatus, string> = {
    ready: "ready",
    uploading: "uploading…",
    uploaded: creativeId ? `ID: ${creativeId}` : "uploaded",
    error: error || "error",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs ${styles[status]}`}
      title={error}
    >
      {labels[status]}
    </span>
  );
}

