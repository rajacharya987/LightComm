class LightComm {
    constructor() {
        this.isTransmitting = false;
        this.isReceiving = false;
        this.transmissionInterval = null;
        this.cameraStream = null;
        this.analysisInterval = null;
        this.currentBitIndex = 0;
        this.encodedMessage = '';
        this.receivedBits = '';
        this.brightnessHistory = [];
        this.lastBrightness = 0;
        this.flashDuration = 300;
        this.brightnessThreshold = 0.5;
        this.detectionRegionSize = 0.3;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Synchronization system
        this.syncPattern = '1100'; // Shorter, simpler sync pattern
        this.receivedSyncBits = '';
        this.isSynced = false;
        this.lastBitTime = 0;
        this.minBitDuration = 150; // Reduced minimum time between bits
        this.syncTimeout = null;
        
        this.morseCode = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
            'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
            'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
            'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
            'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
            '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
            '8': '---..', '9': '----.', ' ': '/'
        };
        
        this.reverseMorseCode = Object.fromEntries(
            Object.entries(this.morseCode).map(([k, v]) => [v, k])
        );
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateFlashSpeed();
        this.updateBrightnessThreshold();
        this.updateDetectionRegion();
        this.resetReceiverDisplay();
    }

    initializeElements() {
        // Mode switching
        this.senderModeBtn = document.getElementById('senderModeBtn');
        this.receiverModeBtn = document.getElementById('receiverModeBtn');
        this.senderMode = document.getElementById('senderMode');
        this.receiverMode = document.getElementById('receiverMode');
        
        // Sender elements
        this.messageInput = document.getElementById('messageInput');
        this.charCount = document.getElementById('charCount');
        this.encodingSelect = document.getElementById('encodingSelect');
        this.flashSpeed = document.getElementById('flashSpeed');
        this.speedValue = document.getElementById('speedValue');
        this.sendBtn = document.getElementById('sendBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.flashScreen = document.getElementById('flashScreen');
        this.transmissionStatus = document.getElementById('transmissionStatus');
        this.progressBar = document.getElementById('progressFill');
        this.currentBit = document.getElementById('currentBit');
        
        // Receiver elements
        this.cameraFeed = document.getElementById('cameraFeed');
        this.analysisCanvas = document.getElementById('analysisCanvas');
        this.startReceiveBtn = document.getElementById('startReceiveBtn');
        this.stopReceiveBtn = document.getElementById('stopReceiveBtn');
        this.brightnessLevel = document.getElementById('brightnessLevel');
        this.brightnessValue = document.getElementById('brightnessValue');
        this.signalStatus = document.getElementById('signalStatus');
        this.bitsReceived = document.getElementById('bitsReceived');
        this.decodedMessage = document.getElementById('decodedMessage');
        this.rawBitStream = document.getElementById('rawBitStream');
        
        // Settings
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.brightnessThresholdSlider = document.getElementById('brightnessThreshold');
        this.thresholdValue = document.getElementById('thresholdValue');
        this.detectionRegionSlider = document.getElementById('detectionRegion');
        this.regionValue = document.getElementById('regionValue');
    }

    setupEventListeners() {
        // Mode switching
        this.senderModeBtn.addEventListener('click', () => this.switchMode('sender'));
        this.receiverModeBtn.addEventListener('click', () => this.switchMode('receiver'));
        
        // Sender mode
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.flashSpeed.addEventListener('input', () => this.updateFlashSpeed());
        this.sendBtn.addEventListener('click', () => this.startTransmission());
        this.stopBtn.addEventListener('click', () => this.stopTransmission());
        
        // Receiver mode
        this.startReceiveBtn.addEventListener('click', () => this.startReceiving());
        this.stopReceiveBtn.addEventListener('click', () => this.stopReceiving());
        
        // Settings
        this.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.brightnessThresholdSlider.addEventListener('input', () => this.updateBrightnessThreshold());
        this.detectionRegionSlider.addEventListener('input', () => this.updateDetectionRegion());
        
        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.contains(e.target) && !this.settingsBtn.contains(e.target)) {
                this.settingsPanel.classList.remove('active');
            }
        });
    }

    switchMode(mode) {
        if (mode === 'sender') {
            this.senderModeBtn.classList.add('active');
            this.receiverModeBtn.classList.remove('active');
            this.senderMode.classList.add('active');
            this.receiverMode.classList.remove('active');
            this.stopReceiving();
        } else {
            this.receiverModeBtn.classList.add('active');
            this.senderModeBtn.classList.remove('active');
            this.receiverMode.classList.add('active');
            this.senderMode.classList.remove('active');
            this.stopTransmission();
        }
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = count;
        
        if (count > 80) {
            this.charCount.style.color = '#ff6b6b';
        } else if (count > 60) {
            this.charCount.style.color = '#ffa500';
        } else {
            this.charCount.style.color = '#888';
        }
    }

    updateFlashSpeed() {
        this.flashDuration = parseInt(this.flashSpeed.value);
        this.speedValue.textContent = `${this.flashDuration}ms`;
    }

    updateBrightnessThreshold() {
        this.brightnessThreshold = parseFloat(this.brightnessThresholdSlider.value);
        this.thresholdValue.textContent = this.brightnessThreshold.toFixed(1);
    }

    updateDetectionRegion() {
        this.detectionRegionSize = parseFloat(this.detectionRegionSlider.value);
        this.regionValue.textContent = `${Math.round(this.detectionRegionSize * 100)}%`;
    }

    toggleSettings() {
        this.settingsPanel.classList.toggle('active');
    }

    // Text encoding methods
    textToBinary(text) {
        return text.split('').map(char => 
            char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join('');
    }

    binaryToText(binary) {
        const bytes = binary.match(/.{1,8}/g) || [];
        return bytes.map(byte => 
            String.fromCharCode(parseInt(byte, 2))
        ).join('');
    }

    textToMorse(text) {
        return text.toUpperCase().split('').map(char => 
            this.morseCode[char] || ''
        ).join(' ');
    }

    morseToText(morse) {
        return morse.split(' ').map(code => 
            this.reverseMorseCode[code] || ''
        ).join('');
    }

    encodeMessage(text, method) {
        if (method === 'binary') {
            // Add sync pattern + start marker + message + end marker
            return this.syncPattern + '1010' + this.textToBinary(text) + '0101';
        } else if (method === 'morse') {
            // Convert dots to 1, dashes to 111, spaces to 00, word separators to 000
            const morse = this.textToMorse(text);
            return this.syncPattern + '1010' + morse.replace(/\./g, '1').replace(/-/g, '111').replace(/ /g, '00').replace(/\//g, '000') + '0101';
        }
        return '';
    }

    // Transmission methods
    async startTransmission() {
        const message = this.messageInput.value.trim();
        if (!message) {
            alert('Please enter a message to transmit');
            return;
        }

        this.isTransmitting = true;
        this.sendBtn.style.display = 'none';
        this.stopBtn.style.display = 'inline-block';
        
        const encoding = this.encodingSelect.value;
        this.encodedMessage = this.encodeMessage(message, encoding);
        this.currentBitIndex = 0;
        
        this.transmissionStatus.textContent = `Transmitting: "${message}"`;
        this.progressBar.style.width = '0%';
        
        // Start the transmission loop
        this.transmitNextBit();
    }

    transmitNextBit() {
        if (!this.isTransmitting || this.currentBitIndex >= this.encodedMessage.length) {
            this.stopTransmission();
            return;
        }

        const bit = this.encodedMessage[this.currentBitIndex];
        const isFlash = bit === '1';
        const bitNumber = this.currentBitIndex + 1;
        
        // Update progress bar
        this.progressBar.style.width = `${((this.currentBitIndex + 1) / this.encodedMessage.length) * 100}%`;
        
        // Set background color based on bit value
        if (isFlash) {
            // Bit 1 = White background, black text
            this.flashScreen.style.backgroundColor = '#ffffff';
            this.flashScreen.style.color = '#000000';
        } else {
            // Bit 0 = Black background, white text
            this.flashScreen.style.backgroundColor = '#000000';
            this.flashScreen.style.color = '#ffffff';
        }
        
        // Display different info for sync vs message bits
        const syncLength = this.syncPattern.length;
        if (bitNumber <= syncLength) {
            // Sync phase
            this.transmissionStatus.textContent = `Synchronizing...`;
            this.currentBit.innerHTML = `
                <div class="large-bit-display">
                    <div class="huge-bit-number">SYNC</div>
                    <div class="bit-value-text">${bitNumber} / ${syncLength}</div>
                    <div class="progress-text">Preparing transmission...</div>
                </div>
            `;
        } else {
            // Message phase
            const msgBitNumber = bitNumber - syncLength - 4; // Subtract sync + start marker
            this.transmissionStatus.textContent = `Transmitting Message...`;
            this.currentBit.innerHTML = `
                <div class="large-bit-display">
                    <div class="huge-bit-number">${msgBitNumber > 0 ? msgBitNumber : bitNumber}</div>
                    <div class="bit-value-text">Bit: ${bit}</div>
                    <div class="progress-text">${bitNumber} / ${this.encodedMessage.length}</div>
                </div>
            `;
        }
        
        this.currentBitIndex++;
        
        // Schedule next bit
        this.transmissionInterval = setTimeout(() => {
            this.transmitNextBit();
        }, this.flashDuration);
    }

    stopTransmission() {
        this.isTransmitting = false;
        if (this.transmissionInterval) {
            clearTimeout(this.transmissionInterval);
            this.transmissionInterval = null;
        }
        
        this.flashScreen.classList.remove('flashing');
        this.sendBtn.style.display = 'inline-block';
        this.stopBtn.style.display = 'none';
        this.transmissionStatus.textContent = 'Transmission completed';
        this.currentBit.textContent = '';
        
        if (this.currentBitIndex >= this.encodedMessage.length) {
            this.progressBar.style.width = '100%';
        }
    }

    // Reception methods
    async startReceiving() {
        // Check if we're on HTTPS or localhost (required for camera on most mobile browsers)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            this.showCameraError('HTTPS Required', 'Camera access requires HTTPS on mobile devices. Please access the app via HTTPS or use the mobile setup instructions.');
            return;
        }

        try {
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }

            // Request camera with mobile-friendly constraints
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' }, // Prefer back camera but allow front
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30, max: 60 }
                }
            };

            this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.cameraFeed.srcObject = this.cameraStream;
            this.cameraFeed.style.display = 'block';
            
            this.isReceiving = true;
            this.receivedBits = '';
            this.brightnessHistory = [];
            
                    this.startReceiveBtn.style.display = 'none';
        this.stopReceiveBtn.style.display = 'inline-block';
        this.signalStatus.textContent = '🟡 Waiting for transmission...';
        this.decodedMessage.textContent = 'Point camera at flashing screen and start transmission...';
        
        // Reset sync state
        this.isSynced = false;
        this.receivedSyncBits = '';
        this.lastBitTime = 0;
            
            // Setup canvas for analysis
            this.analysisCanvas.width = 640;
            this.analysisCanvas.height = 480;
            
            // Start analysis loop
            this.startBrightnessAnalysis();
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
        }
    }

    handleCameraError(error) {
        let title = 'Camera Access Error';
        let message = '';
        
        // Show mobile banner for permission issues
        if (this.isMobile && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
            document.getElementById('cameraBanner').style.display = 'block';
        }
        
        switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                title = 'Camera Permission Denied';
                message = this.isMobile 
                    ? 'Camera access is required for receiving messages. Please enable camera access in your browser settings and refresh the page.'
                    : 'Please allow camera access and try again. Check your browser settings if needed.';
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                title = 'No Camera Found';
                message = 'No camera device was found on your device.';
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                title = 'Camera Busy';
                message = 'Camera is being used by another application. Please close other camera apps and try again.';
                break;
            case 'OverconstrainedError':
            case 'ConstraintNotSatisfiedError':
                title = 'Camera Not Compatible';
                message = 'Your camera doesn\'t support the required settings. Trying with basic settings...';
                // Try with basic constraints
                setTimeout(() => this.tryBasicCamera(), 1000);
                return;
            case 'NotSupportedError':
                title = 'Camera Not Supported';
                message = 'Your browser doesn\'t support camera access.';
                break;
            default:
                message = `Error: ${error.message || 'Unknown camera error'}`;
        }
        
        this.showCameraError(title, message);
    }

    async tryBasicCamera() {
        try {
            // Try with very basic constraints
            const basicConstraints = {
                video: true
            };
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
            this.cameraFeed.srcObject = this.cameraStream;
            this.cameraFeed.style.display = 'block';
            
            this.isReceiving = true;
            this.startReceiveBtn.style.display = 'none';
            this.stopReceiveBtn.style.display = 'inline-block';
            this.signalStatus.textContent = '🟡 Detecting...';
            
            this.startBrightnessAnalysis();
            
        } catch (error) {
            this.showCameraError('Camera Failed', 'Unable to access camera even with basic settings.');
        }
    }

    showCameraError(title, message) {
        // Create error modal
        const errorModal = document.createElement('div');
        errorModal.className = 'error-modal';
        errorModal.innerHTML = `
            <div class="error-content">
                <h3>📷 ${title}</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="action-btn">Close</button>
                    <button onclick="window.open('https://support.google.com/chrome/answer/2693767', '_blank')" class="action-btn">Help</button>
                </div>
                <div class="mobile-instructions">
                    <h4>📱 Mobile Setup:</h4>
                    <ol>
                        <li>Open your browser settings</li>
                        <li>Find "Site Settings" or "Permissions"</li>
                        <li>Look for "Camera" permissions</li>
                        <li>Allow camera access for this site</li>
                        <li>Refresh the page and try again</li>
                    </ol>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorModal);
    }

    resetSyncState() {
        this.isSynced = false;
        this.receivedSyncBits = '';
        this.receivedBits = '';
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
        if (this.isReceiving) {
            this.signalStatus.textContent = '🟡 Waiting for transmission...';
            this.decodedMessage.textContent = 'Looking for light transmission...';
            this.decodedMessage.style.background = '#f8f9fa';
            this.decodedMessage.style.borderColor = '#dee2e6';
        }
    }

    resetReceiverDisplay() {
        // Clear receiver data on startup
        this.receivedBits = '';
        this.receivedSyncBits = '';
        this.isSynced = false;
        this.lastBitTime = 0;
        this.brightnessHistory = [];
        if (this.bitsReceived) this.bitsReceived.textContent = '0';
        if (this.rawBitStream) this.rawBitStream.textContent = '';
        if (this.decodedMessage) {
            this.decodedMessage.textContent = 'Click "Start Receiving" to begin detecting light signals.';
            this.decodedMessage.style.background = '#f8f9fa';
            this.decodedMessage.style.borderColor = '#dee2e6';
        }
        if (this.signalStatus) this.signalStatus.textContent = '🔴 Not Started';
    }

    startBrightnessAnalysis() {
        const ctx = this.analysisCanvas.getContext('2d');
        
        const analyze = () => {
            if (!this.isReceiving) return;
            
            // Draw video frame to canvas
            ctx.drawImage(this.cameraFeed, 0, 0, this.analysisCanvas.width, this.analysisCanvas.height);
            
            // Analyze brightness in center region
            const regionSize = Math.min(this.analysisCanvas.width, this.analysisCanvas.height) * this.detectionRegionSize;
            const x = (this.analysisCanvas.width - regionSize) / 2;
            const y = (this.analysisCanvas.height - regionSize) / 2;
            
            const imageData = ctx.getImageData(x, y, regionSize, regionSize);
            const brightness = this.calculateBrightness(imageData.data);
            
            // Update UI
            this.brightnessLevel.style.width = `${brightness * 100}%`;
            this.brightnessValue.textContent = `${Math.round(brightness * 100)}%`;
            
            // Detect signal changes
            this.processBrightness(brightness);
            
            this.analysisInterval = requestAnimationFrame(analyze);
        };
        
        analyze();
    }

    calculateBrightness(data) {
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            // Calculate luminance using standard weights
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            total += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        return total / (data.length / 4);
    }

    processBrightness(brightness) {
        // Only process if we're actively receiving
        if (!this.isReceiving) {
            return;
        }
        
        this.brightnessHistory.push(brightness);
        if (this.brightnessHistory.length > 10) {
            this.brightnessHistory.shift();
        }
        
        // Detect bit transitions with timing control
        if (this.brightnessHistory.length >= 3) {
            const current = brightness;
            const previous = this.brightnessHistory[this.brightnessHistory.length - 2];
            const diff = Math.abs(current - previous);
            const currentTime = Date.now();
            
            // Only detect if significant change AND enough time has passed
            if (diff > 0.1 && (currentTime - this.lastBitTime) > this.minBitDuration) {
                const isHigh = current > this.brightnessThreshold;
                const bitValue = isHigh ? '1' : '0';
                
                if (!this.isSynced) {
                    // Still waiting for sync pattern
                    this.receivedSyncBits += bitValue;
                    
                    // More flexible sync detection
                    const hasRegularPattern = this.receivedSyncBits.length >= 4;
                    const hasStrongSignal = diff > 0.3; // Strong light changes
                    const quickSync = this.receivedSyncBits.length >= 6 && hasStrongSignal;
                    
                    if (this.receivedSyncBits.includes(this.syncPattern) || quickSync || hasRegularPattern) {
                        // Found sync or strong signal pattern - start recording
                        this.isSynced = true;
                        this.receivedBits = '';
                        this.signalStatus.textContent = '🟢 Signal Detected! Recording...';
                        this.decodedMessage.textContent = 'Light transmission detected! Recording bits...';
                        this.decodedMessage.style.background = '#d4edda';
                        this.decodedMessage.style.borderColor = '#c3e6cb';
                        
                        // Reset sync after 45 seconds of inactivity
                        this.syncTimeout = setTimeout(() => {
                            this.resetSyncState();
                        }, 45000);
                    } else {
                        this.signalStatus.textContent = `🟡 Detecting... (${this.receivedSyncBits.length} changes)`;
                        // Keep only recent bits
                        if (this.receivedSyncBits.length > 12) {
                            this.receivedSyncBits = this.receivedSyncBits.slice(-6);
                        }
                    }
                } else {
                    // We're synced, record actual message bits
                    this.receivedBits += bitValue;
                    const bitCount = this.receivedBits.length;
                    this.updateReceivedData();
                    
                    // Reset sync timeout on activity
                    if (this.syncTimeout) {
                        clearTimeout(this.syncTimeout);
                        this.syncTimeout = setTimeout(() => {
                            this.resetSyncState();
                        }, 45000);
                    }
                    
                    this.signalStatus.textContent = `🟢 Bit ${bitCount}: ${bitValue}`;
                    setTimeout(() => {
                        if (this.isReceiving) {
                            this.signalStatus.textContent = '🟡 Recording...';
                        }
                    }, 200);
                }
                
                this.lastBitTime = currentTime;
            }
        }
    }

    updateReceivedData() {
        this.bitsReceived.textContent = this.receivedBits.length;
        this.rawBitStream.textContent = this.receivedBits;
        
        // Try to decode the message
        this.tryDecodeMessage();
    }

    tryDecodeMessage() {
        const bits = this.receivedBits;
        
        // Look for start and end markers
        const startMarker = '1010';
        const endMarker = '0101';
        
        const startIndex = bits.indexOf(startMarker);
        const endIndex = bits.lastIndexOf(endMarker);
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const messageBits = bits.substring(startIndex + 4, endIndex);
            
            if (messageBits.length > 0) {
                // Try binary decoding first
                if (messageBits.length % 8 === 0) {
                    try {
                        const decoded = this.binaryToText(messageBits);
                        if (this.isPrintableText(decoded)) {
                            this.decodedMessage.textContent = `📝 ${decoded}`;
                            this.decodedMessage.style.background = '#d4edda';
                            this.decodedMessage.style.borderColor = '#c3e6cb';
                            return;
                        }
                    } catch (e) {
                        // Binary decoding failed
                    }
                }
                
                // Try morse decoding
                try {
                    const morse = messageBits.replace(/111/g, '-').replace(/1/g, '.').replace(/000/g, '/').replace(/00/g, ' ');
                    const decoded = this.morseToText(morse);
                    if (this.isPrintableText(decoded)) {
                        this.decodedMessage.textContent = `📝 ${decoded}`;
                        this.decodedMessage.style.background = '#d4edda';
                        this.decodedMessage.style.borderColor = '#c3e6cb';
                        return;
                    }
                } catch (e) {
                    // Morse decoding failed
                }
            }
        }
        
        // Show partial progress
        if (bits.length > 10) {
            this.decodedMessage.textContent = 'Receiving data... Please keep camera steady.';
            this.decodedMessage.style.background = '#fff3cd';
            this.decodedMessage.style.borderColor = '#ffeaa7';
        }
    }

    isPrintableText(text) {
        // Check if text contains mostly printable characters
        const printableChars = text.split('').filter(char => 
            char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
        ).length;
        return printableChars / text.length > 0.8 && text.length > 0;
    }

    stopReceiving() {
        this.isReceiving = false;
        
        if (this.analysisInterval) {
            cancelAnimationFrame(this.analysisInterval);
            this.analysisInterval = null;
        }
        
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        this.cameraFeed.style.display = 'none';
        this.startReceiveBtn.style.display = 'inline-block';
        this.stopReceiveBtn.style.display = 'none';
        this.signalStatus.textContent = '🔴 Stopped';
        
        // Reset all receiver data
        this.receivedBits = '';
        this.receivedSyncBits = '';
        this.isSynced = false;
        this.lastBitTime = 0;
        this.brightnessHistory = [];
        this.bitsReceived.textContent = '0';
        this.rawBitStream.textContent = '';
        this.decodedMessage.textContent = 'Receiver stopped. Click "Start Receiving" to begin.';
        this.decodedMessage.style.background = '#f8f9fa';
        this.decodedMessage.style.borderColor = '#dee2e6';
        
        // Reset brightness display
        this.brightnessLevel.style.width = '0%';
        this.brightnessValue.textContent = '0%';
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LightComm();
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 