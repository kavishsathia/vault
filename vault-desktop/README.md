# Vault Desktop App + MCP Server

Universal preference bridge for AI tools through Model Context Protocol (MCP).

## 🎯 What This Does

The Vault Desktop App serves as a **universal bridge** between your Vault preferences and AI tools like Claude Desktop, GitHub Copilot, VS Code extensions, and any MCP-compatible assistant.

**Key Features:**
- 🔐 **OAuth PKCE Authentication** - Secure login to your Vault account
- 🖥️ **System Tray Integration** - Runs quietly in background
- 🔧 **MCP Server** - Exposes preferences to AI tools via Model Context Protocol
- ⚡ **Universal AI Integration** - Works with Claude Desktop, Copilot, and more

## 🏗️ Architecture

```
[Vault API] ↔ [Desktop App OAuth] ↔ [Local MCP Server] ↔ [AI Tools]
```

1. **Desktop App** authenticates with Vault using OAuth 2.0 + PKCE
2. **MCP Server** runs locally, secured with your OAuth tokens
3. **AI Tools** connect to MCP server for preference data

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd vault-desktop
pip install -r requirements.txt
```

### 2. Register OAuth Client

```bash
# Make sure Vault backend is running first
python register_oauth_client.py
```

### 3. Start Desktop App

```bash
python run_desktop_app.py
```

### 4. Authenticate

1. Click "Login to Vault" in system tray
2. Browser opens to Vault OAuth page
3. Login and approve permissions
4. MCP server starts automatically

## 🤖 AI Tool Integration

### Claude Desktop

1. Add MCP server config to Claude Desktop settings:

```json
{
  "mcpServers": {
    "vault": {
      "command": "python3",
      "args": ["/path/to/vault-desktop/src/vault_mcp_server.py"],
      "env": {}
    }
  }
}
```

2. Restart Claude Desktop
3. Claude can now access your preferences!

**Example usage in Claude:**
- "Query my food preferences for dinner suggestions"
- "Add preference: I love dark theme interfaces"
- "What are my UI/UX preferences?"

### GitHub Copilot / VS Code

Coming soon - MCP integration for coding preferences.

## 🛠️ Available MCP Tools

The MCP server exposes these tools to AI assistants:

### Tools

- **`query_user_preferences`** - Search preferences by natural language
- **`add_user_preference`** - Add new preferences  
- **`get_user_preference_summary`** - Get top preferences by category
- **`get_preference_categories`** - List all available categories

### Resources

- **`vault://preferences`** - Stream all user preferences
- **`vault://categories`** - List preference categories
- **`vault://info`** - Server information

## 🔧 Configuration

Settings stored in `~/.vault/config.json`:

```json
{
  "api_url": "http://localhost:8000",
  "oauth_client_id": "vault-desktop-app",
  "mcp_server_enabled": true,
  "auto_start": true
}
```

## 🧪 Testing

Test MCP server functionality:

```bash
python test_mcp_server.py
```

Test individual components:

```bash
# Test MCP server directly
python src/vault_mcp_server.py

# Test OAuth flow (requires browser)
python -c "from src.oauth_client import VaultOAuthClient; VaultOAuthClient().start_authorization_flow()"
```

## 📋 System Tray Menu

The desktop app provides a system tray icon with:

- ✅/❌ **Authentication Status**
- 🟢/🔴 **MCP Server Status**  
- **Login/Logout** - OAuth authentication
- **Start/Stop MCP Server** - Control MCP server
- **Open Vault Dashboard** - Quick web access
- **Settings** - Configuration (coming soon)
- **Quit** - Exit application

## 🎯 Use Cases

### For Developers
- **GitHub Copilot** understands your coding style (tabs vs spaces, frameworks, patterns)
- **VS Code extensions** adapt to your UI/workspace preferences
- **AI code reviewers** follow your style guidelines

### For Content Creators
- **Writing assistants** know your tone and communication style
- **Design tools** understand your color/layout preferences
- **Content recommendations** match your interests

### For Daily Use
- **Food recommendations** based on dietary preferences
- **Entertainment suggestions** matching your tastes
- **Shopping assistants** knowing brand/price preferences
- **Travel planning** with accommodation/activity preferences

## 🔒 Security

- **OAuth 2.0 + PKCE** - Industry standard secure authentication
- **Local MCP server** - No external servers access your data
- **Token refresh** - Automatic token management
- **Scoped permissions** - Granular access control per category

## 🐛 Troubleshooting

### MCP Server Won't Start
1. Check authentication: System tray shows ✅ status
2. Check logs: `~/.vault/app.log`
3. Test manually: `python src/vault_mcp_server.py`

### OAuth Login Fails
1. Ensure Vault backend is running (`http://localhost:8000`)
2. Check OAuth client is registered
3. Browser should open to `http://localhost:8000/oauth/authorize`

### AI Tool Can't Connect
1. Verify MCP server running: System tray shows 🟢
2. Check AI tool MCP config points to correct script path
3. Ensure no firewall blocking local connections

## 📚 Development

### Project Structure

```
vault-desktop/
├── src/
│   ├── vault_mcp_server.py    # MCP server implementation
│   ├── desktop_app.py         # System tray app
│   ├── oauth_client.py        # OAuth PKCE client
│   └── config.py              # Configuration management
├── test_mcp_server.py         # Test suite
├── run_desktop_app.py         # Launcher script
└── requirements.txt           # Dependencies
```

### Adding New MCP Tools

1. Add tool function to `vault_mcp_server.py`
2. Use `@mcp.tool()` decorator
3. Add proper docstring for AI tool documentation
4. Test with `test_mcp_server.py`

### Adding New OAuth Scopes

1. Update `register_oauth_client.py` with new scopes
2. Re-run registration script
3. Update MCP server to use new API endpoints
4. Users need to re-authenticate for new permissions

## 🚀 Deployment

### Standalone Executable

```bash
# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller --onefile --windowed run_desktop_app.py
```

### Auto-Start on Boot

**macOS:**
```bash
# Create launchd plist for auto-start
cp vault-desktop.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/vault-desktop.plist
```

**Linux:**
```bash
# Create systemd service
cp vault-desktop.service ~/.config/systemd/user/
systemctl --user enable vault-desktop.service
```

This creates the **universal preference layer for AI tools** - set up once, works everywhere! 🚀