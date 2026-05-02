import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { getServerConfig } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LoginPage = () => {
  const [serverUrl, setServerUrl] = useState(getServerConfig().serverUrl)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionTest, setConnectionTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const navigate = useNavigate()
  const { login } = useAuth()

  const testConnection = async (url: string) => {
    setConnectionTest('testing')
    try {
      const testUrl = `${url.replace(/\/$/, '')}/api/ping`
      const response = await fetch(testUrl, { method: 'GET' })
      if (response.ok) {
        setConnectionTest('success')
        return true
      } else {
        throw new Error('Server returned error status')
      }
    } catch (err) {
      setConnectionTest('error')
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      // Test server connection first
      const isServerReachable = await testConnection(serverUrl)
      if (!isServerReachable) {
        setError('Cannot connect to server. Please check the server URL and try again.')
        return
      }

      // Require both server URL and token
      if (serverUrl.trim() && token.trim()) {
        login(serverUrl.trim(), token.trim())
        navigate('/playground', { replace: true })
      } else {
        setError('Please enter both server URL and token')
      }
    } catch (err) {
      setError('Connection failed. Please check your server configuration.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">FreeLLMAPI</h1>
          <p className="text-muted-foreground">Connect to your server</p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="serverUrl">Server URL</Label>
            <div className="flex gap-2">
              <Input
                id="serverUrl"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || connectionTest === 'testing'}
                onClick={() => testConnection(serverUrl)}
              >
                {connectionTest === 'testing' ? 'Testing...' : 
                 connectionTest === 'success' ? '✓ Connected' :
                 connectionTest === 'error' ? '✗ Error' : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              The URL of your FreeLLMAPI server (default: http://localhost:3001)
            </p>
          </div>
          
          <div>
            <Label htmlFor="token">API Token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your API token"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your token from the server's settings page
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !serverUrl.trim() || !token.trim()}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </Button>
        </form>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Default server: <code>http://localhost:3001</code></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;