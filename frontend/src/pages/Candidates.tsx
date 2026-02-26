import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  MapPin,
  Briefcase,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Candidate } from '@/types'
import { api } from '@/lib/api'

interface CandidatesResponse {
  candidates: Candidate[]
  total: number
  page: number
  pageSize: number
}

const statusConfig = {
  ready: { label: 'Ready', icon: CheckCircle, variant: 'success' as const },
  pending: { label: 'Pending', icon: Loader2, variant: 'secondary' as const },
  extracting: { label: 'Extracting', icon: Loader2, variant: 'warning' as const },
  embedding: { label: 'Embedding', icon: Loader2, variant: 'warning' as const },
  failed: { label: 'Failed', icon: AlertCircle, variant: 'destructive' as const },
}

export default function Candidates() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', page, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return api.get<CandidatesResponse>(`/candidates?${params}`)
    },
  })

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  return (
    <div>
      <Header
        title="Candidates"
        subtitle={`${data?.total ?? 0} candidates in database`}
        actions={
          <Link to="/upload">
            <Button>Upload Resumes</Button>
          </Link>
        }
      />

      <div className="p-6">
        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, skill, or company..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="extracting">Extracting</SelectItem>
              <SelectItem value="embedding">Embedding</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Candidate List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {data?.candidates.map((candidate) => {
              const status = statusConfig[candidate.processingStatus]
              const StatusIcon = status.icon
              const initials = candidate.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <Link key={candidate.id} to={`/candidates/${candidate.id}`}>
                  <Card className="hover:shadow-md transition-all hover:border-primary-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {candidate.name}
                            </span>
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            {candidate.currentTitle && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3.5 w-3.5" />
                                {candidate.currentTitle}
                                {candidate.currentCompany && ` at ${candidate.currentCompany}`}
                              </span>
                            )}
                            {candidate.locationCity && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {candidate.locationCity}
                              </span>
                            )}
                            {candidate.totalExperienceYears && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {candidate.totalExperienceYears}y exp
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                          {candidate.skills.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}

            {data?.candidates.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-slate-500">No candidates found</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
