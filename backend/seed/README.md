# Database Seeding

This folder contains all the data and scripts needed to seed the Vault database with initial data.

## Structure

```
seed/
├── data/
│   ├── categories.json    # 10 preference categories
│   └── apps.json         # 5 sample apps with API keys
├── seed_database.py      # Main seeding script
└── README.md            # This file
```

## Usage

### Run the seeding script:

```bash
cd backend
python seed/seed_database.py
```

### What gets seeded:

1. **Preference Categories** (10 categories):
   - Food, Entertainment, Work & Productivity, UI/UX, Gaming
   - Social, Shopping, Health & Fitness, Travel, Learning

2. **Sample Apps** (5 apps):
   - FoodieApp (food recommendations)
   - SpotifyAI (music discovery)
   - WorkFlow (productivity)
   - GameRecommender (gaming)
   - TravelBuddy (travel planning)

### Features:

- ✅ **Idempotent**: Safe to run multiple times (won't create duplicates)
- ✅ **Informative**: Shows what's being created vs what already exists
- ✅ **Error handling**: Proper error messages and cleanup
- ✅ **Summary**: Shows total items created

### Sample Output:

```
🔐 Vault Database Seeding Script
========================================
🔌 Connecting to database...
🗂️  Seeding preference categories...
   ✅ Created category: Food
   ✅ Created category: Entertainment
   ↪ Category 'Gaming' already exists, skipping...
📊 Created 2 new categories

📱 Seeding sample apps...
   ✅ Created app: FoodieApp (API Key: vault_foodie_demo_key_123456)
   ↪ App 'SpotifyAI' already exists, skipping...
📊 Created 1 new apps

🎉 Seeding Complete!
   Categories created: 2
   Apps created: 1

✨ Your Vault database is now ready for use!
```

## Adding More Data

To add more seed data:

1. **Categories**: Edit `data/categories.json`
2. **Apps**: Edit `data/apps.json`
3. **New data types**: Create new JSON files and update `seed_database.py`

## API Keys

The sample apps include demo API keys for testing. In production, these should be:
- Randomly generated
- Stored securely
- Rotatable by app owners