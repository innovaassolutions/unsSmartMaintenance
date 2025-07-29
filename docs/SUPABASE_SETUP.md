# Supabase Setup Guide

This guide will help you set up a Supabase project for the UNS Smart Maintenance system.

## Prerequisites

- Supabase account (sign up at [supabase.com](https://supabase.com))
- Supabase CLI installed globally

## Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit [app.supabase.com](https://app.supabase.com)
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Project name: `uns-smart-maintenance`
   - Database password: Use a strong password (save it securely)
   - Region: Choose closest to your location
   - Click "Create new project"

3. **Wait for Project Setup**
   - Project creation takes 2-3 minutes
   - You'll see a setup progress indicator

## Step 2: Get Project Credentials

Once your project is ready:

1. **Get Project URL**
   - Go to Settings → API
   - Copy the "Project URL" (looks like `https://xyz.supabase.co`)

2. **Get API Keys**
   - Copy the "anon/public" key
   - Copy the "service_role" key (keep this secret!)

## Step 3: Configure Environment Variables

1. **Update .env.local file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit .env.local with your values:**
   ```env
   # Replace with your actual Supabase project values
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
   ```

## Step 4: Verify Connection

Run the database connection tests:
```bash
npm test src/__tests__/database/supabase-connection.test.ts
```

## Step 5: Enable Required Extensions

In your Supabase dashboard:

1. **Go to Database → Extensions**
2. **Enable these extensions:**
   - `uuid-ossp` - For UUID generation
   - `timescaledb` - For time-series data (if available)
   - `pg_stat_statements` - For query performance monitoring

## Step 6: Set up Row Level Security (RLS)

1. **Go to Authentication → Settings**
2. **Enable Row Level Security** for all tables
3. **Set up policies** (will be handled by migrations)

## Security Notes

- ⚠️ **Never commit your actual .env.local file**
- ⚠️ **Keep your service_role key secret**
- ✅ **Use environment variables in production**
- ✅ **Enable RLS on all tables**

## Next Steps

After completing this setup:
1. Install Supabase CLI
2. Initialize Supabase locally
3. Run database migrations
4. Set up Prisma ORM

## Troubleshooting

### Connection Issues
- Verify your project URL and API keys
- Check if your project is fully initialized
- Ensure environment variables are loaded correctly

### Permission Issues
- Make sure RLS policies are configured
- Verify API key permissions
- Check user authentication status

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- Project repository issues