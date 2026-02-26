import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ResumeAI</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Find the perfect candidate
            <br />
            with AI-powered search
          </h2>
          <p className="mt-4 text-lg text-indigo-200 max-w-md">
            Search through millions of resumes using natural language. Our AI understands context, skills, and experience to find the best matches.
          </p>
        </div>

        <div className="flex items-center gap-8 text-indigo-200">
          <div>
            <div className="text-3xl font-bold text-white">10L+</div>
            <div className="text-sm">Resumes Indexed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">95%</div>
            <div className="text-sm">Match Accuracy</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">2s</div>
            <div className="text-sm">Avg Search Time</div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ResumeAI</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-danger-50 border border-danger-500/20 p-3 text-sm text-danger-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
