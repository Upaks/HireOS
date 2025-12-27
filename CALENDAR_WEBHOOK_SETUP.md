# Calendar Webhook Setup Guide

This guide explains how to connect your calendar service (Calendly, Cal.com, Google Calendar, etc.) to HireOS for automatic interview date synchronization.

## How It Works

1. **You send an interview invitation** → Interview record created in HireOS
2. **Candidate books on your calendar** → Calendar service sends webhook to HireOS
3. **HireOS automatically updates** → Interview date and status updated automatically

## Important: Localhost vs Production

⚠️ **Webhooks do NOT work with localhost!** Calendar services (Calendly, Cal.com, etc.) need to send HTTP requests to your webhook endpoint, but they cannot reach `localhost` or `127.0.0.1` because those are only accessible on your local machine.

**For local testing:**
- Use a service like [ngrok](https://ngrok.com/) to create a public tunnel to your localhost
- Or deploy your app to a staging/production environment to test webhooks

**For production (Vercel/other hosting):**
- ✅ **No ngrok needed!** Your app will have a public URL (e.g., `https://your-app.vercel.app`)
- Simply update your webhook URLs in Calendly/Cal.com/Google to point to your production URL instead of ngrok
- Example: `https://your-app.vercel.app/api/webhooks/calendar?provider=calendly&userId=123`

**The webhook URL is auto-generated** based on your selected calendar provider and cannot be edited. Simply copy it and paste it into your calendar service settings.

## Supported Calendar Providers

- ✅ **Calendly** - Full support
- ✅ **Cal.com** - Full support
- ✅ **Google Calendar** - Full support
- ✅ **Custom/Other** - Generic webhook handler (may need custom configuration)

## Setup Instructions

### Step 1: Configure Your Calendar Provider in HireOS

1. Go to **Settings > User Management**
2. Click **Edit** on your user account
3. Scroll to **Calendar Sync (Optional)** section
4. Select your **Calendar Provider** (Calendly, Cal.com, Google, or Custom)
5. Copy the **Webhook URL** shown (e.g., `https://your-app.com/api/webhooks/calendar?provider=calendly&userId=123`)
   - **Important:** The webhook URL includes your user ID (`userId=123`) so the app knows which user's calendar received the booking
   - Each user gets a unique webhook URL with their own user ID
6. Click **Save Changes**

### Step 2: Configure Webhook in Your Calendar Service

#### For Calendly:

1. Go to [Calendly Integrations](https://calendly.com/integrations)
2. Navigate to **Webhooks**
3. Click **+ New Webhook**
4. Select **invitee.created** event
5. Paste your webhook URL: `https://your-app.com/api/webhooks/calendar?provider=calendly&userId=123`
   - **Note:** Replace `123` with your actual user ID from the webhook URL shown in HireOS
6. Save the webhook

#### For Cal.com:

1. Go to your Cal.com dashboard
2. Navigate to **Settings > Webhooks**
3. Click **Add Webhook**
4. Select **BOOKING_CREATED** event
5. Paste your webhook URL: `https://your-app.com/api/webhooks/calendar?provider=cal.com&userId=123`
   - **Note:** Replace `123` with your actual user ID from the webhook URL shown in HireOS
6. Save the webhook

#### For Google Calendar:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Create credentials (OAuth 2.0)
5. Set up a webhook endpoint using Google Calendar API push notifications
6. Configure the webhook URL: `https://your-app.com/api/webhooks/calendar?provider=google&userId=123`
   - **Note:** Replace `123` with your actual user ID from the webhook URL shown in HireOS

#### For Custom/Other:

1. Use the generic endpoint: `https://your-app.com/api/webhooks/calendar`
2. The system will attempt to auto-detect the provider from the payload
3. If auto-detection fails, specify the provider: `?provider=calendly|cal.com|google`

## Testing the Integration

1. **Send an interview invitation** to a candidate from HireOS
2. **Have the candidate book** a time on your calendar
3. **Check the Interviews tab** in HireOS - the interview date should be automatically updated

## Troubleshooting

### Interview Not Updating Automatically

- ✅ Verify webhook URL is correctly configured in your calendar service
- ✅ Check that the candidate's email matches exactly (case-insensitive)
- ✅ Ensure there's a scheduled interview record for the candidate
- ✅ Check server logs for webhook errors

### Webhook Not Receiving Events

- ✅ Verify your app is publicly accessible (not localhost)
- ✅ Check firewall/security settings
- ✅ Ensure HTTPS is enabled (required by most calendar services)
- ✅ Verify webhook URL format matches your calendar provider's requirements

### Multiple Calendar Providers

If you use multiple calendar services, you can:
- Use the generic endpoint: `/api/webhooks/calendar` (auto-detects provider)
- Or use provider-specific endpoints:
  - `/api/webhooks/calendar/calendly`
  - `/api/webhooks/calendar/cal.com`
  - `/api/webhooks/calendar/google`

## API Endpoints

### Generic Webhook (Auto-detect)
```
POST /api/webhooks/calendar?provider=calendly&userId=123
POST /api/webhooks/calendar?provider=cal.com&userId=123
POST /api/webhooks/calendar?provider=google&userId=123
POST /api/webhooks/calendar (auto-detects provider, userId optional)
```

### Provider-Specific Endpoints
```
POST /api/webhooks/calendar/calendly?userId=123
POST /api/webhooks/calendar/cal.com?userId=123
POST /api/webhooks/calendar/google?userId=123
```

**Note:** The `userId` parameter is **recommended** (especially for multi-user scenarios) to ensure the correct interview is updated when a booking comes in. If omitted, the system will try to match by candidate email only.

## Security Notes

- Webhooks are currently unauthenticated (for simplicity)
- In production, consider adding webhook signature verification
- Each calendar provider has different security requirements
- Calendly and Cal.com support webhook signing for verification

## Need Help?

If you encounter issues:
1. Check server logs for webhook payloads
2. Verify candidate email matches between HireOS and calendar booking
3. Ensure interview record exists before booking
4. Test with a simple webhook testing tool (e.g., webhook.site)

