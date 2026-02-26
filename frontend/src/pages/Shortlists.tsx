import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ListChecks,
  Share2,
  Users,
  Calendar,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Shortlist } from '@/types'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function Shortlists() {
  const { data: shortlists, isLoading } = useQuery({
    queryKey: ['shortlists'],
    queryFn: () => api.get<Shortlist[]>('/shortlists'),
  })

  return (
    <div>
      <Header
        title="Shortlists"
        subtitle="Curated candidate lists for your positions"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Shortlist
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {shortlists?.map((shortlist) => (
              <Card key={shortlist.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                      <ListChecks className="h-5 w-5 text-primary-600" />
                    </div>
                    {shortlist.shareEnabled && (
                      <Badge variant="success" className="gap-1">
                        <Share2 className="h-3 w-3" /> Shared
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-900">{shortlist.name}</h3>

                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {shortlist.candidateCount ?? 0} candidates
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(shortlist.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    {shortlist.shareEnabled && shortlist.shareToken && (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {shortlists?.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <ListChecks className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No shortlists yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Create a shortlist from search results or manually curate one
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
