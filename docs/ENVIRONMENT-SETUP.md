# Inline AI Editor - Environment Setup Guide

Complete step-by-step guide for configuring all required environment variables for the Inline AI Editor feature.

---

## 📋 Overview

The Inline AI Editor requires four environment variables to function:

| Variable                | Purpose                | Where to Get    | Required For     |
| ----------------------- | ---------------------- | --------------- | ---------------- |
| `GITHUB_TOKEN`          | Create GitHub issues   | GitHub Settings | All environments |
| `OPENAI_API_KEY`        | AI request structuring | OpenAI Platform | All environments |
| `BLOB_READ_WRITE_TOKEN` | Screenshot storage     | Vercel Blob     | All environments |
| `NEXT_PUBLIC_INLINE_AI` | Enable/disable widget  | Manual          | Preview/Dev only |

**Estimated setup time**: 15-20 minutes

---

## 1️⃣ GitHub Personal Access Token

### Purpose

The GitHub token allows the API route to create issues in your repository when users submit change requests.

### Step-by-Step Setup

**Step 1: Navigate to GitHub Settings**

- Go to <https://github.com/settings/tokens?type=beta>
- Or: Click your profile → Settings → Developer settings → Personal access tokens → Fine-grained tokens

**Step 2: Generate New Token**

Click the **"Generate new token"** button (green button, top right)

**Step 3: Configure Token Settings**

Fill out the form with these exact settings:

- **Token name**: `vercel-spine-inline-ai` (or your preferred descriptive name)
- **Description** (optional): `Token for Inline AI Editor to create GitHub issues`
- **Expiration**:
  - Recommended: `90 days` (balance between security and convenience)
  - Alternative: `Custom` → 1 year (set calendar reminder to renew)
- **Repository access**: Select **"Only select repositories"**
  - Click the dropdown and select: `Maxwell-Software-Solutions/Vercel-spine`
  - ✅ Only your project, not all repositories

**Step 4: Set Permissions**

Scroll down to "Repository permissions" section:

- Expand **"Issues"** dropdown
- Select: **"Read and write"** (green checkmark will appear)
- ⚠️ Important: Leave ALL other permissions as "No access"
  - Contents: No access
  - Metadata: Read-only (this is default and fine)
  - Pull requests: No access
  - All others: No access

**Step 5: Generate Token**

- Scroll to bottom
- Click **"Generate token"** (green button)
- GitHub will show you the token once

**Step 6: Copy Token**

- The token will be displayed (starts with `ghp_` followed by 40 random characters)
- Example format: `ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`
- Click the **copy icon** or manually select and copy the entire token
- ⚠️ **CRITICAL**: This is shown only once! If you lose it, you must regenerate

**Step 7: Store Token Securely**

**For local development:**

Open `.env.local` in your project root and add:

```bash
GITHUB_TOKEN=ghp_your_actual_token_paste_here_40_characters
```

**For Vercel deployment:**

1. Go to <https://vercel.com/dashboard>
2. Select your `Vercel-spine` project
3. Click **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Fill in:
   - **Key**: `GITHUB_TOKEN`
   - **Value**: Paste your token
   - **Environments**: Check ✅ Preview, ✅ Development
   - (Optional: ✅ Production if you enable widget there)
6. Click **"Save"**

### Verification

Test the token is working:

```bash
# In terminal, with your token:
curl -H "Authorization: Bearer ghp_your_token_here" \
  https://api.github.com/repos/Maxwell-Software-Solutions/Vercel-spine/issues

# Should return JSON list of issues (or empty array)
# If you get 401: Token invalid
# If you get 404: Token doesn't have repo access
```

### Security Best Practices

✅ **DO:**

- Use fine-grained tokens (more secure than classic PATs)
- Set short expiration (90 days max)
- Limit to single repository
- Store in `.env.local` (already in `.gitignore`)
- Rotate token every 90 days

❌ **DON'T:**

- Commit tokens to git
- Use classic tokens (they're deprecated)
- Grant write access to Contents, Code, or Workflows
- Share tokens between projects
- Use personal account tokens for production (use GitHub App instead)

### Troubleshooting

| Error                 | Cause                     | Solution                                 |
| --------------------- | ------------------------- | ---------------------------------------- |
| `401 Unauthorized`    | Invalid/expired token     | Regenerate token                         |
| `403 Forbidden`       | Missing issues permission | Check token has "Issues: read and write" |
| `404 Not Found`       | Token can't access repo   | Add repository to token's access list    |
| `rate limit exceeded` | Too many API calls        | Wait 1 hour or upgrade to GitHub Pro     |

### Token Rotation

When token expires (or proactively every 90 days):

1. Generate new token following steps above (same permissions)
2. Update `.env.local` with new token
3. Update Vercel environment variables
4. Revoke old token in GitHub settings
5. Redeploy Vercel (if needed for production)

---

## 2️⃣ OpenAI API Key

### Purpose

Powers the AI structuring engine that converts user descriptions into actionable, agent-ready GitHub issue specifications.

### Step-by-Step Setup

**Step 1: Create/Login to OpenAI Account**

- Go to <https://platform.openai.com/>
- If you don't have an account:
  - Click **"Sign up"**
  - Use email, Google, Microsoft, or Apple account
  - Verify your email address
- If you have an account: Click **"Log in"**

**Step 2: Add Payment Method** (Required)

OpenAI API requires a payment method even for low usage:

1. After logging in, click your profile (top right)
2. Select **"Settings"** → **"Billing"**
3. Click **"Add payment method"**
4. Enter credit card details
5. Click **"Add card"**

**No upfront charge** - you only pay for what you use (pay-as-you-go)

**Step 3: Set Usage Limits** (Highly Recommended)

Protect yourself from unexpected charges:

1. In Billing section, click **"Limits"**
2. Set **"Monthly budget"**: $10 (adjust based on needs)
3. Check ✅ **"Email notifications"**
   - Alert at 75%: $7.50 spent
   - Alert at 100%: $10 spent (API stops working)
4. Click **"Save"**

**Step 4: Generate API Key**

1. Click **"API keys"** in left sidebar
   - Or go to <https://platform.openai.com/api-keys>
2. Click **"+ Create new secret key"** (green button, top right)
3. Configure the key:
   - **Name**: `vercel-spine-inline-ai`
   - **Project**: Select "Default project" or create new
   - **Permissions**: Select **"All"** (or "Write" if available)
4. Click **"Create secret key"**

**Step 5: Copy the Key**

- OpenAI displays the key once (starts with `sk-proj-` or `sk-`)
- Example format: `sk-proj-Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12Wx34Yz56...` (much longer)
- Click **"Copy"** button
- ⚠️ **Store immediately** - you cannot view it again!

**Step 6: Store Key Securely**

**For local development:**

Open `.env.local` and add:

```bash
OPENAI_API_KEY=sk-proj-paste_your_full_key_here_very_long_string
```

**For Vercel deployment:**

1. Vercel Dashboard → Your project → Settings → Environment Variables
2. Add new variable:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Paste your full API key
   - **Environments**: ✅ Preview, ✅ Development, ✅ Production
3. Save

### Cost Estimation

The Inline AI Editor uses GPT-4o for request structuring:

**GPT-4o Pricing** (as of Oct 2023):

- Input: $0.005 per 1,000 tokens (~750 words)
- Output: $0.015 per 1,000 tokens

**Typical request costs:**

- Single inline AI request: ~500 input + 200 output tokens = **$0.006** (~0.6¢)
- 50 requests/month: **$0.30/month**
- 200 requests/month: **$1.20/month**

**Recommended budget**: Set $10/month limit for safety (covers ~1,600 requests)

### Verification

Test your API key:

```bash
# Using curl (replace with your key):
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-your-key-here"

# Should return JSON list of available models
# If error: Check key is copied correctly (no spaces)
```

Or test in your app:

1. Start dev server: `pnpm dev`
2. Open widget, select element, describe change
3. Check console logs for AI response

### Monitoring Usage

Track your API usage to avoid surprises:

1. Go to <https://platform.openai.com/usage>
2. View daily/monthly usage graphs
3. See cost per request
4. Download detailed usage reports

Set up **daily email summaries**:

- Settings → Billing → Email preferences
- Check ✅ "Daily usage summaries"

### Troubleshooting

| Error                 | Cause                     | Solution                                 |
| --------------------- | ------------------------- | ---------------------------------------- |
| `401 Invalid API key` | Wrong key or expired      | Regenerate key in OpenAI dashboard       |
| `429 Rate limit`      | Too many requests         | Wait or upgrade to higher tier           |
| `insufficient_quota`  | No credits/payment method | Add payment method or top up             |
| `model_not_found`     | Using wrong model name    | Check code uses `gpt-4o`                 |
| `timeout`             | Network/OpenAI issues     | Retry request or check status.openai.com |

### Security Best Practices

✅ **DO:**

- Set monthly spending limits
- Enable usage alerts
- Rotate keys periodically (every 6-12 months)
- Use environment variables (never hardcode)
- Monitor usage dashboard weekly

❌ **DON'T:**

- Commit keys to git
- Share keys across projects
- Use same key for dev and prod
- Ignore usage alerts
- Skip payment method verification

### Cost Optimization Tips

1. **Cache responses** (future enhancement):
   - Store common requests/responses
   - Reuse similar issue structures

2. **Use cheaper models** for testing:
   - Development: Consider GPT-3.5-turbo ($0.001/request)
   - Production: GPT-4o for best quality

3. **Implement rate limiting**:
   - Prevent abuse (already in plan)
   - 5 requests/hour per user

---

## 3️⃣ Vercel Blob Storage Token

### Purpose

Stores screenshot images of selected elements so they can be embedded in GitHub issues.

### Step-by-Step Setup

**Step 1: Open Vercel Dashboard**

- Go to <https://vercel.com/dashboard>
- Log in with your account
- Select your **Vercel-spine** project from the list

**Step 2: Navigate to Storage**

- Click the **"Storage"** tab in the top navigation bar
- Or go directly: `https://vercel.com/[your-team]/vercel-spine/stores`

**Step 3: Create Blob Store**

First time setup:

1. Click **"Create Database"** button (if you have no stores)
2. You'll see storage type options:
   - Postgres
   - **Blob** ← Select this one
   - KV
   - Edge Config
3. Click on **"Blob"**

**Step 4: Configure Blob Store**

Fill in the creation form:

- **Store Name**: `inline-ai-screenshots` (or your preference)
  - Note: This is for your reference, doesn't affect functionality
- **Region**: Choose closest to your users
  - Options: Washington D.C., San Francisco, Frankfurt, etc.
  - Recommended: Same as your Vercel project deployment region
- **Pricing**: Free tier selected by default
  - 1 GB storage
  - Unlimited bandwidth
  - No credit card required for free tier

Click **"Create"**

**Step 5: Access Environment Variables**

After creation, Vercel automatically:

1. Shows the store dashboard
2. Displays the **"Environment Variables"** section
3. Auto-generates `BLOB_READ_WRITE_TOKEN`

You'll see:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Step 6: Copy Token for Local Development**

The token is automatically injected into your Vercel deployments, but for local dev:

1. In the Blob store dashboard, find the token
2. Click the **"Copy"** icon next to `BLOB_READ_WRITE_TOKEN`
3. Open your `.env.local` file
4. Add:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_paste_your_token_here
```

**Step 7: Verify Vercel Deployment Variables**

Ensure the token is available in your deployments:

1. Go to Project → **Settings** → **Environment Variables**
2. You should see `BLOB_READ_WRITE_TOKEN` already listed
   - ✅ If it's there: You're all set!
   - ❌ If missing:
     - Go back to Storage → Your blob store
     - Click "Connect to Project"
     - Select environments (Preview, Development, Production)

### Storage Details

**Free Tier Limits:**

- **Storage**: 1 GB total
- **Bandwidth**: Unlimited (no download limits)
- **Files**: Up to 500 MB per file
- **Requests**: Unlimited

**Typical Screenshot Sizes:**

- Average screenshot: 50-200 KB
- 1 GB = ~5,000-20,000 screenshots
- For normal usage, free tier is sufficient

**Pricing (if you exceed free tier):**

- Storage: $0.15 per GB per month
- Bandwidth: Free (unlimited)
- Example: 5 GB storage = $0.75/month

### File Management

View stored files:

1. Go to Storage → Your blob store
2. Click **"Browse"** tab
3. See all uploaded files with:
   - Filename
   - Size
   - Upload date
   - URL

Delete old files:

- Click file → **"Delete"**
- Or use Vercel CLI: `vercel blob rm <filename>`

### Verification

Test blob storage is working:

1. Start your dev server: `pnpm dev`
2. Open the Inline AI widget
3. Select an element (screenshot is captured)
4. Submit a change request
5. Check console logs for: "Screenshot uploaded: https://..."
6. Visit the URL to see your screenshot
7. Go to Vercel Dashboard → Storage → Browse to see the file

### Code Configuration

The Blob integration is already configured in your API route:

```typescript
// app/api/ai-change-request/route.ts
import { put } from '@vercel/blob';

const uploaded = await put(filename, buf, {
  access: 'public', // Anyone with URL can view
  token: process.env.BLOB_READ_WRITE_TOKEN,
  addRandomSuffix: false, // Use exact filename
});

screenshotUrl = uploaded.url; // https://[hash].public.blob.vercel-storage.com/...
```

### Advanced Configuration (Optional)

Customize blob upload behavior:

```typescript
const uploaded = await put(filename, buf, {
  access: 'public', // or 'private' (requires signed URLs)
  token: process.env.BLOB_READ_WRITE_TOKEN,
  addRandomSuffix: true, // Add random chars to filename (prevent duplicates)
  cacheControlMaxAge: 31536000, // Cache for 1 year (seconds)
  contentType: 'image/png', // Explicit content type
});
```

### Cleanup Strategy (Recommended)

Implement automatic cleanup to manage storage:

1. **Time-based deletion**: Delete screenshots older than 90 days
2. **Issue-linked cleanup**: When GitHub issue closes, delete its screenshot
3. **Manual cleanup**: Periodically review and delete unused files

Example cleanup script (future enhancement):

```typescript
// scripts/cleanup-old-screenshots.ts
import { list, del } from '@vercel/blob';

const files = await list();
const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

for (const file of files.blobs) {
  if (file.uploadedAt < ninetyDaysAgo) {
    await del(file.url);
    console.log(`Deleted: ${file.pathname}`);
  }
}
```

### Troubleshooting

| Error                    | Cause                   | Solution                                      |
| ------------------------ | ----------------------- | --------------------------------------------- |
| `Missing token`          | Token not in .env.local | Copy token from Vercel dashboard              |
| `403 Forbidden`          | Invalid/expired token   | Regenerate token (Storage → Store → Settings) |
| `413 Payload Too Large`  | File > 500 MB           | Screenshots should be <5 MB; check code       |
| `Storage limit exceeded` | Over 1 GB               | Delete old files or upgrade plan              |
| `Upload failed`          | Network/Vercel issue    | Retry or check Vercel status page             |

### Security Notes

✅ **Public access is safe because:**

- URLs are unguessable (random hashes)
- No directory listing enabled
- Screenshots are non-sensitive (UI elements)
- Required for embedding in GitHub issues

⚠️ **If screenshots contain sensitive data:**

- Change `access: 'public'` to `access: 'private'`
- Generate signed URLs with expiration
- Consider alternative storage (S3 with auth)

---

## 4️⃣ Feature Flag (NEXT_PUBLIC_INLINE_AI)

### Purpose

Controls whether the Inline AI Editor widget appears on your site. Since this is a client-side variable (`NEXT_PUBLIC_`), it's baked into the build at compile time.

### Environment Strategy

Different values for different environments:

| Environment     | Value       | Reason                                    |
| --------------- | ----------- | ----------------------------------------- |
| **Production**  | `0` or omit | Widget hidden from public users           |
| **Preview**     | `1`         | Enable for testing on preview deployments |
| **Development** | `1`         | Enable for local testing                  |

### Setup Instructions

**For Local Development:**

Edit `.env.local`:

```bash
# Enable widget in local development
NEXT_PUBLIC_INLINE_AI=1
```

To test "production mode" locally (widget hidden):

```bash
# Temporarily disable widget
NEXT_PUBLIC_INLINE_AI=0
```

Restart dev server after changing: `pnpm dev`

**For Vercel Deployments:**

Set per-environment:

1. Go to Vercel Dashboard → Your project → **Settings** → **Environment Variables**

2. Add three separate entries:

**Entry 1: Production (disabled)**

- Key: `NEXT_PUBLIC_INLINE_AI`
- Value: `0` (or leave blank)
- Environment: ✅ Production only
- Click Save

**Entry 2: Preview (enabled)**

- Key: `NEXT_PUBLIC_INLINE_AI`
- Value: `1`
- Environment: ✅ Preview only
- Click Save

**Entry 3: Development (enabled)**

- Key: `NEXT_PUBLIC_INLINE_AI`
- Value: `1`
- Environment: ✅ Development only
- Click Save

### How It Works

The code in `app/layout.tsx` checks the flag:

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Only show inline AI editor when explicitly enabled
  const showInlineAI = process.env.NEXT_PUBLIC_INLINE_AI === '1';

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {showInlineAI && <AiInlineRequest />}  {/* Widget renders only if flag = 1 */}
      </body>
    </html>
  );
}
```

### Testing the Flag

**Test widget is visible:**

1. Set `NEXT_PUBLIC_INLINE_AI=1` in `.env.local`
2. Restart dev server: `pnpm dev`
3. Open `http://localhost:3000`
4. Look for floating blue widget in bottom-right corner
5. ✅ Success if you see "✨ Inline AI Editor"

**Test widget is hidden:**

1. Set `NEXT_PUBLIC_INLINE_AI=0` in `.env.local`
2. Restart dev server: `pnpm dev`
3. Open `http://localhost:3000`
4. Widget should NOT appear
5. Check browser console - no errors related to AiInlineRequest

### Important: Build-Time vs Runtime

⚠️ **Key concept**: `NEXT_PUBLIC_` variables are **build-time** only:

- Value is baked into JavaScript bundle during build
- Changing after build has no effect
- Must redeploy to change value

**This means:**

- Preview deployments: Build with `NEXT_PUBLIC_INLINE_AI=1` → widget visible
- Production deployments: Build with `NEXT_PUBLIC_INLINE_AI=0` → widget hidden
- Can't change without redeploying

### Security Implications

**Why disable in production?**

1. **Unauthorized access**: Anyone could use the widget
2. **API abuse**: Users could spam GitHub issues
3. **Cost**: Unnecessary OpenAI API calls
4. **Confusion**: Regular users shouldn't see admin tools

**Proper security layers:**

1. ✅ Feature flag (NEXT_PUBLIC_INLINE_AI=0 in production)
2. ✅ Authentication middleware (recommended addition)
3. ✅ Rate limiting on API route (recommended addition)
4. ✅ GitHub token permissions (only issues)

### Advanced: Authentication (Future Enhancement)

For production with widget enabled, add auth:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/ai-change-request')) {
    const session = request.cookies.get('admin-session');
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  return NextResponse.next();
}
```

### Troubleshooting

| Issue                        | Cause                      | Solution                                         |
| ---------------------------- | -------------------------- | ------------------------------------------------ |
| Widget not appearing         | Flag not set to `1`        | Check `.env.local` has `NEXT_PUBLIC_INLINE_AI=1` |
| Widget showing in production | Flag set to `1` in prod    | Change to `0` in Vercel env vars, redeploy       |
| Changes not taking effect    | Forgot to restart          | Restart dev server after .env changes            |
| Vercel deployment wrong      | Wrong environment selected | Check env var is set for correct environment     |

---

## ✅ Complete Checklist

Use this to verify all environment variables are configured:

### Local Development (.env.local)

```bash
# GitHub Configuration
GITHUB_OWNER=Maxwell-Software-Solutions
GITHUB_REPO=Vercel-spine
GITHUB_TOKEN=ghp_[40_characters]

# OpenAI API
OPENAI_API_KEY=sk-proj-[very_long_string]

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_[random_string]

# Feature Flag
NEXT_PUBLIC_INLINE_AI=1
```

- [ ] `.env.local` file exists in project root
- [ ] All four variables are present
- [ ] No placeholder values (xxx, your_key_here, etc.)
- [ ] File is in `.gitignore` (verify it won't be committed)

### Vercel Environment Variables

Go to: Project → Settings → Environment Variables

**For Preview Environment:**

- [ ] `GITHUB_TOKEN` = your token | ✅ Preview
- [ ] `OPENAI_API_KEY` = your key | ✅ Preview
- [ ] `BLOB_READ_WRITE_TOKEN` = auto-added | ✅ Preview
- [ ] `NEXT_PUBLIC_INLINE_AI` = 1 | ✅ Preview

**For Development Environment:**

- [ ] `GITHUB_TOKEN` = your token | ✅ Development
- [ ] `OPENAI_API_KEY` = your key | ✅ Development
- [ ] `BLOB_READ_WRITE_TOKEN` = auto-added | ✅ Development
- [ ] `NEXT_PUBLIC_INLINE_AI` = 1 | ✅ Development

**For Production Environment:**

- [ ] `GITHUB_TOKEN` = your token | ✅ Production (if enabling widget)
- [ ] `OPENAI_API_KEY` = your key | ✅ Production (if enabling widget)
- [ ] `BLOB_READ_WRITE_TOKEN` = auto-added | ✅ Production
- [ ] `NEXT_PUBLIC_INLINE_AI` = 0 or omitted | Production

### External Services

- [ ] GitHub fine-grained token created with Issues permission
- [ ] OpenAI account created with payment method added
- [ ] OpenAI monthly budget limit set ($10 recommended)
- [ ] Vercel Blob store created for project
- [ ] All tokens/keys stored securely (password manager recommended)

### Verification Tests

- [ ] Dev server starts without errors: `pnpm dev`
- [ ] Widget appears at `http://localhost:3000` (bottom-right)
- [ ] Can click "Pick Element" and select an element
- [ ] Can type description and submit
- [ ] GitHub issue is created successfully
- [ ] Screenshot appears in GitHub issue
- [ ] No errors in browser console
- [ ] No errors in terminal logs

---

## 🆘 Getting Help

If you encounter issues:

1. **Check this guide** - Re-read the relevant section
2. **Verify all values** - Use the checklist above
3. **Test individual components**:
   - GitHub token: Use curl test from section 1
   - OpenAI key: Use curl test from section 2
   - Vercel Blob: Check Storage tab in Vercel dashboard
4. **Check error messages** - Browser console and terminal logs
5. **Review implementation docs** - See `INLINE-AI-IMPLEMENTATION.md`
6. **Troubleshooting sections** - Each section has common errors

### Common Issues & Quick Fixes

**"Widget not showing"**
→ Check `NEXT_PUBLIC_INLINE_AI=1` and restart dev server

**"401 Unauthorized from GitHub"**
→ Regenerate GitHub token with correct permissions

**"429 Rate limit from OpenAI"**
→ Wait 60 seconds or upgrade OpenAI account tier

**"Screenshot upload failed"**
→ Verify `BLOB_READ_WRITE_TOKEN` in .env.local

**"Module not found: @vercel/blob"**
→ Run `pnpm install` again

---

## 📚 Additional Resources

- [GitHub Fine-Grained Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Setup complete! You're ready to use the Inline AI Editor.** 🎉

Next: Read the [Usage Guide](./INLINE-AI-IMPLEMENTATION.md#usage) to learn how to create your first AI change request.
