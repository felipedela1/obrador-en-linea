# 🐛 Debug Access Guide - Obrador en Línea

## 🎯 How to Access Debug Tools from Any Page

### Method 1: Debug Icon in Navbar (Recommended)
- **Desktop**: Look for the yellow bug icon (🐛) in the top navigation bar
- **Mobile**: Open the hamburger menu and look for "Debug Tools"
- **Available**: From any page, whether logged in or not
- **Action**: Click to navigate to `/debug` page

### Method 2: Direct URL Navigation
```
https://obradordlui.netlify.app/debug
```
- Navigate directly to the debug page from any browser
- Works from any page, just change the URL path to `/debug`

### Method 3: Browser Console Commands (Advanced)
When you're on **any page** of the app, open browser console (F12) and use:

```javascript
// Navigate to debug page
debugUtils.goToDebug()

// Clear all authentication data (force logout)
debugUtils.clearAuth()

// Show current auth data in console
debugUtils.showAuth()

// Test Supabase connectivity
debugUtils.testSupabase()
```

### Method 4: Bookmarklet (One-Click Debug)
Create a bookmark with this JavaScript code:
```javascript
javascript:window.location.href='/debug'
```
- Save as bookmark: "Go to Debug"
- Click from any page to instantly access debug tools

## 🔍 What You'll Find in Debug Page

### Environment Information
- Development vs Production mode
- Supabase configuration status
- Environment variables verification

### Authentication Status
- Current session data
- Token expiry information
- localStorage contents
- Profile information

### Connectivity Tests
- Supabase API connectivity
- Response times
- Network status

### Debug Actions
- Clear all auth data
- Refresh session information
- Export logs for technical support

## 🚨 Production Troubleshooting Scenarios

### Scenario 1: "I'm stuck on login page"
1. **Quick fix**: Use console command `debugUtils.clearAuth()`
2. **Detailed analysis**: Go to `/debug` to see session status
3. **Check**: Look for expired tokens or invalid localStorage data

### Scenario 2: "App seems frozen/not responding"
1. **Navigate**: Use direct URL: `/debug`
2. **Check**: Supabase connectivity test
3. **Action**: Clear auth data if needed

### Scenario 3: "I can't access admin features"
1. **Verify**: Check profile role in `/debug`
2. **Confirm**: Session validity and expiry
3. **Test**: Supabase connectivity

### Scenario 4: "Pages won't load after login"
1. **Console check**: `debugUtils.showAuth()` to verify session
2. **Debug page**: Review full environment status
3. **Reset**: Use `debugUtils.clearAuth()` if session is corrupted

## 🛠️ For Developers

### Debug Console Available On:
- ✅ Production (`https://obradordlui.netlify.app`)
- ✅ Development (`http://localhost:5173`)
- ✅ All routes and pages

### Console Commands Reference:
```javascript
// Show all available debug commands
console.log(debugUtils)

// Check if debug utilities are loaded
typeof debugUtils !== 'undefined'

// Manual session inspection
JSON.parse(localStorage.getItem('obrador-auth'))

// Manual Supabase test
fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/')
```

## 📱 Mobile Device Access

### Mobile Browser Console:
1. **Chrome Mobile**: `chrome://inspect` → Remote devices
2. **Safari Mobile**: Settings → Advanced → Web Inspector
3. **Firefox Mobile**: `about:debugging` → This Firefox

### Quick Mobile Access:
- Use the hamburger menu → "Debug Tools"
- Or navigate directly to `/debug` in the address bar

## 🎯 Key Benefits

1. **Always Accessible**: Debug tools available from any page state
2. **No Installation**: Works in any browser, no special tools needed
3. **Production Safe**: Debugging works in live environment
4. **User Friendly**: Both technical and non-technical users can access
5. **Comprehensive**: Full system status in one place

The debug system is designed to help diagnose any authentication or session issues quickly and efficiently, whether you're a developer or an end user experiencing problems.
