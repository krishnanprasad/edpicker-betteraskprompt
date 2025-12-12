# Error Handling & Logging Guide

## Overview
This application uses environment-aware error handling to provide detailed diagnostics in development while keeping production logs clean and secure.

## Development vs Production Behavior

### Development Mode (Default)
- **Detailed console logs** with emojis and formatting for easy debugging
- **Full error stack traces** and diagnostic information
- **Step-by-step execution logs** showing API calls, timings, and responses
- **Actionable error messages** with specific solutions
- **API key diagnostics** (partial key shown, never full key)

### Production Mode
- **Minimal console output** (no sensitive data)
- **User-friendly error messages** without technical details
- **No stack traces** exposed to client
- **Security-focused** logging

## Running in Different Modes

### Development (Default)
```bash
# Frontend
npm run dev

# Backend
npm run server:start
```

### Production
```bash
# Frontend
npm run preview

# Backend
npm run server:prod
```

## Error Categories & Diagnostics

### 🔴 401 - Authentication Failed
**Symptoms:** API calls return "Invalid API key"

**Development Console Output:**
```
❌ [FRONTEND] API call failed
   HTTP Status: 401
   
🔴 [DIAGNOSIS] Authentication failed
   Reason: Invalid or expired Gemini API key
   Action: Check GEMINI_API_SECRET in backend .env file
   Get new key: https://aistudio.google.com/apikey
```

**Solution:**
1. Verify `.env` file has `GEMINI_API_SECRET=your-key-here`
2. Get a valid API key from Google AI Studio
3. Restart backend server after updating .env

---

### 🔴 429 - Rate Limit/Quota Exceeded
**Symptoms:** "API quota exceeded" error

**Development Console Output:**
```
🔴 [DIAGNOSIS] Rate limit or quota exceeded
   Reason: Too many requests or API quota exhausted
   Action: Wait 60 seconds and try again, or upgrade API plan
```

**Solution:**
1. Wait 1 minute before retrying
2. Check your quota at https://console.cloud.google.com/apis/dashboard
3. Consider upgrading your API plan if needed

---

### 🔴 403 - Access Forbidden
**Symptoms:** "Model access denied"

**Development Console Output:**
```
🔴 [DIAGNOSIS] Access forbidden
   Reason: Model access denied or insufficient permissions
   Action: Verify API key has access to gemini-2.5-flash model
```

**Solution:**
1. Verify your API key has access to the Gemini model
2. Try using `gemini-1.5-flash` or `gemini-pro` as fallback
3. Check API permissions in Google Cloud Console

---

### 🔴 500 - Server Error
**Symptoms:** "Server error" or internal error

**Development Console Output:**
```
🔴 [DIAGNOSIS] Server error
   Reason: [Specific error from backend]
   Action: Check backend server console for detailed logs
```

**Solution:**
1. Check backend terminal for detailed stack trace
2. Review the specific error message in server console
3. Common causes: JSON parsing error, network timeout, invalid response

---

### 🔴 0 - Backend Not Running
**Symptoms:** "Cannot connect to server"

**Development Console Output:**
```
🔴 [DIAGNOSIS] Cannot connect to backend
   Reason: Backend server is not running or unreachable
   Action: Start backend with: npm run server:start
   Expected URL: http://localhost:3001
```

**Solution:**
1. Open new terminal
2. Run `npm run server:start`
3. Verify you see "Server listening on port 3001"

---

## Reading Development Logs

### Frontend Logs (Browser Console)
```
🚀 [FRONTEND] Initiating API call
   Prompt: Explain photosynthesis...
   Prompt length: 21 characters
   Timestamp: 2025-12-11T04:30:00.000Z

✅ [FRONTEND] API call successful
   Response time: 1243 ms
   Score received: 75
   Feedback length: 234 characters
   Has improved prompt: true
─────────────────────────────────────────
```

### Backend Logs (Terminal)
```
📥 [INCOMING REQUEST] /api/gemini/analyze
   Request body: {
     "studentPrompt": "Explain photosynthesis"
   }
   Timestamp: 2025-12-11T04:30:00.000Z

🔑 [CONFIGURATION CHECK]
   API Key status: CONFIGURED
   API Key length: 39
   API Key prefix: AIzaSyC1Zh...

🤖 [CALLING GEMINI API]
   Model: gemini-2.5-flash
   Prompt length: 21 characters

✅ [GEMINI API RESPONSE]
   Response time: 1187 ms
   Response received: SUCCESS

📄 [PARSING RESPONSE]
   Response text length: 543 characters
   First 100 chars: {"score":75,"feedback":"Your prompt is clear but lacks...
   JSON parsing: SUCCESS
   Response keys: score,feedback,improvedPrompt
   Score: 75

✅ [SUCCESS - SENDING RESPONSE]
   Score: 75
   Feedback length: 234 characters
   Improved prompt components: role, context, task, format, tone
   Total processing time: 1243 ms
─────────────────────────────────────────
```

## Best Practices

### For Development
1. **Always check both** browser console (F12) and backend terminal
2. **Look for emojis** to quickly identify log sections
3. **Read diagnostic sections** (🔴) for actionable solutions
4. **Track timing information** to identify performance issues

### For Production
1. **Never expose** API keys or sensitive data
2. **Monitor error logs** in your production logging system
3. **Set NODE_ENV=production** for backend
4. **Use Angular production build** for frontend

## Environment Variables

### `.env` file
```bash
GEMINI_API_SECRET=your-api-key-here
NODE_ENV=development  # or 'production'
PORT=3001
```

## Testing Error Handling

Test different error scenarios:

```bash
# Test with invalid API key
GEMINI_API_SECRET=invalid-key npm run server:start

# Test with backend not running
# Stop backend, then try frontend

# Test with correct setup
npm run server:start  # Terminal 1
npm run dev          # Terminal 2
```

## Troubleshooting Checklist

- [ ] Backend server running on port 3001?
- [ ] Frontend running on port 4201?
- [ ] `.env` file exists with `GEMINI_API_SECRET`?
- [ ] API key is valid and not expired?
- [ ] Internet connection working?
- [ ] Browser console open (F12) to see logs?
- [ ] Backend terminal visible to see server logs?

## Support

If you encounter errors not covered here:
1. Check browser console for frontend errors
2. Check terminal for backend errors
3. Look for 🔴 [DIAGNOSIS] sections with actionable solutions
4. Verify all checklist items above
