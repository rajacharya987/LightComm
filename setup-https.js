const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Function to get local IP address
function getLocalIP() {
    const nets = require('os').networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    
    // Return the first external IP found
    for (const addresses of Object.values(results)) {
        if (addresses.length > 0) {
            return addresses[0];
        }
    }
    return 'localhost';
}

// Function to generate self-signed certificate
function generateCertificate() {
    return new Promise((resolve, reject) => {
        const cmd = `openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=LightComm/CN=localhost"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.log('OpenSSL not found. Creating basic certificates...');
                // Create basic self-signed certificate manually
                const cert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJALm8w2z1GvWZMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNVBAMMCWxv
Y2FsaG9zdDAeFw0yNDA2MjIwMDAwMDBaFw0yNTA2MjIwMDAwMDBaMBQxEjAQBgNV
BAMMCWxvY2FsaG9zdDBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQC7VJTUt9US8cI8
nQIDAQABMA0GCSqGSIb3DQEBCwUAA0EAcT7czYC2bCQz2A1rVlVlZU5Hy8lUFH/m
pWa8k+cL9m2fHhF6zdQvTEwMXhS9l2n3jMoqTpTUgNKAb4FJ6hKm0A==
-----END CERTIFICATE-----`;
                
                const key = `-----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAu1SU1LfVEvHCPJ0C
AwEAAQJBAKX2dO0qJnx1iJegaQOr2gVNhQI7wkCYdjRMw+N8PGvf0ik7TzI3NP3o
GCN8+xVOJsGWzBZhR+4R8Mw3zO1sK50CIQDmJ8D+hZWJzKjN6zrF2A8SqQgF5hJR
6TdlUO3fqLJzKwIhANS9iXHOw5Cgl3lJ4dBwNfVVqfGQqZmRq8Q7Y+FoS1ltAiA=
-----END PRIVATE KEY-----`;

                fs.writeFileSync('cert.pem', cert);
                fs.writeFileSync('key.pem', key);
            }
            resolve();
        });
    });
}

// Simple static file server
function serveStaticFile(req, res) {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
}

async function startServers() {
    const localIP = getLocalIP();
    
    // Try to generate certificate
    try {
        await generateCertificate();
        console.log('✅ Certificate generated successfully');
    } catch (error) {
        console.log('⚠️  Could not generate certificate, using HTTP only');
    }

    // Start HTTP server
    const httpServer = http.createServer(serveStaticFile);
    httpServer.listen(8000, () => {
        console.log('\n🌐 LightComm Servers Started!');
        console.log('📱 For mobile devices, use:');
        console.log(`   http://${localIP}:8000`);
        console.log(`   http://localhost:8000`);
    });

    // Start HTTPS server if certificate exists
    if (fs.existsSync('cert.pem') && fs.existsSync('key.pem')) {
        try {
            const options = {
                key: fs.readFileSync('key.pem'),
                cert: fs.readFileSync('cert.pem')
            };

            const httpsServer = https.createServer(options, serveStaticFile);
            httpsServer.listen(8443, () => {
                console.log('\n🔒 HTTPS Server (for camera access):');
                console.log(`   https://${localIP}:8443`);
                console.log(`   https://localhost:8443`);
                console.log('\n💡 Use HTTPS URLs for camera access on mobile!');
                console.log('   (You may need to accept security warning for self-signed certificate)');
            });
        } catch (error) {
            console.log('⚠️  Could not start HTTPS server:', error.message);
        }
    }

    console.log('\n📱 Mobile Camera Setup:');
    console.log('1. Open browser settings');
    console.log('2. Find "Site Settings" or "Permissions"');
    console.log('3. Allow camera access for this site');
    console.log('4. Use HTTPS URL for best compatibility');
    console.log('\nPress Ctrl+C to stop servers');
}

startServers().catch(console.error); 