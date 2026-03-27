"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react"

interface Attachment {
  id: string
  fileName: string
  fileType: string
  fileSizeKb: number
}

interface ImagePreviewProps {
  attachments: Attachment[]
  currentIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (index: number) => void
  apiUrl: string
}

export function ImagePreview({
  attachments,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
  apiUrl,
}: ImagePreviewProps) {
  const current = attachments[currentIndex]
  const isImage = current?.fileType?.startsWith("image/")
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!current || !isImage || !open) {
      setImageUrl(null)
      return
    }

    const loadImage = async () => {
      const token = localStorage.getItem("access_token")
      try {
        const response = await fetch(`${apiUrl}/evidence/${current.id}/file`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setImageUrl(url)
        }
      } catch (err) {
        console.error("Failed to load image:", err)
      }
    }

    loadImage()

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [current, isImage, open, apiUrl])

  const handleDownload = async () => {
    if (!current) return
    const token = localStorage.getItem("access_token")
    try {
      const response = await fetch(`${apiUrl}/evidence/${current.id}/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = current.fileName
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto h-auto p-0 bg-black/90 border-none">
        <DialogTitle className="sr-only">{current.fileName}</DialogTitle>
        <DialogDescription className="sr-only">Image preview — {current.fileName}</DialogDescription>
        <div className="relative flex items-center justify-center w-full h-full min-h-[60vh] min-w-[60vw]">
          {attachments.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 h-12 w-12 bg-black/50 text-white hover:bg-black/70"
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          <div className="flex items-center justify-center p-4">
            {isImage ? (
              imageUrl ? (
                <img
                  src={imageUrl}
                  alt={current.fileName}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : (
                <div className="text-white">Loading...</div>
              )
            ) : (
              <div className="text-white text-center p-8">
                <p className="text-lg">Preview not available</p>
                <p className="text-sm text-gray-400">{current.fileType}</p>
              </div>
            )}
          </div>

          {attachments.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 h-12 w-12 bg-black/50 text-white hover:bg-black/70"
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === attachments.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 h-10 w-10 bg-black/50 text-white hover:bg-black/70"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
            {currentIndex + 1} / {attachments.length} - {current.fileName}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
