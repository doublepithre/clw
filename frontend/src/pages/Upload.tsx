import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload as UploadIcon,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  CloudUpload,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'

interface UploadJob {
  id: string
  fileName: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
}

interface RecentUpload {
  id: string
  fileName: string
  candidateName: string
  status: string
  createdAt: string
}

export default function Upload() {
  const queryClient = useQueryClient()
  const [dragActive, setDragActive] = useState(false)
  const [uploads, setUploads] = useState<UploadJob[]>([])

  const { data: recentUploads } = useQuery({
    queryKey: ['recent-uploads'],
    queryFn: () => api.get<RecentUpload[]>('/uploads/recent'),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('resume', file)
      return api.upload<{ id: string }>('/candidates/upload', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-uploads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const validFiles = fileArray.filter((f) =>
        ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)
      )

      validFiles.forEach((file) => {
        const jobId = crypto.randomUUID()
        setUploads((prev) => [
          ...prev,
          { id: jobId, fileName: file.name, status: 'uploading', progress: 0 },
        ])

        uploadMutation.mutate(file, {
          onSuccess: () => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === jobId ? { ...u, status: 'completed', progress: 100 } : u
              )
            )
          },
          onError: (err) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === jobId
                  ? { ...u, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' }
                  : u
              )
            )
          },
        })
      })
    },
    [uploadMutation]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div>
      <Header
        title="Upload Center"
        subtitle="Upload candidate resumes for AI processing"
      />

      <div className="p-6 max-w-4xl">
        {/* Drop Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-300 hover:border-primary-300 hover:bg-slate-50'
            }`}
          >
            <CloudUpload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-primary-600' : 'text-slate-400'}`} />
            <h3 className="text-lg font-semibold text-slate-900">
              Drop resumes here or click to browse
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Supports PDF and Word documents. Upload up to 50 files at once.
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="mt-4">
              <UploadIcon className="h-4 w-4 mr-2" /> Select Files
            </Button>
          </div>
        </motion.div>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Uploads ({uploads.filter((u) => u.status === 'completed').length}/{uploads.length} complete)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {upload.fileName}
                          </p>
                          {upload.status === 'uploading' && (
                            <Progress value={upload.progress} className="mt-1" />
                          )}
                          {upload.error && (
                            <p className="text-xs text-danger-600 mt-1">{upload.error}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {upload.status === 'uploading' && (
                            <Loader2 className="h-4 w-4 text-primary-600 animate-spin" />
                          )}
                          {upload.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-success-600" />
                          )}
                          {upload.status === 'failed' && (
                            <AlertCircle className="h-4 w-4 text-danger-600" />
                          )}
                          <button
                            onClick={() => removeUpload(upload.id)}
                            className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Pipeline Info */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processing Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {[
                  { step: 'Upload', desc: 'File received' },
                  { step: 'Extract', desc: 'Text extraction' },
                  { step: 'AI Parse', desc: 'LLM extraction' },
                  { step: 'Embed', desc: 'Vector embedding' },
                  { step: 'Index', desc: 'Search ready' },
                ].map((stage, i) => (
                  <div key={stage.step} className="flex items-center">
                    <div className="text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold mx-auto">
                        {i + 1}
                      </div>
                      <p className="text-xs font-medium mt-1">{stage.step}</p>
                      <p className="text-xs text-slate-400">{stage.desc}</p>
                    </div>
                    {i < 4 && (
                      <div className="w-12 h-0.5 bg-primary-200 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        {recentUploads && recentUploads.length > 0 && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">{upload.candidateName}</p>
                          <p className="text-xs text-slate-400">{upload.fileName}</p>
                        </div>
                      </div>
                      <Badge variant={upload.status === 'ready' ? 'success' : upload.status === 'failed' ? 'destructive' : 'warning'}>
                        {upload.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
