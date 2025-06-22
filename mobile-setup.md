# 📱 Mobile Camera Setup Guide

If you're having trouble with camera access on your mobile device, follow these steps:

## 🔒 Method 1: Use HTTPS (Recommended)

Many mobile browsers require HTTPS for camera access. 

### Quick HTTPS Setup:
1. Stop the current Python server (Ctrl+C)
2. If you have Node.js installed:
   ```bash
   node setup-https.js
   ```
3. Open the HTTPS URL on your mobile: `https://YOUR_IP:8443`
4. Accept the security warning (self-signed certificate)

### Manual HTTPS with OpenSSL:
```bash
# Generate certificate
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# Start HTTPS server (Python)
python -c "
import ssl
import http.server
import socketserver

context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
context.load_cert_chain('cert.pem', 'key.pem')

httpd = socketserver.TCPServer(('', 8443), http.server.SimpleHTTPRequestHandler)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print('HTTPS Server running on https://localhost:8443')
httpd.serve_forever()
"
```

## 📱 Method 2: Browser Settings

### Chrome Mobile:
1. Open Chrome settings (three dots menu)
2. Go to "Site Settings"
3. Find "Camera"
4. Make sure it's set to "Ask first" or "Allow"
5. Find your site in the list and allow camera access

### Safari iOS:
1. Go to Settings > Safari
2. Scroll down to "Camera & Microphone Access"
3. Make sure it's enabled
4. Or in the browser: Settings > Website Settings > Camera

### Firefox Mobile:
1. Open Firefox menu
2. Go to "Settings"
3. Find "Site permissions"
4. Set Camera to "Ask first"

## 🔧 Method 3: URL-based Access

Some browsers work better with specific URLs:

- Try: `http://192.168.1.xxx:8000` (your local IP)
- Try: `https://192.168.1.xxx:8443` (HTTPS version)
- Avoid: `http://localhost:8000` (might not work on mobile)

## 🔍 Troubleshooting

### Still not working?
1. **Clear browser cache and data**
2. **Restart your browser completely**
3. **Try a different browser** (Chrome, Firefox, Safari)
4. **Check if camera works in other apps**
5. **Ensure you're on the same WiFi network**

### Permission Dialog Not Appearing?
1. **Refresh the page**
2. **Clear site data in browser settings**
3. **Try incognito/private browsing mode**
4. **Manually reset permissions for the site**

### Security Warnings on HTTPS?
- This is normal for self-signed certificates
- Click "Advanced" then "Proceed to site"
- Or add security exception in browser settings

## 🎯 Quick Test

Once camera access is working:
1. Switch to "Receiver Mode"
2. Click "Start Receiving"
3. You should see your camera feed
4. Point camera at a bright light source
5. Watch the brightness meter respond

## ⚡ Alternative Testing

If camera still doesn't work:
1. Use **two phones**: one as sender, one as receiver
2. Use **desktop + mobile**: desktop sends, mobile receives
3. Try the **demo mode** (if available) for testing

## 🆘 Still Need Help?

Common solutions by device:
- **Android Chrome**: Enable "Use camera" in site settings
- **iPhone Safari**: Check Settings > Safari > Camera access
- **Android Firefox**: Enable camera in site permissions
- **iPad**: Try landscape mode for better camera access

Remember: Camera access is required for the receiver mode only. Sender mode works without camera permissions! 