import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const BASE_URL =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '/api'

interface FileUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
  accept?: string
  label?: string
}

export function FileUpload({
  value,
  onChange,
  accept = 'image/*,.pdf',
  label,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null)
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const token = localStorage.getItem('accessToken')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${BASE_URL}/uploads`, {
          method: 'POST',
          headers,
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ message: res.statusText }))
          throw new Error(data.message ?? 'Upload failed')
        }

        const data = await res.json()
        onChange(data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [onChange],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const isImage = value && /\.(jpg|jpeg|png|gif|webp)$/i.test(value)
  const filename = value?.split('/').pop()

  if (value) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          {isImage ? (
            <Image className="h-4 w-4 shrink-0 text-indigo-500" />
          ) : (
            <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
            {filename}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onChange(undefined)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isImage && (
          <img
            src={value}
            alt="Preview"
            className="h-24 w-auto rounded border object-cover"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 transition-colors ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        ) : (
          <Upload className="h-6 w-6 text-slate-400" />
        )}
        <p className="mt-2 text-xs text-slate-500">
          {uploading ? 'Uploading...' : 'Click or drag file to upload'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
