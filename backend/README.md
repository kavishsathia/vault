# Vault Backend

Universal preference manager backend built with FastAPI and Tortoise ORM.

## Features

- **Preference Management**: Store, retrieve, and query user preferences with vector embeddings
- **Game Theory Anti-Gaming**: Noise injection based on query/contribution ratios
- **Temporal Decay**: Preferences naturally decay over time with configurable half-life
- **Semantic Similarity**: Smart merging of similar preferences using cosine similarity
- **Granular Permissions**: Two-dimensional permission system (apps × categories)
- **Usage Analytics**: Track app usage and contribution statistics

## Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Node.js (for frontend)

### Installation

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Set up database:
```bash
# Create PostgreSQL database
createdb vault

# Run migrations (if using Aerich)
aerich init -t main.TORTOISE_ORM
aerich init-db
```

5. Start development server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Preferences
- `GET /api/preferences/top` - Get user's top preferences with temporal decay
- `POST /api/preferences/add` - Add new preference or strengthen existing
- `GET /api/preferences/{id}` - Get detailed preference information
- `POST /api/preferences/query` - Query preferences with noise injection

### Apps
- `GET /api/apps/integrated` - Get apps integrated with user
- `GET /api/apps/{id}/preferences` - Get preferences contributed by app
- `POST /api/apps/create` - Create new app integration
- `GET /api/apps/{id}/stats` - Get app usage statistics

### Permissions
- `GET /api/permissions/user` - Get user's app permissions
- `POST /api/permissions/update` - Update app permissions
- `GET /api/permissions/matrix` - Get permission matrix for dashboard
- `DELETE /api/permissions/revoke` - Revoke app access
- `POST /api/permissions/grant-default` - Grant default permissions

### Categories
- `GET /api/categories/` - Get all preference categories
- `POST /api/categories/seed` - Seed initial categories

## Architecture

### Models

- **User**: Core user entity
- **App**: Third-party applications that integrate with Vault
- **PreferenceCategory**: Predefined preference categories (Food, Gaming, etc.)
- **UserPreference**: User's preferences with embeddings and strength
- **PreferenceSource**: Tracks which apps contributed each preference
- **UserAppPermission**: Granular permissions (app × category × read/write)
- **QueryLog**: Logs all preference queries for noise calculation

### Game Theory Mechanics

#### Noise Calculation
```python
noise = min(
    base_noise + (queries_made * query_multiplier),
    max_noise
) / max(1, validated_contributions * contribution_divisor)
```

#### Temporal Decay (Half-life: 14 days)
```python
decayed_strength = original_strength * (0.5 ^ (days_since_update / half_life_days))
```

#### Semantic Similarity (Cosine similarity > 0.85 merges preferences)
```python
similarity = dot_product(vec1, vec2) / (norm(vec1) * norm(vec2))
```

## Configuration

Key configuration parameters in `.env`:

- `NOISE_BASE_LEVEL`: Base noise level (default: 0.1)
- `SIMILARITY_THRESHOLD`: Threshold for merging preferences (default: 0.85)
- `DECAY_HALF_LIFE_DAYS`: Half-life for temporal decay (default: 14)
- `EMBEDDING_DIMENSIONS`: Expected embedding dimensions (default: 1536)

## Development

### Database Migrations

Using Aerich for migrations:

```bash
# Initialize Aerich (first time)
aerich init -t main.TORTOISE_ORM

# Generate migration
aerich migrate

# Apply migrations
aerich upgrade
```

### Running Tests

```bash
pytest tests/
```

### Code Style

```bash
# Format code
black .

# Lint code
flake8 .
```

## Production Deployment

1. Set `ENVIRONMENT=production` in `.env`
2. Use proper PostgreSQL instance
3. Set up SSL/TLS
4. Configure proper CORS origins
5. Use production ASGI server (Gunicorn + Uvicorn workers)

## Security Considerations

- API keys are auto-generated with secure random tokens
- All database queries use parameterized queries (Tortoise ORM)
- CORS properly configured for production origins
- Input validation on all endpoints
- Rate limiting implemented through game theory mechanics

## License

MIT License