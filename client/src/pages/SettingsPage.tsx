import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { getServerConfig } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SettingsPage = () => {
  const { serverConfig, updateServerConfig, logout } = useAuth()
  const [serverUrl, setServerUrl] = useState(serverConfig.serverUrl || getServerConfig().serverUrl)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionTest, setConnectionTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const navigate = useNavigate()

  const testConnection = async (url: string) => {
    setConnectionTest('testing')
    setError(null)
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
      setError('Cannot connect to server. Please check the URL and try again.')
      return false
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      // Test connection first if URL changed
      if (serverUrl !== serverConfig.serverUrl) {
        const isServerReachable = await testConnection(serverUrl)
        if (!isServerReachable) {
          return
        }
      }

      // Update configuration
      const updates: any = { serverUrl: serverUrl.trim() }
      if (token.trim()) {
        updates.token = token.trim()
      }
      
      updateServerConfig(updates)
      
      // Clear the token input for security
      setToken('')
      
      // Show success message (since we don't have a toast system)
      alert('Settings saved successfully!')
      
    } catch (err) {
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to disconnect from the server?')) {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your server connection</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 mb-6">
            {error}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure the connection to your FreeLLMAPI server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
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
                  placeholder={serverConfig.token ? '••••••••••••••••' : 'Enter your API token'}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to keep existing token. Get your token from the server's settings page.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading || !serverUrl.trim()}
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Connection</CardTitle>
            <CardDescription>
              Information about your current server connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Server URL:</span>
                  <div className="font-mono">{serverConfig.serverUrl}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Token:</span>
                  <div className="font-mono">
                    {serverConfig.token ? '••••••••••••••••••••••••••••••••' : 'Not set'}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleLogout}
                >
                  Disconnect
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/playground')}
                >
                  Back to Playground
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage