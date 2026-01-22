# API Build Guide

## Important: `api/index.js` is Auto-Generated

The file `api/index.js` is **automatically generated** from your TypeScript source files in `server/api/`. 

**⚠️ DO NOT manually edit `api/index.js`** - your changes will be overwritten!

## How It Works

1. **Source files**: Your TypeScript routes in `server/api/*.ts` (e.g., `server/api/crm-integrations.ts`)
2. **Build script**: `scripts/build-api.js` bundles all TypeScript routes
3. **Output**: Generates `api/index.js` (used by Vercel)

## When to Rebuild

### Automatic (Vercel)
- Vercel automatically runs `npm run build:vercel` on every deploy
- This includes `npm run build:api` which generates `api/index.js`
- **No action needed** - it happens automatically on Vercel

### Manual (Local Development)
If you want to test the bundled API locally:

```bash
npm run build:api
```

This will regenerate `api/index.js` from your TypeScript source.

## Workflow

1. **Edit TypeScript files only**: 
   - Edit `server/api/crm-integrations.ts`
   - Edit `server/api/gmail-integration.ts`
   - Edit `server/api/google-calendar.ts`
   - etc.

2. **Commit TypeScript files**:
   ```bash
   git add server/api/
   git commit -m "Update integration routes"
   ```

3. **Push to GitHub**:
   ```bash
   git push
   ```

4. **Vercel auto-builds**: 
   - Vercel runs `npm run build:vercel`
   - This generates `api/index.js` automatically
   - Your changes are deployed

## Troubleshooting

### "My changes aren't showing on Vercel"
- Make sure you edited the TypeScript file (`server/api/*.ts`), not `api/index.js`
- Check that Vercel build completed successfully
- Verify the build logs show `✅ Bundled to api/index.js`

### "I accidentally edited api/index.js"
- Don't worry! Just run `npm run build:api` to regenerate it
- Or delete `api/index.js` and let Vercel regenerate it on deploy

## File Status

- ✅ **Edit these**: `server/api/*.ts` files
- ❌ **Don't edit**: `api/index.js` (auto-generated)
- ✅ **Tracked in git**: TypeScript source files
- ❌ **Ignored by git**: `api/index.js` (in `.gitignore`)
