import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain,
  Search,
  Sparkles,
  Upload,
  Users,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Search,
    title: 'Natural Language Search',
    description: 'Describe your ideal candidate in plain English. Our AI understands context, nuance, and intent.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Ranking',
    description: 'Get ranked results with match scores, strengths, gaps, and detailed reasoning for each candidate.',
  },
  {
    icon: Upload,
    title: 'Bulk Resume Processing',
    description: 'Upload thousands of resumes. Our pipeline extracts, parses, and indexes them automatically.',
  },
  {
    icon: Users,
    title: 'Smart Shortlists',
    description: 'Create shareable shortlists with reviewer workflows. Collaborate with your hiring team.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Search through lakhs of resumes in under 2 seconds. Vector search + AI re-ranking.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Session-based auth, encrypted data, role-based access control. Your data stays private.',
  },
]

const stats = [
  { value: '10L+', label: 'Resumes Processed' },
  { value: '<2s', label: 'Search Response' },
  { value: '95%', label: 'Match Accuracy' },
  { value: '80%', label: 'Time Saved' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">ResumeAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full text-sm font-medium text-primary-700 mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Resume Search Platform
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight">
              Find the perfect candidate
              <br />
              <span className="text-primary-600">in seconds, not hours</span>
            </h1>
            <p className="mt-6 text-xl text-slate-500 max-w-2xl mx-auto">
              Search through lakhs of resumes using natural language. Our AI understands skills, experience, and context to surface the best matches instantly.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <Link to="/register">
                <Button size="lg" className="text-base px-8">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-base px-8">
                  See Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Search Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 shadow-2xl shadow-primary-500/10">
              <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
                <Search className="h-5 w-5 text-slate-400" />
                <span className="text-slate-400">
                  Senior React developer with 5+ years fintech experience, Bangalore...
                </span>
                <Button size="sm" className="ml-auto shrink-0">Search</Button>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { name: 'Priya Sharma', score: 94, title: 'Senior Frontend Engineer at Razorpay' },
                  { name: 'Amit Patel', score: 87, title: 'Lead React Developer at Paytm' },
                  { name: 'Ravi Kumar', score: 82, title: 'Staff Engineer at PhonePe' },
                ].map((result) => (
                  <div key={result.name} className="flex items-center gap-4 rounded-lg border bg-white p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {result.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{result.name}</p>
                      <p className="text-sm text-slate-500">{result.title}</p>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-success-50 text-success-600 text-sm font-bold">
                      {result.score}% match
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-sidebar">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-indigo-200 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">
              Everything you need for smart recruiting
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              Powerful features to streamline your hiring pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl border hover:shadow-lg hover:border-primary-200 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="mt-3 text-lg text-slate-500">Three simple steps to find your next hire</p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Upload Resumes',
                description: 'Bulk upload PDF and Word resumes. Our AI pipeline automatically extracts skills, experience, education, and more.',
                icon: Upload,
              },
              {
                step: '02',
                title: 'Search with Natural Language',
                description: 'Type your requirements in plain English. "Senior Python developer with ML experience in healthcare, 5+ years."',
                icon: Search,
              },
              {
                step: '03',
                title: 'Review AI-Ranked Results',
                description: 'Get a ranked list of candidates with match scores, strengths, gaps, and AI reasoning. Create shortlists and share.',
                icon: BarChart3,
              },
            ].map((step) => (
              <div key={step.step} className="flex items-start gap-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-lg shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-slate-500 mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Ready to transform your hiring?
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Join hundreds of recruiters who save hours every day with AI-powered search
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link to="/register">
              <Button size="lg" className="text-base px-8">
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success-500" /> 14-day free trial
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success-500" /> No credit card required
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-success-500" /> Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">ResumeAI</span>
          </div>
          <p className="text-sm text-slate-500">&copy; 2026 ResumeAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
