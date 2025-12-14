/* ========================================
   Kirim Data - QR Mode Application
   Main script for index.html (PeerJS + QR)
   ======================================== */

// --- Global State ---
let peer;
let conn;
let myId;
let html5QrCode;
let isHost = false;
let connectionTime = null;
let myUsername = '';
let peerUsername = '';

// --- Audio Functions ---
// Note: audioContext and base audio functions (playTone, playSendSound) are defined in entrance.js

/**
 * Sound for receiving message - lower pitch, notification style
 * Uses playTone from entrance.js
 */
function playReceiveSound() {
    playTone(523, 0.15, 'sine', 0.3); // C5 note
    setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 80); // E5 note
}

/**
 * Get username from input
 */
function getUsername() {
    const input = document.getElementById('username-input');
    return input ? input.value.trim() : '';
}

// --- Info Panel State ---
const infoState = {
    status: 'disconnected', // 'connecting', 'connected', 'disconnected'
    roomId: null,
    role: null,
    peerId: null,
    peerJoinTime: null,
    stats: {
        bytesSent: 0,
        bytesRecv: 0,
        filesSent: 0,
        filesRecv: 0,
        msgSent: 0,
        msgRecv: 0
    },
    logs: []
};

// ========================================
// INFO PANEL FUNCTIONS
// ========================================

/**
 * Toggle info panel visibility (for mobile)
 */
function toggleInfoPanel() {
    const panel = document.getElementById('info-panel');
    const btn = document.getElementById('info-toggle-btn');

    if (panel.classList.contains('visible')) {
        panel.classList.remove('visible');
        btn.classList.remove('active');
        btn.querySelector('span:first-child').textContent = '📊 Tampilkan Informasi';
    } else {
        panel.classList.add('visible');
        btn.classList.add('active');
        btn.querySelector('span:first-child').textContent = '📊 Sembunyikan Informasi';
    }
}

/**
 * Add activity log entry
 */
function addActivityLog(type, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    infoState.logs.unshift({ time, type, message });

    // Keep max 50 logs
    if (infoState.logs.length > 50) {
        infoState.logs.pop();
    }

    updateActivityLogUI();
}

/**
 * Update activity log UI
 */
function updateActivityLogUI() {
    const container = document.getElementById('activity-log');
    if (!container) return;

    if (infoState.logs.length === 0) {
        container.innerHTML = '<div class="empty-log">Belum ada aktivitas</div>';
        return;
    }

    container.innerHTML = infoState.logs.map(log => `
        <div class="log-entry ${log.type}">
            <span class="log-time">[${log.time}]</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');
}

/**
 * Update connection status UI
 */
function updateStatusUI() {
    const statusEl = document.getElementById('info-status');
    const roomIdEl = document.getElementById('info-room-id');
    const roleEl = document.getElementById('info-role');

    if (statusEl) {
        let statusHtml = '';
        switch (infoState.status) {
            case 'connected':
                statusHtml = '<span class="status-dot connected"></span> Terhubung';
                break;
            case 'connecting':
                statusHtml = '<span class="status-dot connecting"></span> Menghubungkan...';
                break;
            default:
                statusHtml = '<span class="status-dot disconnected"></span> Terputus';
        }
        statusEl.innerHTML = statusHtml;
    }

    if (roomIdEl) {
        roomIdEl.textContent = infoState.roomId || '-';
    }

    if (roleEl) {
        roleEl.textContent = infoState.role || '-';
    }
}

/**
 * Update users list UI
 */
function updateUsersUI() {
    const container = document.getElementById('info-users');
    if (!container) return;

    if (!infoState.peerId) {
        container.innerHTML = '<div class="empty-users">Belum ada user terhubung</div>';
        return;
    }

    const joinTime = infoState.peerJoinTime ? getTimeAgo(infoState.peerJoinTime) : '';
    const displayName = peerUsername || `Peer ${infoState.peerId}`;
    const initial = peerUsername ? peerUsername.charAt(0).toUpperCase() : infoState.peerId.charAt(0).toUpperCase();

    container.innerHTML = `
        <div class="user-item">
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
                <div class="user-id">${displayName}</div>
                <div class="user-time">${joinTime}</div>
            </div>
        </div>
    `;
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'baru saja';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m yang lalu`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}j yang lalu`;
    return `${Math.floor(seconds / 86400)}h yang lalu`;
}

/**
 * Update statistics UI
 */
function updateStatsUI() {
    const stats = infoState.stats;

    const elements = {
        'stat-bytes-sent': formatBytes(stats.bytesSent),
        'stat-bytes-recv': formatBytes(stats.bytesRecv),
        'stat-files-sent': stats.filesSent.toString(),
        'stat-files-recv': stats.filesRecv.toString(),
        'stat-msg-sent': stats.msgSent.toString(),
        'stat-msg-recv': stats.msgRecv.toString()
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

/**
 * Update all info panel sections
 */
function updateInfoPanel() {
    updateStatusUI();
    updateUsersUI();
    updateStatsUI();
}

/**
 * Track bytes sent for statistics
 */
function trackBytesSent(bytes) {
    infoState.stats.bytesSent += bytes;
    updateStatsUI();
}

/**
 * Track bytes received for statistics
 */
function trackBytesRecv(bytes) {
    infoState.stats.bytesRecv += bytes;
    updateStatsUI();
}

/**
 * Track file sent
 */
function trackFileSent(fileName, fileSize) {
    infoState.stats.filesSent++;
    infoState.stats.bytesSent += fileSize;
    addActivityLog('success', `📤 File terkirim: ${fileName}`);
    updateStatsUI();
}

/**
 * Track file received
 */
function trackFileRecv(fileName, fileSize) {
    infoState.stats.filesRecv++;
    infoState.stats.bytesRecv += fileSize;
    addActivityLog('success', `📥 File diterima: ${fileName}`);
    updateStatsUI();
}

/**
 * Track message sent
 */
function trackMsgSent(msg) {
    infoState.stats.msgSent++;
    addActivityLog('info', `📤 Pesan terkirim`);
    updateStatsUI();
    playSendSound();
}

/**
 * Track message received
 */
function trackMsgRecv(msg) {
    infoState.stats.msgRecv++;
    addActivityLog('info', `📥 Pesan diterima`);
    updateStatsUI();
    playReceiveSound();
}


// ========================================
// STATUS LOG HELPER
// ========================================

/**
 * Add a log entry to a status log container
 * @param {string} containerId - ID of the status log container
 * @param {string} text - Log message
 * @param {string} icon - Emoji icon
 * @param {string} status - 'active', 'success', 'error', or ''
 */
function statusLog(containerId, text, icon = '⏳', status = 'active') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mark previous active lines as complete
    container.querySelectorAll('.log-line.active').forEach(line => {
        line.classList.remove('active');
        line.classList.add('success');
        const iconEl = line.querySelector('.log-icon');
        if (iconEl) iconEl.textContent = '✓';
    });

    // Add new log line
    const line = document.createElement('div');
    line.className = `log-line ${status}`;
    line.innerHTML = `
        <span class="log-icon${status === 'active' ? ' spin' : ''}">${icon}</span>
        <span class="log-text">${text}</span>
    `;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
}

/**
 * Clear status log
 */
function clearStatusLog(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
}

// ========================================
// HOST LOGIC
// ========================================

function initHost() {
    showStep('step-host');
    isHost = true;

    // Update info panel state
    infoState.status = 'connecting';
    infoState.role = 'Host';
    addActivityLog('info', '🔑 Membuat room baru...');

    // Clear and start status log
    clearStatusLog('host-status-log');
    statusLog('host-status-log', 'Membuat ID Room...', '🔑', 'active');

    // Generate ID but show as "loading" state
    myId = generateId();
    const idDisplay = document.getElementById('my-id-display');
    idDisplay.textContent = '····';
    idDisplay.style.opacity = '0.5';
    idDisplay.title = 'Menunggu koneksi ke server...';

    setTimeout(() => {
        statusLog('host-status-log', `ID Room: ${myId}`, '✓', 'success');
        statusLog('host-status-log', 'Menghubungkan ke server PeerJS...', '🌐', 'active');
    }, 300);

    try {
        if (typeof Peer === 'undefined') {
            statusLog('host-status-log', 'Library PeerJS tidak ditemukan!', '❌', 'error');
            return;
        }

        peer = new Peer(myId, { debug: 1 });

        peer.on('open', (id) => {
            statusLog('host-status-log', 'Terhubung ke server!', '✓', 'success');

            // Init Video Call
            VideoCall.init(peer);

            // NOW the peer is ready - show the actual ID
            idDisplay.textContent = id;
            idDisplay.style.opacity = '1';
            idDisplay.title = 'Klik untuk salin';

            // Update info panel with room ID
            infoState.roomId = id;
            updateStatusUI();
            addActivityLog('success', `🏠 Room ${id} siap`);

            statusLog('host-status-log', 'Room siap!', '✓', 'success');
            statusLog('host-status-log', 'Menunggu teman bergabung...', '📡', 'active');
        });

        peer.on('connection', (c) => {
            statusLog('host-status-log', 'Teman terhubung!', '🎉', 'success');
            conn = c;
            setupConnection();
        });

        peer.on('error', (err) => {
            statusLog('host-status-log', `Error: ${err.type}`, '❌', 'error');
        });
    } catch (e) {
        statusLog('host-status-log', `Gagal: ${e.message}`, '❌', 'error');
        console.error(e);
    }
}

function copyId() {
    const text = document.getElementById('my-id-display').textContent;
    copyToClipboard(text, "ID Room disalin!");
}

/**
 * Generate QR code on demand (optional feature)
 */
function generateQR() {
    const qrSection = document.getElementById('qr-section');
    const qrEl = document.getElementById('qrcode');
    const btn = document.getElementById('btn-generate-qr');

    if (!myId || myId === '····') {
        showToast('Tunggu sampai room siap...');
        return;
    }

    if (typeof QRCode === 'undefined') {
        showToast('Library QR tidak tersedia');
        return;
    }

    // Clear and generate QR
    qrEl.innerHTML = '';
    new QRCode(qrEl, {
        text: myId,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Show QR section and hide button
    qrSection.style.display = 'block';
    btn.style.display = 'none';

    addActivityLog('info', '📱 QR Code ditampilkan');
}

// ========================================
// JOIN & SCANNER LOGIC
// ========================================

function showJoin() {
    showStep('step-join');
}

function startScanner() {
    const readerDiv = document.getElementById('reader');
    readerDiv.style.display = 'block';
    document.getElementById('btn-scan').style.display = 'none';

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .catch(err => {
            alert("Gagal membuka kamera: " + err + "\nPastikan anda mengizinkan akses kamera dan menggunakan HTTPS/localhost.");
            readerDiv.style.display = 'none';
            document.getElementById('btn-scan').style.display = 'block';
        });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            document.getElementById('reader').style.display = 'none';
            document.getElementById('btn-scan').style.display = 'block';
            html5QrCode = null;
        }).catch(err => {
            console.warn("Scanner stop warning:", err);
            // If it fails to stop (e.g. already stopped), we still want to cleanup UI if possible
            try { html5QrCode.clear(); } catch (e) { }
            document.getElementById('reader').style.display = 'none';
            document.getElementById('btn-scan').style.display = 'block';
            html5QrCode = null;
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    stopScanner();
    document.getElementById('join-id-input').value = decodedText;
    joinRoom();
}

function onScanFailure(error) {
    // scan in progress, ignore errors
}

function joinRoom() {
    const targetId = document.getElementById('join-id-input').value.trim();
    if (!targetId) return;

    // Ensure scanner is off if it was running
    stopScanner();

    isHost = false;

    // Update info panel state
    infoState.status = 'connecting';
    infoState.role = 'Guest';
    infoState.roomId = targetId;
    updateStatusUI();
    addActivityLog('info', `🔗 Menghubungkan ke room ${targetId}...`);

    // Show and clear status log
    const statusLogEl = document.getElementById('join-status-log');
    statusLogEl.style.display = 'block';
    clearStatusLog('join-status-log');

    document.getElementById('btn-join').style.display = 'none';
    statusLog('join-status-log', `Target: Room ${targetId}`, '🎯', 'success');
    statusLog('join-status-log', 'Menyiapkan koneksi...', '🔧', 'active');

    peer = new Peer({ debug: 1 });

    peer.on('open', () => {
        // Init Video Call
        VideoCall.init(peer);

        statusLog('join-status-log', 'Peer ID aktif!', '✓', 'success');
        statusLog('join-status-log', `Menghubungkan ke room ${targetId}...`, '📡', 'active');

        conn = peer.connect(targetId);
        conn.on('open', () => {
            statusLog('join-status-log', 'Terhubung!', '🎉', 'success');
            setTimeout(() => {
                statusLogEl.style.display = 'none';
                setupConnection();
            }, 500);
        });
        conn.on('error', (err) => {
            statusLog('join-status-log', `Gagal: ${err}`, '❌', 'error');
            document.getElementById('btn-join').style.display = 'block';
        });

        setTimeout(() => {
            if (!conn.open) {
                statusLog('join-status-log', 'Timeout! ID room mungkin salah.', '⏱️', 'error');
                document.getElementById('btn-join').style.display = 'block';
            }
        }, 10000);
    });

    peer.on('error', err => {
        statusLog('join-status-log', `Error: ${err.type}`, '❌', 'error');
        document.getElementById('btn-join').style.display = 'block';
    });
}

// ========================================
// CONNECTION LOGIC
// ========================================

function setupConnection() {
    showStep('step-chat');
    log("✅ Terhubung dengan teman!");

    // Get username from input
    myUsername = getUsername();

    // Update info panel state
    infoState.status = 'connected';
    infoState.peerId = conn.peer;
    infoState.peerJoinTime = new Date();
    connectionTime = new Date();
    updateInfoPanel();
    addActivityLog('success', `✅ Terhubung dengan peer ${conn.peer}`);

    // Send our username to peer if we have one
    if (myUsername) {
        conn.send({ type: 'username', username: myUsername });
    }

    // Update user time periodically
    setInterval(() => {
        updateUsersUI();
    }, 60000); // Update every minute

    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'file-meta') {
            handleIncomingFileMeta(data);
        } else if (typeof data === 'object' && data.type === 'file-chunk') {
            handleIncomingFileChunk(data);
        } else if (typeof data === 'object' && data.type === 'file') {
            handleIncomingFileLegacy(data);
        } else if (typeof data === 'object' && data.type === 'username') {
            // Handle username message
            peerUsername = data.username;
            updateUsersUI();
            addActivityLog('info', `👤 Peer bernama: ${peerUsername}`);
        } else {
            // Display with username if available
            // Display without username prefix as requested
            log(data, 'peer');
            trackMsgRecv(data);
        }
    });

    conn.on('close', () => {
        log("❌ Koneksi terputus.", 'system');
        infoState.status = 'disconnected';
        updateStatusUI();
        addActivityLog('error', '❌ Koneksi terputus');
        setTimeout(() => alert("Koneksi terputus."), 1000);
    });
}

// ========================================
// CHAT & MESSAGING
// ========================================

function handleKey(e) {
    if (e.key === 'Enter') sendMsg();
}

function sendMsg() {
    const input = document.getElementById('msg-input');
    const txt = input.value.trim();
    if (!txt || !conn) return;

    conn.send(txt);
    log(txt, 'me');
    trackMsgSent(txt);
    if (typeof playSendSound === 'function') playSendSound();
    input.value = '';
}

// ========================================
// FILE HANDLING
// ========================================

function handleFileSelect(input) {
    processFilesForSend(input.files);
}

function processFilesForSend(files) {
    if (!files || files.length === 0 || !conn) return;
    processFiles(files, sendSingleFile);
}

function sendSingleFile(file) {
    sendFileWithProgress(file, (data) => conn.send(data));
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Setup drag and drop
    setupDragAndDrop('step-chat', 'drag-overlay', processFilesForSend);

    // Setup paste
    setupPaste('step-chat', processFilesForSend);
});

// ========================================
// VIDEO CALL INTEGRATION
// ========================================

// Global function to show incoming call modal (called from video-call.js)
let pendingCall = null;

function showIncomingCallModal(call) {
    pendingCall = call;
    document.getElementById('incoming-caller-id').textContent = 'Dari: ' + (call.peer || 'Unknown');
    document.getElementById('incoming-call-modal').classList.add('active');
    playReceiveSound(); // Use existing sound as ringtone
}

window.acceptCall = function () {
    if (pendingCall) {
        VideoCall.answerCall(pendingCall);
        document.getElementById('incoming-call-modal').classList.remove('active');
        pendingCall = null;
    }
}

window.rejectCall = function () {
    if (pendingCall) {
        pendingCall.close();
        document.getElementById('incoming-call-modal').classList.remove('active');
        pendingCall = null;
    }
}
