# 🔧 Demo Troubleshooting Guide

## Common Issues & Solutions

### 1. OAuth Flow Issues

**Problem**: "Authentication failed" or OAuth redirect doesn't work
**Solutions**:
- Ensure backend is running on `http://localhost:8000`
- Check that database seeder created OAuth client: `vault_demo_client_123789`
- Verify redirect URI matches exactly: `http://localhost:3001/auth/callback`
- Clear browser localStorage and try again

**Check OAuth client exists**:
```sql
SELECT * FROM oauth_clients WHERE client_id = 'vault_demo_client_123789';
```

### 2. Web LLM Loading Issues

**Problem**: "Failed to load AI model" error
**Solutions**:
- Ensure your browser supports WebAssembly and Web Workers
- Check browser console for specific WebGL/WASM errors
- Try in Chrome/Edge (best WebAssembly support)
- Clear browser cache and reload

**Fallback**: App will still work with direct preference score analysis

### 3. Preference Query Failures

**Problem**: No preferences detected or query errors
**Solutions**:
- Verify demo user exists with ID: `fbed8e21-f47c-4ad7-9748-72eda644c8ae`
- Check that UI preferences were seeded in database
- Ensure preference API endpoints are accessible

**Check demo user preferences**:
```sql
SELECT up.text, up.strength, pc.name 
FROM user_preferences up 
JOIN preference_categories pc ON up.category_id = pc.id 
WHERE up.user_id = 'fbed8e21-f47c-4ad7-9748-72eda644c8ae' 
AND pc.slug = 'ui-ux';
```

### 4. API Connection Issues

**Problem**: API requests fail with CORS or network errors
**Solutions**:
- Check backend CORS settings include `http://localhost:3001`
- Verify backend routes are properly registered
- Test API endpoints manually with curl

**Test API health**:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/categories/
```

### 5. Port Conflicts

**Problem**: Demo won't start due to port conflicts
**Solutions**:
- Check if port 3001 is already in use: `lsof -i :3001`
- Kill conflicting process or change port in package.json
- Ensure main Vault frontend isn't running on 3001

### 6. Database Connection Issues

**Problem**: Database queries fail
**Solutions**:
- Ensure PostgreSQL is running
- Verify DATABASE_URL environment variable
- Run database migrations: `aerich upgrade`
- Check database permissions

### 7. Embedding Service Issues

**Problem**: Embedding generation fails
**Solutions**:
- Check browser console for JavaScript errors
- Verify SimpleEmbeddingService imports correctly
- Test with different query strings

## Debug Mode

Enable detailed logging by adding to localStorage:
```javascript
localStorage.setItem('vault_debug', 'true');
```

## Manual Testing Steps

### 1. Test OAuth Flow
1. Visit `http://localhost:3001`
2. Click "Connect with Vault"
3. Should redirect to `http://localhost:8000/api/oauth/authorize`
4. Should show authorization page
5. After approval, should redirect back with token

### 2. Test Preference Analysis
1. After authentication, check browser console
2. Should see "🔍 Query results:" with scores
3. Should see "🤖 LLM Response:" with JSON
4. UI should update with detected preferences

### 3. Test UI Changes
1. Dark mode should change background/text colors
2. Large fonts should increase text size
3. Transitions should be smooth (300-500ms)
4. Preferences panel should show correct status

## Reset Demo State

To reset the demo to a clean state:
```bash
# Clear browser data
# In browser console:
localStorage.clear();
location.reload();

# Or reset database
cd ../backend
python seed/seed_database.py  # Will skip existing records
```

## Contact & Support

If issues persist:
1. Check the main Vault backend logs
2. Review browser console errors
3. Test individual API endpoints
4. Compare with working frontend implementation