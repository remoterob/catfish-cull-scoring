# Catfish Cull 2026 - Deployment Guide

Complete step-by-step instructions for deploying the scoring app to Supabase + Netlify.

## 📋 Prerequisites

- GitHub account
- Supabase account (free tier is fine)
- Netlify account (free tier is fine)
- Node.js 18+ installed locally
- Git installed

## Part 1: Set Up Supabase (Database & Backend)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if you don't have one)
4. Click "New Project"
5. Fill in:
   - **Name:** `catfish-cull-2026`
   - **Database Password:** (generate a strong one - save it!)
   - **Region:** Choose closest to Auckland, NZ
6. Click "Create new project" (takes ~2 minutes)

### Step 2: Run Database Migration

1. In your Supabase project, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Open the file `supabase/migrations/001_initial_schema.sql`
4. Copy ALL the contents
5. Paste into the Supabase SQL Editor
6. Click "Run" (bottom right)
7. You should see "Success. No rows returned"

### Step 3: Set Up Storage for Photos

1. Click "Storage" in the left sidebar
2. Click "Create a new bucket"
3. Name: `catch-photos`
4. Public bucket: ✅ **YES** (check this box)
5. Click "Create bucket"

6. Create another bucket:
7. Name: `assets`
8. Public bucket: ✅ **YES**
9. Click "Create bucket"

### Step 4: Upload Logos to Storage

1. Click on the `assets` bucket
2. Click "Upload file"
3. Upload `SNZ_file.avif` (rename to `snz-logo.avif`)
4. Upload `H_F.png` (rename to `sponsor-logo.png`)
5. Click each file and copy the public URL (you'll need these later)

### Step 5: Get Your Supabase API Keys

1. Click "Settings" (gear icon) in the left sidebar
2. Click "API" under Project Settings
3. Copy these values (you'll need them soon):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (the long string)

## Part 2: Set Up Resend (Email Service)

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free - 3,000 emails/month)
3. Verify your email

### Step 2: Add Your Domain (Optional but Recommended)

1. In Resend dashboard, click "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `catfishcull.co.nz`)
4. Follow DNS setup instructions
5. **OR** use Resend's test domain for now: `onboarding@resend.dev`

### Step 3: Get API Key

1. Click "API Keys" in Resend dashboard
2. Click "Create API Key"
3. Name: `Catfish Cull Production`
4. Permission: **Sending access**
5. Click "Create"
6. **COPY THE KEY NOW** (you can't see it again!)

## Part 3: Deploy to Netlify

### Step 1: Push Code to GitHub

1. Open terminal in the project folder
2. Run:
```bash
git init
git add .
git commit -m "Initial commit - Catfish Cull app"
git branch -M main
```

3. Go to GitHub and create a new repository:
   - Name: `catfish-cull-scoring`
   - Public or Private (your choice)
   - DON'T initialize with README

4. Copy the commands GitHub shows and run them:
```bash
git remote add origin https://github.com/YOUR-USERNAME/catfish-cull-scoring.git
git push -u origin main
```

### Step 2: Deploy on Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Authorize Netlify to access GitHub
5. Select `catfish-cull-scoring` repository
6. Build settings (should auto-detect):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
7. Click "Show advanced" → "New variable"

8. Add these environment variables:

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key-from-step-5
VITE_ADMIN_PASSWORD = YourSecurePassword123!
VITE_RESEND_API_KEY = re_your_resend_key
VITE_SNZ_LOGO_URL = https://xxxxx.supabase.co/storage/v1/object/public/assets/snz-logo.avif
VITE_SPONSOR_LOGO_URL = https://xxxxx.supabase.co/storage/v1/object/public/assets/sponsor-logo.png
```

9. Click "Deploy site"

### Step 3: Wait for Deployment

- Takes 2-5 minutes
- You'll get a URL like: `https://random-name-123.netlify.app`

### Step 4: Set Custom Domain (Optional)

1. In Netlify, click "Domain settings"
2. Click "Add custom domain"
3. Enter your domain (e.g., `catfishcull.co.nz`)
4. Follow DNS instructions
5. Enable HTTPS (automatic with Let's Encrypt)

## Part 4: Create Netlify Function for Emails

### Step 1: Create Function File

Create: `netlify/functions/send-results-email.js`

```javascript
import { Resend } from 'resend'

const resend = new Resend(process.env.VITE_RESEND_API_KEY)

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { emails, teamNumber, teamNames, catfishCount, division, heaviestFish, lightestFish, eligible } = JSON.parse(event.body)

    const emailContent = `
Hi ${teamNames},

Great diving today! Here are your ${eligible ? 'PROVISIONAL' : ''} results:

${!eligible ? '⚠️ Note: 3-person teams are not eligible for prizes or placements\n\n' : ''}
⚠️ IMPORTANT: These results are provisional and subject to 
protests and official review. Final results will be announced 
at prizegiving.

Team Number: #${teamNumber}
Division: ${division}
Catfish Count: ${catfishCount}

${heaviestFish ? `🏆 Heaviest Fish: ${heaviestFish}g` : ''}
${lightestFish ? `🏆 Lightest Fish: ${lightestFish}g` : ''}

⏰ Protest Period: Until 5:00 PM today
Final results announced at prizegiving: 6:30 PM

View the live leaderboard: ${process.env.URL}

See you at prizegiving!
Spearfishing New Zealand
    `

    const { data, error } = await resend.emails.send({
      from: 'Catfish Cull <noreply@catfishcull.co.nz>',
      to: emails,
      subject: `Your Catfish Cull Results - Team #${teamNumber} [PROVISIONAL]`,
      text: emailContent,
    })

    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error }) }
    }

    return { statusCode: 200, body: JSON.stringify({ data }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
```

### Step 2: Update package.json

Add to `dependencies`:
```json
"resend": "^3.0.0"
```

### Step 3: Redeploy

```bash
git add .
git commit -m "Add email function"
git push
```

Netlify will auto-deploy!

## Part 5: Testing

### Test the Public Leaderboard

1. Go to your Netlify URL
2. You should see the public leaderboard (empty at first)
3. Try switching between division tabs

### Test Admin Login

1. Click "Admin Login"
2. Enter the password you set in environment variables
3. You should see the admin dashboard

### Test Team Management

1. Click "Teams"
2. Click "Add Team"
3. Fill in details
4. Save
5. Team should appear in the list

### Test Weighmaster Interface

1. Click "Weighmaster"
2. Enter a team number
3. Enter catfish count
4. Add a photo (optional)
5. Submit
6. Check the leaderboard - score should appear immediately!

## Part 6: Going Live

### Before the Event (1 week prior):

1. Import all teams from TryBooking CSV
2. Assign team numbers
3. Export and print team list
4. Test the whole flow end-to-end

### Day of Event:

1. Open leaderboard on a big screen/TV
2. Admin uses weighmaster interface on tablet/laptop
3. Teams get instant email notifications
4. Public can watch live online

## 🔒 Security Notes

- Change `VITE_ADMIN_PASSWORD` to something secure
- Keep your API keys secret
- Never commit `.env` file to Git
- Use Netlify's environment variables (already protected)

## 📞 Support

If you run into issues:
1. Check Netlify deploy logs
2. Check Supabase logs (Database → Logs)
3. Check browser console for errors (F12)

## 🎉 You're Done!

Your app is now live and ready for Catfish Cull 2026!

URL Structure:
- Public: `https://your-site.netlify.app/`
- Admin: `https://your-site.netlify.app/admin`
