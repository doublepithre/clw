import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Clock,
  Award,
  Globe,
  Download,
  Tag,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Candidate } from '@/types'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>()

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => api.get<Candidate>(`/candidates/${id}`),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div>
        <Header title="Candidate Profile" />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-slate-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-6 bg-slate-200 rounded w-48" />
                <div className="h-4 bg-slate-200 rounded w-64" />
              </div>
            </div>
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div>
        <Header title="Candidate Profile" />
        <div className="p-6 text-center">
          <p className="text-slate-500">Candidate not found</p>
          <Link to="/candidates">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Candidates
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div>
      <Header
        title="Candidate Profile"
        actions={
          <div className="flex gap-2">
            <Link to="/candidates">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </Link>
            {candidate.resumeFileName && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" /> Download Resume
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl"
        >
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-16 w-16 text-lg">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900">{candidate.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                    {candidate.currentTitle && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {candidate.currentTitle}
                        {candidate.currentCompany && ` at ${candidate.currentCompany}`}
                      </span>
                    )}
                    {candidate.locationCity && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {candidate.locationCity}
                        {candidate.locationState && `, ${candidate.locationState}`}
                        {candidate.locationCountry && `, ${candidate.locationCountry}`}
                      </span>
                    )}
                    {candidate.totalExperienceYears && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {candidate.totalExperienceYears} years experience
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                      <Mail className="h-4 w-4" /> {candidate.email}
                    </a>
                    {candidate.phone && (
                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <Phone className="h-4 w-4" /> {candidate.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={candidate.processingStatus === 'ready' ? 'success' : candidate.processingStatus === 'failed' ? 'destructive' : 'warning'}
                >
                  {candidate.processingStatus}
                </Badge>
              </div>

              {candidate.summary && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm text-slate-600 leading-relaxed">{candidate.summary}</p>
                </>
              )}

              {/* Skills */}
              <div className="mt-4">
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {candidate.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <Tag className="h-4 w-4 text-slate-400" />
                  {candidate.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Tabs */}
          <Tabs defaultValue="experience">
            <TabsList>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="skills">Skills Detail</TabsTrigger>
            </TabsList>

            <TabsContent value="experience" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary-600" />
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.extractedData?.workExperience.length ? (
                    <div className="space-y-6">
                      {candidate.extractedData.workExperience.map((exp, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-primary-200">
                          <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary-600" />
                          <h4 className="font-semibold text-slate-900">{exp.title}</h4>
                          <p className="text-sm text-primary-600 font-medium">{exp.company}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {exp.startDate} - {exp.endDate || 'Present'}
                          </p>
                          {exp.description && (
                            <p className="text-sm text-slate-600 mt-2">{exp.description}</p>
                          )}
                          {exp.highlights.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {exp.highlights.map((h, j) => (
                                <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                                  <span className="text-primary-500 mt-1">&#8226;</span>
                                  {h}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No experience data extracted yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary-600" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.extractedData?.education.length ? (
                    <div className="space-y-4">
                      {candidate.extractedData.education.map((edu, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                            <GraduationCap className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{edu.degree} in {edu.field}</h4>
                            <p className="text-sm text-slate-600">{edu.institution}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{edu.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No education data extracted yet</p>
                  )}

                  {candidate.extractedData?.certifications && candidate.extractedData.certifications.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <Award className="h-4 w-4 text-warning-600" />
                        Certifications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.extractedData.certifications.map((cert, i) => (
                          <Badge key={i} variant="warning">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {candidate.extractedData?.languages && candidate.extractedData.languages.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                        <Globe className="h-4 w-4 text-success-600" />
                        Languages
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.extractedData.languages.map((lang, i) => (
                          <Badge key={i} variant="secondary">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.extractedData?.skills.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {candidate.extractedData.skills.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <span className="font-medium text-slate-900">{skill.name}</span>
                            <span className="text-xs text-slate-400 ml-2">{skill.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {skill.years && (
                              <span className="text-xs text-slate-500">{skill.years}y</span>
                            )}
                            {skill.proficiency && (
                              <Badge variant="secondary" className="text-xs">{skill.proficiency}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No detailed skill data extracted yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-slate-400 mt-4">
            Added {formatDate(candidate.createdAt)} · Last updated {formatDate(candidate.updatedAt)}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
