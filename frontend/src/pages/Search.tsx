import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search as SearchIcon,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  CheckCircle,
  User,
  ListPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { SearchResponse, SearchResult } from '@/types'
import { api } from '@/lib/api'

const sampleQueries = [
  'Senior React developer with 5+ years experience in fintech',
  'Machine learning engineer with Python and TensorFlow, Bangalore',
  'Full stack developer with Node.js and AWS certification',
  'Product manager with B2B SaaS experience, 3-5 years',
  'DevOps engineer experienced with Kubernetes and CI/CD',
]

function SearchResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const { candidate, matchScore, reasoning, strengths, gaps } = result

  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const scoreColor =
    matchScore >= 80
      ? 'text-success-600 bg-success-50'
      : matchScore >= 60
        ? 'text-warning-600 bg-warning-50'
        : 'text-danger-600 bg-danger-50'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar & Score */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className={`px-2 py-1 rounded-lg text-sm font-bold ${scoreColor}`}>
                {matchScore}%
              </div>
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    to={`/candidates/${candidate.id}`}
                    className="text-lg font-semibold text-slate-900 hover:text-primary-600 transition-colors"
                  >
                    {candidate.name}
                  </Link>
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
                        {candidate.locationState && `, ${candidate.locationState}`}
                      </span>
                    )}
                    {candidate.totalExperienceYears && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {candidate.totalExperienceYears} years
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <ListPlus className="h-4 w-4 mr-1" />
                    Shortlist
                  </Button>
                  <Link to={`/candidates/${candidate.id}`}>
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-1" />
                      Profile
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {candidate.skills.slice(0, 8).map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
                {candidate.skills.length > 8 && (
                  <Badge variant="outline">+{candidate.skills.length - 8}</Badge>
                )}
              </div>

              {/* AI Reasoning */}
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-600 line-clamp-2">{reasoning}</p>
                </div>
              </div>

              {/* Expandable Details */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mt-2 text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" /> Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" /> Show strengths & gaps
                  </>
                )}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs font-medium text-success-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Strengths
                        </p>
                        <ul className="space-y-1">
                          {strengths.map((s, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                              <Star className="h-3 w-3 text-success-500 mt-1 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-warning-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Gaps
                        </p>
                        <ul className="space-y-1">
                          {gaps.map((g, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                              <AlertTriangle className="h-3 w-3 text-warning-500 mt-1 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function Search() {
  const [query, setQuery] = useState('')

  const searchMutation = useMutation({
    mutationFn: (searchQuery: string) =>
      api.post<SearchResponse>('/search', { query: searchQuery }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      searchMutation.mutate(query.trim())
    }
  }

  const handleSampleQuery = (sample: string) => {
    setQuery(sample)
    searchMutation.mutate(sample)
  }

  return (
    <div>
      <Header
        title="AI Search"
        subtitle="Find the perfect candidate using natural language"
      />

      <div className="p-6">
        {/* Search Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full text-sm text-primary-700 font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Powered by AI
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Describe your ideal candidate
            </h2>
            <p className="mt-2 text-slate-500 max-w-xl mx-auto">
              Use natural language to search through our database. Our AI understands skills, experience, location, and more.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSearch(e)
                  }
                }}
                placeholder="e.g., Senior React developer with 5+ years experience in fintech, Bangalore..."
                className="w-full min-h-[56px] max-h-32 rounded-xl border-2 border-slate-200 bg-white pl-12 pr-32 py-4 text-base focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none placeholder:text-slate-400"
                rows={1}
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                disabled={searchMutation.isPending || !query.trim()}
              >
                {searchMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <SearchIcon className="h-4 w-4" />
                    Search
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Sample Queries */}
          {!searchMutation.data && !searchMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <p className="text-sm text-slate-500 mb-3 text-center">Try these searches:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {sampleQueries.map((sample) => (
                  <button
                    key={sample}
                    onClick={() => handleSampleQuery(sample)}
                    className="px-3 py-1.5 text-sm text-slate-600 bg-white border rounded-full hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filters */}
          {(searchMutation.data || searchMutation.isPending) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-sm text-slate-500">Filters:</span>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
                <MapPin className="h-3 w-3 mr-1" /> Location
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
                <Clock className="h-3 w-3 mr-1" /> Experience
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
                <GraduationCap className="h-3 w-3 mr-1" /> Education
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
                <Briefcase className="h-3 w-3 mr-1" /> Industry
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Results */}
        <div className="max-w-4xl mx-auto mt-8">
          {searchMutation.isPending && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse flex items-start gap-4">
                      <div className="h-12 w-12 bg-slate-200 rounded-full" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-slate-200 rounded w-1/3" />
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-slate-200 rounded-full w-16" />
                          <div className="h-6 bg-slate-200 rounded-full w-20" />
                          <div className="h-6 bg-slate-200 rounded-full w-14" />
                        </div>
                        <div className="h-16 bg-slate-100 rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchMutation.data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">
                  Found <span className="font-semibold text-slate-900">{searchMutation.data.totalMatches}</span> matching candidates
                </p>
              </div>

              <div className="space-y-4">
                {searchMutation.data.candidates.map((result, index) => (
                  <SearchResultCard key={result.candidate.id} result={result} index={index} />
                ))}
              </div>
            </motion.div>
          )}

          {searchMutation.isError && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-slate-900">Search failed</p>
                <p className="text-sm text-slate-500 mt-1">
                  {searchMutation.error.message}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => searchMutation.mutate(query)}
                >
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
