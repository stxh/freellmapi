import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type ServerConfig = {
  serverUrl: string;
  token: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  serverConfig: ServerConfig;
  login: (serverUrl: string, token: string) => void;
  logout: () => void;
  updateServerConfig: (config: Partial<ServerConfig>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    serverUrl: 'http://localhost:3001',
    token: ''
  });

  useEffect(() => {
    const syncFromLocalStorage = () => {
      const savedConfig = localStorage.getItem('serverConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          setServerConfig({
            serverUrl: config.serverUrl || 'http://localhost:3001',
            token: config.token || ''
          });
          setIsAuthenticated(!!config.token);
        } catch {
          setServerConfig({
            serverUrl: 'http://localhost:3001',
            token: ''
          });
          setIsAuthenticated(false);
        }
      } else {
        setServerConfig({
          serverUrl: 'http://localhost:3001',
          token: ''
        });
        setIsAuthenticated(false);
      }
    };

    syncFromLocalStorage();

    // 监听localStorage变化以保持同步
    const storageListener = () => {
      syncFromLocalStorage();
    };
    window.addEventListener('storage', storageListener);
    return () => window.removeEventListener('storage', storageListener);
  }, []);

  const login = (serverUrl: string, token: string) => {
    const config = { serverUrl: serverUrl.trim(), token: token.trim() };
    localStorage.setItem('serverConfig', JSON.stringify(config));
    setServerConfig(config);
    setIsAuthenticated(!!token.trim());
  };

  const logout = () => {
    localStorage.removeItem('serverConfig');
    setServerConfig({
      serverUrl: 'http://localhost:3001',
      token: ''
    });
    setIsAuthenticated(false);
  };

  const updateServerConfig = (updates: Partial<ServerConfig>) => {
    const newConfig = { ...serverConfig, ...updates };
    localStorage.setItem('serverConfig', JSON.stringify(newConfig));
    setServerConfig(newConfig);
    setIsAuthenticated(!!newConfig.token);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      serverConfig, 
      login, 
      logout, 
      updateServerConfig 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
