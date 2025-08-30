'use client';

import { useState, useEffect } from 'react';
import { SimpleEmbeddingService } from '../lib/embedding-service';

const VAULT_API_BASE = 'http://localhost:8000/api';
const OAUTH_CLIENT_ID = 'vault_demo_client_123789';
const OAUTH_REDIRECT_URI = 'http://localhost:3001/auth/callback';

interface UserPreferences {
  darkMode: boolean;
  largeFonts: boolean;
}

export default function VaultDemo() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    darkMode: false,
    largeFonts: false
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleOAuthCallback(code);
    } else {
      // Check for stored token
      const storedToken = localStorage.getItem('vault_access_token');
      if (storedToken) {
        setAccessToken(storedToken);
        setIsAuthenticated(true);
        loadUserPreferences(storedToken);
      }
    }
  }, []);

  // Apply preferences to UI
  useEffect(() => {
    const root = document.documentElement;
    
    if (preferences.darkMode) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#0f0f23';
      document.body.style.color = '#e2e8f0';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#1f2937';
    }

    if (preferences.largeFonts) {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [preferences]);

  const startOAuthFlow = () => {
    // Go to the frontend OAuth authorize page (localhost:3000)
    const authUrl = new URL(`http://localhost:3000/oauth/authorize`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', OAUTH_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', OAUTH_REDIRECT_URI);
    authUrl.searchParams.append('scope', 'read:preferences write:preferences');
    authUrl.searchParams.append('state', Math.random().toString(36).substring(7));
    
    console.log('🔄 Starting OAuth flow:', authUrl.toString());
    window.location.href = authUrl.toString();
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      console.log('🔄 Exchanging authorization code for access token...');
      console.log('Code:', code);
      console.log('Token endpoint:', 'http://localhost:8000/oauth/token');
      
      const response = await fetch(`http://localhost:8000/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: OAUTH_CLIENT_ID,
          client_secret: 'vault_demo_secret_abc123def456ghi789jkl012mno345',
          code: code,
          redirect_uri: OAUTH_REDIRECT_URI,
        }),
      });

      console.log('Token response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Failed to exchange code for token: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('Token data received:', tokenData);
      
      const token = tokenData.access_token;
      
      if (!token) {
        throw new Error('No access token in response');
      }
      
      localStorage.setItem('vault_access_token', token);
      setAccessToken(token);
      setIsAuthenticated(true);
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Load preferences
      loadUserPreferences(token);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError(`Authentication failed: ${error.message}`);
    }
  };

  const loadUserPreferences = async (token: string) => {
    setIsLoadingPreferences(true);
    try {
      // Extract credentials hash from JWT token for privacy matrix
      const tokenParts = token.split('.');
      let credentialsHash = '';
      
      if (tokenParts.length === 3) {
        try {
          const payload = tokenParts[1];
          const padding = '='.repeat((4 - payload.length % 4) % 4);
          const payloadBytes = atob(payload + padding);
          const payloadJson = JSON.parse(payloadBytes);
          credentialsHash = payloadJson.credentials_hash || '';
          console.log('🔐 Extracted credentials hash:', credentialsHash.substring(0, 20) + '...');
        } catch (e) {
          console.error('Failed to extract credentials hash:', e);
        }
      }

      // Generate privacy matrix using seed 123456
      const privacySeed = '123456';
      const privacyMatrix = SimpleEmbeddingService.generatePrivacyMatrix(credentialsHash, privacySeed);
      console.log('🔒 Generated privacy matrix:', privacyMatrix.length + 'x' + privacyMatrix[0].length);

      // Query Vault for UI preferences
      const queries = [
        'dark mode theme preference',
        'large font size text readability'
      ];

      // Generate embeddings for all queries
      const queryEmbeddings = queries.map(query => {
        const rawEmbedding = SimpleEmbeddingService.generateEmbedding(query, 384);
        // Apply linear transformation for privacy
        const transformedEmbedding = SimpleEmbeddingService.transformEmbedding(rawEmbedding, privacyMatrix);
        return transformedEmbedding;
      });

      console.log('🔄 Querying with transformed embeddings...');
      
      // Use query-contexts endpoint
      const response = await fetch(`${VAULT_API_BASE}/preferences/query-contexts?user_id=fbed8e21-f47c-4ad7-9748-72eda644c8ae&app_id=3501c6fb-28ee-46f6-aadf-6ea14c35a569`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeddings: queryEmbeddings,
          context: 'ui_personalization'
        }),
      });

      if (!response.ok) {
        throw new Error(`Query contexts failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Query contexts results:', result);

      // Decrypt preference texts in contexts with detailed logging
      console.log('🔓 Starting decryption process...');
      console.log('🔓 Credentials hash available:', !!credentialsHash);
      console.log('🔓 Raw result contexts:', result.results);

      for (let groupIndex = 0; groupIndex < (result.results || []).length; groupIndex++) {
        const contextGroup = result.results[groupIndex];
        console.log(`🔓 Processing context group ${groupIndex} with ${contextGroup.length} items`);
        
        for (let contextIndex = 0; contextIndex < contextGroup.length; contextIndex++) {
          const context = contextGroup[contextIndex];
          console.log(`🔓 Context ${groupIndex}-${contextIndex} original text:`, context.text);
          
          if (context.text && credentialsHash) {
            try {
              const originalText = context.text;
              const decryptedText = await SimpleEmbeddingService.decryptText(context.text, credentialsHash, '123456');
              console.log(`🔓 Decryption result:`, originalText, '→', decryptedText);
              context.text = decryptedText;
            } catch (error) {
              console.log('🔓 Decryption error, keeping original:', error);
            }
          } else if (!credentialsHash) {
            console.log('🔓 No credentials hash, using text as-is');
          }
          
          console.log(`🔓 Context ${groupIndex}-${contextIndex} final text:`, context.text);
        }
      }

      // Collect all preference texts for analysis (these should now be decrypted)
      const darkModeContexts = result.results[0] || [];
      const largeFontContexts = result.results[1] || [];
      
      const allPreferenceTexts = [
        ...darkModeContexts.map(c => c.text),
        ...largeFontContexts.map(c => c.text)
      ].filter(text => text && text.trim().length > 0);

      console.log('🤖 Final texts being sent to Web LLM:');
      allPreferenceTexts.forEach((text, i) => {
        console.log(`${i + 1}. "${text}"`);
      });

      // Use Web LLM to analyze preferences
      let analyzedPrefs = {
        darkMode: false,
        largeFonts: false
      };

      if (allPreferenceTexts.length > 0) {
        // Simple string matching for UI preferences
        const combinedText = allPreferenceTexts.join(' ').toLowerCase();
        
        const hasDarkMode = combinedText.includes('dark mode') || 
                           combinedText.includes('dark theme') || 
                           combinedText.includes('night mode');
                           
        const hasLargeFonts = combinedText.includes('large font') || 
                             combinedText.includes('big text') || 
                             combinedText.includes('large text') ||
                             combinedText.includes('readable') ||
                             combinedText.includes('accessibility');

        analyzedPrefs = {
          darkMode: hasDarkMode,
          largeFonts: hasLargeFonts
        };

        console.log('Manual preference analysis:', {
          combinedText: combinedText.substring(0, 200) + '...',
          hasDarkMode,
          hasLargeFonts,
          result: analyzedPrefs
        });
      }
      
      setPreferences(analyzedPrefs);
      console.log('Applied preferences:', analyzedPrefs, {
        totalContexts: allPreferenceTexts.length,
        darkModeContexts: darkModeContexts.length,
        largeFontContexts: largeFontContexts.length
      });

    } catch (error) {
      console.error('❌ Failed to load preferences:', error);
      setError('Failed to load preferences from Vault');
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('vault_access_token');
    setAccessToken(null);
    setIsAuthenticated(false);
    setPreferences({ darkMode: false, largeFonts: false });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vault Demo</h1>
            <p className="text-gray-600">
              Experience instant UI personalization powered by your Vault preferences
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Connect to your Vault account</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">AI analyzes your UI preferences</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Instantly personalized interface</span>
            </div>
          </div>

          <button
            onClick={startOAuthFlow}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Connect with Vault
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${preferences.darkMode ? 'dark bg-[#0f0f23]' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className={`rounded-lg p-6 mb-8 transition-all duration-300 ${
          preferences.darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white shadow-lg border border-gray-200'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`font-bold mb-2 transition-all duration-300 ${
                preferences.largeFonts ? 'text-4xl' : 'text-3xl'
              } ${preferences.darkMode ? 'text-white' : 'text-gray-900'}`}>
                Vault Demo App
              </h1>
              <p className={`transition-all duration-300 ${
                preferences.largeFonts ? 'text-lg' : 'text-base'
              } ${preferences.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your preferences, instantly applied
              </p>
            </div>
            <button
              onClick={logout}
              className={`px-4 py-2 rounded-lg transition-colors ${
                preferences.darkMode
                  ? 'bg-red-800 hover:bg-red-700 text-red-100'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Preferences Analysis */}
        <div className={`rounded-lg p-6 mb-8 ${
          preferences.darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'
        }`}>
          <h2 className={`font-semibold mb-4 ${
            preferences.largeFonts ? 'text-2xl' : 'text-xl'
          } ${preferences.darkMode ? 'text-white' : 'text-gray-900'}`}>
            AI-Analyzed Preferences
          </h2>
          
          {isLoadingPreferences || isAnalyzingWithAI ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className={preferences.darkMode ? 'text-gray-300' : 'text-gray-600'}>
                {isAnalyzingWithAI ? 'AI analyzing preferences...' : 'Loading Vault preferences...'}
              </span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${
                preferences.darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${preferences.darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Dark Mode
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    preferences.darkMode
                      ? 'bg-green-800 text-green-100'
                      : 'bg-gray-800 text-gray-100'
                  }`}>
                    {preferences.darkMode ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg border ${
                preferences.darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${preferences.darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Large Fonts
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    preferences.largeFonts
                      ? 'bg-green-800 text-green-100'
                      : 'bg-gray-800 text-gray-100'
                  }`}>
                    {preferences.largeFonts ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Demo Content */}
        <div className={`rounded-lg p-6 mb-8 ${
          preferences.darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'
        }`}>
          <h2 className={`font-semibold mb-4 ${
            preferences.largeFonts ? 'text-2xl' : 'text-xl'
          } ${preferences.darkMode ? 'text-white' : 'text-gray-900'}`}>
            Live Personalization Demo
          </h2>
          
          <div className="space-y-4">
            <p className={`transition-all duration-300 ${
              preferences.largeFonts ? 'text-lg' : 'text-base'
            } ${preferences.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              This interface has been automatically personalized based on your Vault preferences! 
              The AI analyzed your preference patterns and applied:
            </p>
            
            <ul className={`space-y-2 ${
              preferences.largeFonts ? 'text-lg' : 'text-base'
            } ${preferences.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>
                  <strong>Color Scheme:</strong> {preferences.darkMode ? 'Dark mode activated' : 'Light mode activated'}
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>
                  <strong>Typography:</strong> {preferences.largeFonts ? 'Large fonts for readability' : 'Standard font size'}
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>
                  <strong>Timing:</strong> Instant application, zero configuration required
                </span>
              </li>
            </ul>

            <div className={`mt-6 p-4 rounded-lg border-l-4 border-purple-500 ${
              preferences.darkMode ? 'bg-purple-900/20' : 'bg-purple-50'
            }`}>
              <p className={`font-medium mb-2 ${preferences.darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                This is the power of Vault
              </p>
              <p className={`${
                preferences.largeFonts ? 'text-lg' : 'text-base'
              } ${preferences.darkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                Instead of asking users to configure preferences in every app, Vault provides 
                instant personalization based on learned behavioral patterns. No forms, no setup, 
                just intelligent experiences from day one.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className={`text-center py-4 ${
          preferences.largeFonts ? 'text-base' : 'text-sm'
        } ${preferences.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>
            Built with{' '}
            <span className="text-purple-600">Vault Universal Preference Manager</span>
          </p>
        </footer>
      </div>
    </div>
  );
}