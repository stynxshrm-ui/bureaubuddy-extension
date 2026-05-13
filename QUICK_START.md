# Next Steps – Quick Start Guide

You've just refactored from "user provides API key" to "backend handles everything." Here's exactly what to do next.

## 📋 Your Checklist (30 minutes)

### Step 1: Get an API Key (5 min)

Choose one:

**Option A: Google Gemini (Recommended - Free)**
1. Go to https://ai.google.dev
2. Click "Get API Key"
3. Create project or use existing
4. Generate and copy key
5. Paste it somewhere safe

**Option B: Anthropic Claude (Requires Payment)**
1. Go to https://console.anthropic.com
2. Add payment method
3. Create API key
4. Copy it

### Step 2: Deploy Backend to Vercel (10 min)

```bash
# 1. Install Vercel CLI (one-time)
npm install -g vercel

# 2. Go to backend folder
cd backend

# 3. Deploy
vercel

# 4. Follow prompts (link account, etc.)
# Note your domain: something.vercel.app
```

**Add API Key to Vercel:**
```bash
# In same backend folder:
vercel env add BB_MODEL
# Type: gemini (or anthropic)

vercel env add GOOGLE_API_KEY
# Paste your key

# Redeploy to apply changes
vercel
```

### Step 3: Update Extension URL (5 min)

Edit `src/background.js` line 5:

**Find this:**
```javascript
const BACKEND_API_URL = "https://api.bureaubuddy.se/api/analyze";
```

**Replace with:**
```javascript
const BACKEND_API_URL = "https://your-vercel-domain.vercel.app/api/analyze";
```

Use your actual Vercel domain (from deployment output).

### Step 4: Test Locally (5 min)

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the extension folder
5. Extension should appear

**Test it:**
1. Click extension icon → Popup should say "Ready to analyze – no setup needed"
2. Visit Gmail or Kivra
3. Highlight some text
4. Click "Explain this letter"
5. Should see analysis appear

Done! ✅

---

## 🎯 What Changed

### For Users
- **Before**: "Paste your Anthropic API key"
- **After**: "Ready to use!"
- No setup needed

### For You
- API key is now on your backend
- Rate limiting (5/month) enforced server-side
- Easy model switching (Gemini ↔ Claude)
- Ready for paid upgrades

---

## 📚 Documentation

- **`DEPLOYMENT_CHECKLIST.md`** — Detailed step-by-step with troubleshooting
- **`backend/SETUP.md`** — Deployment guide with local testing
- **`backend/ARCHITECTURE.md`** — Design overview & decisions
- **`backend/TROUBLESHOOTING.md`** — Common issues & fixes
- **`REFACTOR_SUMMARY.md`** — Complete change summary

---

## 🔧 Key Files

| File | What Changed |
|------|--------------|
| `src/background.js` | Now calls backend instead of Anthropic |
| `src/popup.js` | Shows device ID instead of API key input |
| `popup.html` | Removed API key form |
| `manifest.json` | Added backend host permission |
| `backend/api/analyze.js` | NEW: Main backend endpoint |
| `backend/api/config.js` | NEW: Model selection config |
| `backend/api/storage.js` | NEW: Rate limiting logic |
| `backend/api/analyzers/*.js` | NEW: Gemini & Anthropic integrations |

Content scripts (Gmail, Kivra) — **No changes needed**

---

## 🚀 Going Live

### Local Testing First (Recommended)
```bash
# Test with local backend
# In src/background.js, change to:
const BACKEND_API_URL = "http://localhost:3000/api/analyze";

# Start local backend
cd backend
npm install
BB_MODEL=gemini GOOGLE_API_KEY=your_key node api/analyze.js

# Test in Chrome, make sure it works
```

### Production Deployment
```bash
# Update to production URL
# In src/background.js:
const BACKEND_API_URL = "https://your-vercel-domain.vercel.app/api/analyze";

# Load into Chrome and test
```

---

## 🤔 Common Questions

**Q: Do users still need an API key?**
A: No! That's the whole point. You hold the key, they just use the extension.

**Q: What if someone hits their 5 analysis limit?**
A: They see "You've used 5/5 this month" + upgrade link. The limit resets monthly.

**Q: Can I change from Gemini to Claude later?**
A: Yes! No code changes needed. Just:
```bash
vercel env add BB_MODEL anthropic
vercel env add ANTHROPIC_API_KEY your_key
vercel
```

**Q: How much will this cost?**
A: Gemini Flash is free tier friendly (~$5-10/month per 1000 users max). Vercel is ~$20/month. Anthropic would be $0.10-0.50 per analysis if you choose that.

**Q: What about user accounts?**
A: Not needed yet. Device ID is enough for free tier. Add authentication only when monetizing (Month 2-3).

---

## ✅ Success Indicators

After deployment:
- [ ] Users can install with zero setup
- [ ] No API key input in popup
- [ ] Device ID displays
- [ ] Usage shows "0 / 5 this month"
- [ ] Text analysis works
- [ ] Usage counter increments
- [ ] After 5 uses, 6th shows rate limit message
- [ ] Switching `BB_MODEL` env var changes backend behavior

---

## 📞 Stuck?

1. Check `DEPLOYMENT_CHECKLIST.md` — has detailed troubleshooting
2. Check `backend/TROUBLESHOOTING.md` — common backend issues
3. Look at Vercel logs: `vercel logs`
4. Test backend directly: 
   ```bash
   curl -X POST https://your-domain.vercel.app/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"text":"test","deviceId":"test-123"}'
   ```

---

## 🎓 Next Milestone

Once this is working, consider:

1. **Analytics** (Week 2)
   - Track usage patterns
   - See which documents users analyze most

2. **Paid Tier** (Month 1)
   - Add Stripe integration
   - Offer unlimited analyses for $4.99/month

3. **Auth System** (Month 2)
   - Optional email signup
   - Upgrade to paid → account + unlimited

4. **Model Upgrades** (Month 3)
   - Claude for premium tier
   - Fine-tuning on Swedish legal docs

---

## 🎉 Congrats!

You just transformed your extension from a dev-friendly tool to a user-friendly product. The hard part is done—now you're ready to scale.

Next: Deploy, test, measure, iterate.

Good luck! 🚀
