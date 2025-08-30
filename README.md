# Vault - Universal Preference Manager

> **Eliminate the cold start problem forever.** Vault is a privacy-first universal preference management system that lets any application instantly access user preferences through semantic embeddings.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Backend](https://img.shields.io/badge/backend-FastAPI-green.svg)]()
[![Frontend](https://img.shields.io/badge/frontend-Next.js%2015-black.svg)]()
[![Database](https://img.shields.io/badge/database-PostgreSQL%2Bpgvector-blue.svg)]()

## Quick Start

### Prerequisites
- **Python 3.11+** 
- **Node.js 18+**
- **PostgreSQL 14+** with pgvector extension
- **Git**

### 1. Clone & Setup
```bash
git clone <repo-url>
cd vault

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
chmod +x setup.sh && ./setup.sh

# Setup frontend  
cd ../frontend
npm install

# Setup demo app
cd ../demo
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb vault

# Install pgvector extension (if not already installed)
psql -d vault -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd backend
aerich upgrade

# Seed initial data
python seed/seed_database.py
```

### 3. Start Development Servers
```bash
# Terminal 1: Backend API
cd backend && python main.py

# Terminal 2: Frontend Dashboard  
cd frontend && npm run dev

# Terminal 3: Demo App (optional)
cd demo && npm run dev
```

**Access Points:**
- **Dashboard**: http://localhost:3000 (main preference management UI)
- **Demo App**: http://localhost:3001 (live personalization example)
- **API Docs**: http://localhost:8000/docs (interactive Swagger docs)

---

## Architecture Overview

Vault consists of four main components working together:

```mermaid
graph TB
    subgraph "Client Apps"
        A[Demo App] 
        B[Your App]
        C[Desktop MCP]
    end
    
    subgraph "Vault Core"
        D[Frontend Dashboard<br/>Next.js 15]
        E[Backend API<br/>FastAPI + Tortoise]
        F[PostgreSQL<br/>+ pgvector]
    end
    
    subgraph "AI Layer" 
        G[Web LLM<br/>Client-side]
        H[Snowflake Arctic<br/>384-dim embeddings]
    end
    
    A -->|OAuth 2.0| E
    B -->|API Key| E  
    C -->|MCP Protocol| E
    D -->|tRPC| E
    E -->|Tortoise ORM| F
    A -->|Client-side| G
    D -->|Client-side| G
    G -->|Generates| H
```

### Core Concepts

#### **1. Preference as Embeddings**
Instead of storing raw preferences, Vault converts text to semantic embeddings:
```typescript
"I love spicy Thai food" → [0.1, -0.2, 0.8, ...] // 384 dimensions
```

#### **2. Similarity-Based Intelligence**  
Apps query with embeddings and get similarity scores:
```typescript
query("vegetarian dinner options") → 0.73 // 73% match with user preferences
```

#### **3. Game Theory Anti-Gaming**
Dynamic noise injection prevents abuse:
- More queries without contributing → higher noise
- Contributing preferences → lower noise  
- Self-regulating system

#### **4. Temporal Decay**
Preferences naturally fade over time (configurable half-life):
- Keeps recommendations fresh
- Automatically rebalances preference strengths
- Resets when preferences are mentioned again

---

## Development Guide

### Backend (FastAPI + Tortoise ORM)

**Key Files:**
- `main.py` - FastAPI app initialization 
- `app/models/` - Tortoise ORM database models
- `app/routers/` - API endpoint definitions
- `app/schema/` - Pydantic validation schemas

**Database Models:**
```python
UserPreference:  # Core preference storage
  - text: TextField()
  - embedding: VectorField(384)  # Snowflake Arctic dimensions
  - strength: FloatField()       # 0.0-10.0+, can exceed 1.0
  
UserAppPermission:  # Two-dimensional permissions
  - app_id + category_id + read/write flags
  
QueryLog:  # For noise calculation
  - tracks query frequency per app/user
```

**API Development:**
```bash
# Run development server with auto-reload
python main.py

# Create new migration
aerich migrate --name "add_new_feature"

# Apply migrations  
aerich upgrade

# Interactive API docs
open http://localhost:8000/docs
```

### Frontend (Next.js 15 + tRPC)

**Key Directories:**
- `app/` - Next.js 15 App Router pages
- `components/` - React components  
- `lib/` - Utilities, API clients, contexts
- `lib/services/` - Embedding generation, privacy transforms

**Client-Side Embedding:**
```typescript
import { embeddingService } from '@/lib/services/embeddings';

// Generate 384-dim embedding locally
const embedding = await embeddingService.generateEmbedding(
  "I prefer dark themes",
  true  // enablePrivacy = adds noise transformation
);
```

**Development:**
```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint checking
npm run typecheck  # TypeScript validation
```

### Demo App (Live Personalization)

The demo showcases Vault's value with real-time UI adaptation:

**Features:**
- OAuth 2.0 integration with Vault
- Client-side preference analysis via Web LLM
- Live UI personalization (dark mode, font sizes)
- Privacy-preserving architecture

**Run Demo:**
```bash
cd demo
npm run dev  # Runs on port 3001
```

### Desktop Integration (MCP Server)

Claude Desktop integration via Model Context Protocol:

**Features:**
- Query preferences directly in Claude
- Add preferences through natural conversation
- OAuth authentication flow
- Privacy-preserving preference access

**Setup:**
```bash
cd vault-desktop
pip install -r requirements.txt
python run_desktop_app.py
```

---

## Key Features Deep Dive

### **Semantic Similarity Engine**

Vault prevents duplicate preferences through intelligent merging:

```python
# When adding "loves Italian pasta"
similarity = cosine_similarity(new_embedding, existing_embedding)

if similarity > 0.85:  # High similarity threshold
    # Merge instead of duplicate
    existing.strength += new_strength * 0.2  # Boost strength
    existing.last_updated = now()
else:
    # Create new preference
    create_new_preference()
```

### **Privacy-First Architecture**

```typescript
// 1. Generate embeddings client-side
const embedding = await generateEmbedding("I love dark themes");

// 2. Apply privacy transformation (adds noise)
const privateEmbedding = transformEmbedding(embedding);

// 3. Send only transformed embedding to backend
await api.addPreference({ embedding: privateEmbedding });
```

### **Anti-Gaming Mechanisms**

Dynamic noise calculation discourages bad actors:

```python
def calculate_noise(queries_made: int, contributions: int) -> float:
    base_noise = 0.1
    query_penalty = queries_made * 0.01
    contribution_bonus = max(1, contributions)
    
    noise = (base_noise + query_penalty) / contribution_bonus
    return min(noise, 0.5)  # Cap at 50% noise
```

### **OAuth 2.0 Integration**

Apps integrate securely via OAuth:

```bash
# 1. Register your app
curl -X POST http://localhost:8000/api/oauth/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Food App", 
    "redirect_uris": ["http://localhost:3000/callback"]
  }'

# 2. Redirect users to authorization
https://vault.example.com/oauth/authorize?
  client_id=your_client_id&
  redirect_uri=your_callback&
  scope=read:preferences
```

---

## Development Workflow

### **Adding New Features**

1. **Backend Changes:**
```bash
# 1. Create/modify models
vim app/models/new_feature.py

# 2. Create migration
aerich migrate --name "add_new_feature"

# 3. Apply migration
aerich upgrade

# 4. Add API endpoints
vim app/routers/new_feature.py

# 5. Test endpoints
curl http://localhost:8000/api/new-feature/test
```

2. **Frontend Integration:**
```bash
# 1. Add tRPC procedures
vim lib/trpc/server.ts

# 2. Create React components
vim components/NewFeature.tsx

# 3. Test in browser
npm run dev
```

### **Database Operations**

```bash
# Backup database
pg_dump vault > backup.sql

# Reset database (destructive!)
dropdb vault && createdb vault
aerich upgrade
python seed/seed_database.py

# View data
psql vault -c "SELECT count(*) FROM user_preferences;"
```

### **Testing Strategy**

```bash
# Backend testing
cd backend
python -m pytest tests/  # (create test files as needed)

# Frontend testing  
cd frontend
npm test  # (setup testing framework as needed)

# Integration testing
cd demo
python test_integration.py
```

---

## API Examples

### **Query User Preferences**
```bash
curl -X POST "http://localhost:8000/api/preferences/query?user_id=USER_UUID&app_id=APP_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, -0.2, 0.8, ...],  
    "context": "dinner_recommendations"
  }'

# Response:
{
  "score": 0.73,      # Similarity score with noise
  "confidence": 0.91, # Confidence level  
  "noise_level": 0.05 # Amount of noise added
}
```

### **Add New Preference**
```bash
curl -X POST "http://localhost:8000/api/preferences/add?user_id=USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I love spicy Thai food",
    "embedding": [0.1, -0.2, 0.8, ...],
    "category_slug": "food",
    "strength": 1.0
  }'
```

### **Manage App Permissions**
```bash
# Grant read access to food category
curl -X POST "http://localhost:8000/api/permissions/update?user_id=USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "APP_UUID",
    "category_id": "food",  
    "can_read": true,
    "can_write": false
  }'
```

---

## UI Customization

### **Dark Theme Integration**

The frontend uses a carefully crafted dark theme:

```css
/* globals.css */
:root {
  --background: #0a0a0a;      /* Almost black */
  --primary: #8b5cf6;         /* Purple accent */
  --primary-hover: #a855f7;   /* Lighter purple */
  --text: #f8fafc;            /* Near white */
  --muted: #64748b;           /* Muted gray */
}
```

### **Component Architecture**
```typescript
// Example: Preference Card Component
interface PreferenceCardProps {
  preference: {
    id: string;
    text: string; 
    strength: number;
    category: string;
    sources: PreferenceSource[];
  };
  onEdit: () => void;
  onDelete: () => void;
}
```

---

## Security & Privacy

### **Privacy Guarantees**
- **Client-side embeddings** - Raw text never leaves user device
- **Noise injection** - Prevents exact preference reconstruction  
- **OAuth 2.0** - Secure app authorization
- **API key rotation** - Apps can refresh credentials
- **Granular permissions** - Per-app, per-category access control

### **Security Best Practices**
- Input validation via Pydantic schemas
- SQL injection prevention via Tortoise ORM
- Rate limiting (100 queries/hour/app/user)
- Audit logging for all operations
- No raw API keys in logs

---

## Environment Configuration

### **Backend (.env)**
```bash
# Database
DATABASE_URL=postgresql://vault:vault@localhost:5432/vault

# Game Theory Parameters  
NOISE_BASE_LEVEL=0.1
SIMILARITY_THRESHOLD=0.85
DECAY_HALF_LIFE_DAYS=14

# Performance
EMBEDDING_DIMENSIONS=384
MAX_EMBEDDING_BATCH_SIZE=100

# Security
JWT_SECRET=your-secret-key-here
API_RATE_LIMIT_RPH=100
```

### **Frontend (.env.local)**
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Embedding Service
NEXT_PUBLIC_EMBEDDING_MODEL=snowflake-arctic-embed-s-q0f32-MLC-b32

# OAuth
NEXT_PUBLIC_OAUTH_CLIENT_ID=vault_dashboard_client
```

---

## Troubleshooting

### **Common Issues**

#### Backend Won't Start
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -l | grep vault

# Check Python dependencies
pip install -r requirements.txt

# Reset migrations if needed
rm -rf migrations/ && aerich init-db
```

#### Frontend Build Fails
```bash
# Clear Next.js cache
rm -rf .next/

# Reinstall dependencies  
rm -rf node_modules/ package-lock.json
npm install

# Check for TypeScript errors
npm run typecheck
```

#### Web LLM Loading Issues
```bash
# Check browser compatibility
# - Chrome/Edge 113+ recommended
# - Safari 16.4+ with WebAssembly features enabled
# - Firefox may require about:config tweaks

# Clear browser cache and reload
# Check browser console for detailed error messages
```

#### Database Connection Issues
```bash
# Verify DATABASE_URL format
postgresql://username:password@host:port/database

# Test connection
psql "postgresql://vault:vault@localhost:5432/vault" -c "SELECT 1;"

# Check PostgreSQL logs
tail -f /usr/local/var/log/postgresql@14.log  # macOS example
```

### **Performance Optimization**

#### Database Indexing
```sql
-- Add custom indexes for better query performance
CREATE INDEX idx_preferences_embedding ON user_preferences USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_preferences_user_category ON user_preferences (user_id, category_id);
CREATE INDEX idx_query_log_app_user_timestamp ON query_log (app_id, user_id, timestamp);
```

#### Frontend Optimization
```typescript
// Lazy load embedding service for better initial page load
const embeddingService = lazy(() => import('@/lib/services/embeddings'));

// Batch API calls when possible
const batchedQueries = await Promise.all([
  api.getPreferences(),
  api.getApps(), 
  api.getPermissions()
]);
```

---

## Integration Examples

### **Basic App Integration**

```typescript
// 1. Install Vault client
npm install @vault/client

// 2. Initialize with OAuth
import { VaultClient } from '@vault/client';

const vault = new VaultClient({
  clientId: 'your_app_client_id',
  redirectUri: 'http://localhost:3000/auth/callback',
  apiUrl: 'http://localhost:8000'
});

// 3. Query preferences
const foodScore = await vault.queryPreference(
  "spicy Italian food recommendations",
  { context: "dinner_suggestions" }
);

if (foodScore > 0.7) {
  // Show spicy Italian restaurants
}
```

### **Desktop Integration (MCP)**

```bash
# 1. Setup desktop app
cd vault-desktop
python run_desktop_app.py

# 2. Configure Claude Desktop
# Add to ~/.config/claude-desktop/config.json:
{
  "mcpServers": {
    "vault": {
      "command": "python",
      "args": ["/path/to/vault-desktop/src/vault_mcp_server.py"]
    }
  }
}
```

### **Advanced: Custom Embedding Models**

```typescript
// Replace default embedding service
class CustomEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Use your preferred embedding model
    // Must output 384-dimensional vectors to match database
    const response = await fetch('/your-embedding-api', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    return response.json();
  }
}
```

---

## Monitoring & Analytics

### **Built-in Analytics**

The dashboard provides comprehensive analytics:

- **Preference Distribution** - By category and strength
- **App Usage** - Query frequency and contribution rates  
- **Privacy Health** - Noise levels and data protection status
- **Temporal Analysis** - Preference evolution over time

### **Custom Analytics**

Query the database directly for custom insights:

```sql
-- Most active preference categories
SELECT 
  pc.name,
  COUNT(up.id) as preference_count,
  AVG(up.strength) as avg_strength
FROM user_preferences up
JOIN preference_categories pc ON up.category_id = pc.id  
GROUP BY pc.name
ORDER BY preference_count DESC;

-- App engagement metrics
SELECT 
  a.name,
  COUNT(DISTINCT ql.user_id) as unique_users,
  COUNT(ql.id) as total_queries,
  AVG(ql.result) as avg_score
FROM query_log ql
JOIN apps a ON ql.app_id = a.id
WHERE ql.timestamp > NOW() - INTERVAL '30 days'
GROUP BY a.name;
```

---

## Deployment

### **Production Setup**

#### Backend Deployment
```bash
# 1. Install production dependencies
pip install gunicorn

# 2. Set production environment variables
export DATABASE_URL=postgresql://user:pass@prod-host:5432/vault
export ENVIRONMENT=production

# 3. Run with Gunicorn
gunicorn main:api -w 4 -k uvicorn.workers.UvicornWorker
```

#### Frontend Deployment  
```bash
# 1. Build for production
npm run build

# 2. Start production server
npm start

# Or deploy to Vercel
vercel deploy
```

#### Database Migration
```bash
# Production migration workflow
aerich upgrade  # Apply pending migrations
python seed/seed_database.py --production  # Seed production data
```

### **Environment Variables**

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure random string for token signing

**Optional:**
- `NOISE_BASE_LEVEL=0.1` - Base noise level for queries
- `SIMILARITY_THRESHOLD=0.85` - Cosine similarity for merging preferences  
- `DECAY_HALF_LIFE_DAYS=14` - Temporal decay rate
- `API_RATE_LIMIT_RPH=100` - Queries per hour per app per user

---

## Contributing

### **Development Principles**

1. **Privacy First** - All user data processing happens client-side when possible
2. **Performance** - Sub-100ms API responses, efficient vector operations
3. **Security** - Comprehensive input validation, secure authentication
4. **Extensibility** - Plugin architecture for custom embedding models

### **Code Style**

**Backend (Python):**
- Follow PEP 8 style guidelines
- Use Tortoise ORM for all database operations
- Comprehensive error handling with proper HTTP status codes
- Type hints for all function parameters and returns

**Frontend (TypeScript):**
- Strict TypeScript configuration
- ESLint + Prettier for consistent formatting  
- React 19 best practices
- Tailwind CSS for styling

### **Pull Request Process**

1. **Feature Branch** - Create from `main`
2. **Implementation** - Follow existing patterns and conventions
3. **Testing** - Add unit tests for new functionality
4. **Documentation** - Update API docs and README as needed
5. **Review** - Ensure security and privacy principles are maintained

---

## Additional Resources

### **API Documentation**
- **Interactive Docs**: http://localhost:8000/docs
- **Schema Export**: http://localhost:8000/openapi.json

### **Architecture Decisions**  
- See `CLAUDE.md` for detailed technical specifications
- Review `backend/app/models/` for database schema
- Check `frontend/lib/services/` for client-side implementations

### **Example Integrations**
- **Demo App**: Complete OAuth + UI personalization example
- **Desktop MCP**: Claude integration via Model Context Protocol
- **API Examples**: See `demo/test_integration.py`

---

## Roadmap

### **Phase 1: MVP** (Completed)
- [x] Core preference storage with embeddings
- [x] Basic similarity matching  
- [x] OAuth 2.0 authentication
- [x] Dashboard UI
- [x] Demo application

### **Phase 2: Intelligence** (In Progress)
- [x] Semantic similarity merging
- [x] Game theory anti-gaming
- [x] Temporal decay system
- [ ] Advanced privacy transformations
- [ ] Machine learning preference prediction

### **Phase 3: Scale** (Planned)
- [ ] Homomorphic encryption for queries
- [ ] Multi-region deployment
- [ ] Enterprise permission management
- [ ] Advanced analytics and insights
- [ ] Plugin ecosystem for custom models

---

**Questions?** Check the troubleshooting section above or review the comprehensive API documentation at `/docs` when running the backend.

---

*Vault - Making personalization universal, private, and instant.*