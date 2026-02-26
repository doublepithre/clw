import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users,
  Search,
  Briefcase,
  ListChecks,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { DashboardStats } from '@/types'
import { api } from '@/lib/api'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  })

  const statCards = [
    {
      title: 'Total Candidates',
      value: stats?.totalCandidates ?? 0,
      icon: Users,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Searches Made',
      value: stats?.totalSearches ?? 0,
      icon: Search,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
    },
    {
      title: 'Active Jobs',
      value: stats?.totalJobs ?? 0,
      icon: Briefcase,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
    },
    {
      title: 'Shortlists',
      value: stats?.totalShortlists ?? 0,
      icon: ListChecks,
      color: 'text-danger-600',
      bgColor: 'bg-danger-50',
    },
  ]

  const processingStats = [
    {
      label: 'Ready',
      value: stats?.readyCandidates ?? 0,
      icon: CheckCircle,
      color: 'text-success-600',
    },
    {
      label: 'Processing',
      value: stats?.processingCandidates ?? 0,
      icon: Clock,
      color: 'text-warning-600',
    },
    {
      label: 'Failed',
      value: stats?.failedCandidates ?? 0,
      icon: AlertCircle,
      color: 'text-danger-600',
    },
  ]

  const total = stats?.totalCandidates || 1
  const readyPercent = ((stats?.readyCandidates ?? 0) / total) * 100

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of your recruitment pipeline"
        actions={
          <Link to="/search">
            <Button>
              <Search className="h-4 w-4 mr-2" />
              New Search
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <motion.div key={stat.title} variants={item}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{stat.title}</p>
                        <p className="text-3xl font-bold mt-1">
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-xl`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Processing Status */}
            <motion.div variants={item} className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary-600" />
                    Resume Processing Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Overall Progress</span>
                        <span className="font-medium">{readyPercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={readyPercent} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4">
                      {processingStats.map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                          <div>
                            <p className="text-xs text-slate-500">{stat.label}</p>
                            <p className="text-lg font-semibold">
                              {stat.value.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/search" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-primary-600" />
                        <span className="text-sm font-medium">Search Candidates</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                  <Link to="/upload" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-success-600" />
                        <span className="text-sm font-medium">Upload Resumes</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                  <Link to="/jobs" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-warning-600" />
                        <span className="text-sm font-medium">Post a Job</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                  <Link to="/shortlists" className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <ListChecks className="h-5 w-5 text-danger-600" />
                        <span className="text-sm font-medium">View Shortlists</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
