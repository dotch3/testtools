"use client"

import { useState, useRef, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ImagePreview } from "./ImagePreview"
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Paperclip,
  Download,
} from "lucide-react"

interface Attachment {
  id: string
  fileName: string
  fileType: string
  fileSizeKb: number
}

interface EvidenceManagerProps {
  entityType: "test_case" | "bug" | "test_execution"
  entityId: string
  projectId: string
  suiteId?: string
  onEvidenceChange?: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function isImageFile(fileType: string): boolean {
  return fileType.startsWith("image/")
}

async function loadImageWithAuth(url: string): Promise<string> {
  const token = localStorage.getItem("access_token")
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) throw new Error("Failed to load image")
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export function EvidenceManager({
  entityType,
  entityId,
  projectId,
  suiteId,
  onEvidenceChange,
}: EvidenceManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number>(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const isNewEntity = entityId === "pending-new" || !entityId

  useEffect(() => {
    const loadImages = async () => {
      const urls: Record<string, string> = {}
      for (const att of attachments) {
        if (isImageFile(att.fileType)) {
          try {
            urls[att.id] = await loadImageWithAuth(`${API_URL}/evidence/${att.id}/file`)
          } catch (err) {
            console.error("Failed to load image:", att.fileName, err)
          }
        }
      }
      setImageUrls(urls)
    }
    if (attachments.length > 0) {
      loadImages()
    }
    return () => {
      Object.values(imageUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [attachments])

  const loadEvidence = async () => {
    if (isNewEntity) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const endpoint =
        entityType === "test_case"
          ? `/suites/${suiteId || 'placeholder'}/cases/${entityId}/evidence`
          : entityType === "bug"
          ? `/projects/${projectId}/bugs/${entityId}/evidence`
          : `/executions/${entityId}/evidence`

      const data = await api.get<Attachment[]>(endpoint)
      setAttachments(data)
    } catch (err) {
      console.error("Failed to load evidence:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEvidence()
  }, [entityType, entityId])

  const handleUpload = async (files: FileList | File[]) => {
    if (isNewEntity) return
    
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setIsUploading(true)
    try {
      for (const file of fileArray) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", entityType)
        formData.append("entityId", entityId)
        if (projectId) formData.append("projectId", projectId)

        const response = await fetch(`${API_URL}/evidence/upload`, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Upload failed:", response.status, errorText)
          throw new Error(`Failed to upload file: ${response.status}`)
        }

        const attachment = await response.json()
        setAttachments((prev) => [attachment, ...prev])
      }
      onEvidenceChange?.()
    } catch (err) {
      console.error("Failed to upload evidence:", err)
      alert("Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const endpoint =
        entityType === "test_case"
          ? `/suites/${suiteId || 'placeholder'}/cases/${entityId}/evidence/${attachmentId}`
          : entityType === "bug"
          ? `/projects/${projectId}/bugs/${entityId}/evidence/${attachmentId}`
          : `/executions/${entityId}/evidence/${attachmentId}`

      await api.delete(endpoint)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      onEvidenceChange?.()
    } catch (err) {
      console.error("Failed to delete evidence:", err)
      alert("Failed to delete file")
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    const token = localStorage.getItem("access_token")
    try {
      const response = await fetch(`${API_URL}/evidence/${attachment.id}/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = attachment.fileName
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  const openPreview = (index: number) => {
    const imageAttachments = attachments.filter((a) => isImageFile(a.fileType))
    const imageIndex = imageAttachments.findIndex(
      (a) => a.id === attachments[index].id
    )
    setPreviewIndex(imageIndex >= 0 ? imageIndex : index)
    setPreviewOpen(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const imageAttachments = attachments.filter((a) => isImageFile(a.fileType))
  const otherAttachments = attachments.filter(
    (a) => !isImageFile(a.fileType)
  )

  return (
    <div className="space-y-4">
      {isNewEntity ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center bg-muted/30">
          <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Save the test case first, then you can add attachments
          </p>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, files, logs (max 10MB)
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground">
          Loading evidence...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No evidence attached</p>
        </div>
      ) : (
        <>
          {imageAttachments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {imageAttachments.map((attachment, idx) => {
                const originalIdx = attachments.findIndex(
                  (a) => a.id === attachment.id
                )
                return (
                  <div
                    key={attachment.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border bg-card"
                  >
                    {imageUrls[attachment.id] ? (
                      <img
                        src={imageUrls[attachment.id]}
                        alt={attachment.fileName}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openPreview(originalIdx)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => openPreview(originalIdx)}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => handleDownload(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-xs text-white truncate">
                        {attachment.fileName}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {otherAttachments.length > 0 && (
            <div className="space-y-2">
              {otherAttachments.map((attachment) => {
                const originalIdx = attachments.findIndex(
                  (a) => a.id === attachment.id
                )
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.fileSizeKb)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {imageAttachments.length > 0 && (
        <ImagePreview
          attachments={attachments}
          currentIndex={previewIndex}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onNavigate={setPreviewIndex}
          apiUrl={API_URL}
        />
      )}
    </div>
  )
}
