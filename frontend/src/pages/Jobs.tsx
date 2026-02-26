import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Briefcase,
  MoreVertical,
  Search,
  Users,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { JobDescription } from '@/types'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const statusColors: Record<string, 'success' | 'secondary' | 'warning'> = {
  active: 'success',
  draft: 'secondary',
  closed: 'warning',
}

export default function Jobs() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get<JobDescription[]>('/jobs'),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      api.post<JobDescription>('/jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setDialogOpen(false)
      setTitle('')
      setDescription('')
    },
  })

  const filteredJobs = jobs?.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <Header
        title="Jobs"
        subtitle="Manage job descriptions for candidate matching"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Job Description</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input
                    id="job-title"
                    placeholder="e.g., Senior Frontend Developer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-desc">Description & Requirements</Label>
                  <Textarea
                    id="job-desc"
                    placeholder="Describe the role, requirements, and ideal candidate..."
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate({ title, description })}
                  disabled={!title || !description || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Job'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
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
            {filteredJobs?.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                        <Briefcase className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{job.title}</h3>
                          <Badge variant={statusColors[job.status]}>{job.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {job.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          Created {formatDate(job.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-1" /> Find Matches
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-danger-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredJobs?.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No jobs found</p>
                  <Button variant="outline" className="mt-3" onClick={() => setDialogOpen(true)}>
                    Create your first job
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
