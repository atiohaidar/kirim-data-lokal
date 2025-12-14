/* ========================================
   Kirim Data - Native/Offline Mode Application
   Main script for native.html (WebRTC)
   ======================================== */

// --- Global State ---
let pc, dc;
let localTicket = null;
// incomingFiles is already declared in file-transfer.js
const MAX_CHUNK = 16 * 1024;
const config = { iceServers: [] };

// ========================================
// ROLE SELECTION
// ========================================



// ========================================
// INFO PANEL & STATS LOGIC
// ========================================

const infoState = {
    status: 'disconnected', // 'connecting', 'connected', 'disconnected'
    role: null,
    joinTime: null,
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

/**
 * Toggle info panel visibility
 */
function toggleInfoPanel() {
    const panel = document.getElementById('info-panel');
    const btn = document.getElementById('info-toggle-btn');
    if (!panel || !btn) return;

    if (panel.classList.contains('visible')) {
        panel.classList.remove('visible');
        btn.classList.remove('active');
        btn.querySelector('span:first-child').textContent = '📊 Info';
    } else {
        panel.classList.add('visible');
        btn.classList.add('active');
        btn.querySelector('span:first-child').textContent = '📊 Sembunyikan';
    }
}

/**
 * Add activity log entry
 */
function addActivityLog(type, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    infoState.logs.unshift({ time, type, message });
    if (infoState.logs.length > 50) infoState.logs.pop();
    updateActivityLogUI();
}

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

function updateStatusUI() {
    const statusEl = document.getElementById('info-status');
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

    if (roleEl) {
        roleEl.textContent = infoState.role || '-';
    }
}

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

function trackMsgSent(msg) {
    infoState.stats.msgSent++;
    addActivityLog('info', '📤 Pesan terkirim');
    updateStatsUI();
}

function trackMsgRecv(msg) {
    infoState.stats.msgRecv++;
    addActivityLog('info', '📥 Pesan diterima');
    updateStatsUI();
}

function trackFileSent(fileName, fileSize) {
    infoState.stats.filesSent++;
    infoState.stats.bytesSent += fileSize;
    addActivityLog('success', `📤 File terkirim: ${fileName}`);
    updateStatsUI();
}

function trackFileRecv(fileName, fileSize) {
    infoState.stats.filesRecv++;
    infoState.stats.bytesRecv += fileSize;
    addActivityLog('success', `📥 File diterima: ${fileName}`);
    updateStatsUI();
}

// Hook into existing functions
// ========================================
// ROLE SELECTION
// ========================================

function startHost() {
    infoState.role = 'Host';
    infoState.status = 'connecting';
    updateStatusUI();
    addActivityLog('info', 'Menyiapkan Host...');

    // Core Logic
    initHostConnection();
}

function startJoiner() {
    infoState.role = 'Guest';
    infoState.status = 'connecting';
    updateStatusUI();
    addActivityLog('info', 'Menyiapkan Guest...');

    // Core Logic
    pc = new RTCPeerConnection(config);
    pc.ondatachannel = e => setupDataChannel(e.channel);
    showStep('joiner-step-1');
}

// Intercept Data Channel Setup for Connection Status
// ========================================
// DATA CHANNEL SETUP (Consolidated)
// ========================================

function setupDataChannel(channel) {
    dc = channel;
    dc.onopen = () => {
        showStep('step-chat');
        setupNativeDragDrop();
        setupNativePaste();

        // Info Panel Hooks
        if (typeof infoState !== 'undefined') {
            infoState.status = 'connected';
            infoState.joinTime = new Date();
            updateStatusUI();
            addActivityLog('success', '✅ Koneksi P2P Terbuka!');
        }
    };

    dc.onclose = () => {
        infoState.status = 'disconnected';
        updateStatusUI();
        addActivityLog('error', '❌ Koneksi terputus');
    };

    dc.onmessage = handleDataChannelMessage;
}

function sendMsg() {
    const inp = document.getElementById('msgInput');
    const txt = inp.value.trim();
    if (!txt || !dc || dc.readyState !== 'open') return;

    dc.send(txt);
    logNative(txt, 'me');
    inp.value = '';

    trackMsgSent(txt);
}

function handleDataChannelMessage(e) {
    const data = e.data;

    // 1. Try treating as JSON string (Metadata or Base64 Chunk)
    if (typeof data === 'string') {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'meta') {
                // Legacy meta
                incomingFiles[msg.data.id] = { meta: msg.data, buffer: [], received: 0 };
                incomingFiles.currentId = msg.data.id;
                logNative(`⬇️ Menerima: ${msg.data.name}...`, 'system');

            } else if (msg.type === 'file-meta') {
                // New chunked meta
                handleIncomingFileMeta(msg, 'msgs');

            } else if (msg.type === 'file-chunk') {
                // File chunk
                if (msg.isBase64 && typeof msg.data === 'string') {
                    msg.data = base64ToArrayBuffer(msg.data);
                }
                handleIncomingFileChunk(msg, 'msgs');

            } else if (msg.type && msg.type.startsWith('video-')) {
                // Video Signaling
                NativeVideo.handleSignal(msg);

            } else {
                // Parsed as JSON but unknown type, likely chat?
                // Or maybe just a chat object?
                logNative(data, 'peer');
                trackMsgRecv(data);
            }
        } catch (err) {
            // Not JSON, simple text chat
            logNative(data, 'peer');
            trackMsgRecv(data);
        }
    }
    // 2. Binary Data (Legacy)
    else {
        const currentId = incomingFiles.currentId;
        if (currentId && incomingFiles[currentId]) {
            const task = incomingFiles[currentId];
            task.buffer.push(data);
            task.received += data.byteLength;

            if (task.received >= task.meta.size) {
                finishLegacyFileReceive(task);
                delete incomingFiles[currentId];
                incomingFiles.currentId = null;
                trackFileRecv(task.meta.name, task.meta.size);
            }
        }
    }
}


// ========================================
// HOST LOGIC
// ========================================

async function initHostConnection() {
    pc = new RTCPeerConnection(config);
    dc = pc.createDataChannel("chat");
    setupDataChannel(dc);
    showStep('host-step-1');

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce();

    localTicket = pc.localDescription;
    setTicketText('host-offer-text', localTicket);
    showStep('host-step-2');
}

// ========================================
// TICKET HANDLING
// ========================================

function downloadTicket(type) {
    if (!localTicket) return alert("Tiket belum siap!");
    const blob = new Blob([JSON.stringify(localTicket)], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = type === 'offer' ? 'tiket-undangan.json' : 'tiket-balasan.json';
    link.click();
}


function setTicketText(id, data) {
    const str = JSON.stringify(data);
    // Remove Base64 encoding for easier manual copying
    document.getElementById(id).value = str;
}

async function waitForIce() {
    if (pc.iceGatheringState === 'complete') return;
    return new Promise(r => {
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') r();
        };
    });
}

async function processTicket(ticket, type) {
    try {
        if (type === 'offer') {
            await pc.setRemoteDescription(ticket);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await waitForIce();

            localTicket = pc.localDescription;
            setTicketText('join-answer-text', localTicket);
            showStep('joiner-step-2');
        } else {
            await pc.setRemoteDescription(ticket);
        }
    } catch (err) {
        alert("Kode/File Tiket Rusak atau Salah!");
        console.error(err);
    }
}

async function handleFileUpload(input, type) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => processTicket(JSON.parse(e.target.result), type);
    reader.readAsText(file);
}

async function handleManualText(type, inputId) {
    const raw = document.getElementById(inputId).value.trim();
    if (!raw) return alert("Tempel kode dulu!");
    try {
        // Try parsing JSON directly (new format)
        const ticket = JSON.parse(raw);
        await processTicket(ticket, type);
    } catch (e) {
        // Fallback: try decoding from Base64 (legacy format support)
        try {
            const decoded = atob(raw);
            const ticket = JSON.parse(decoded);
            await processTicket(ticket, type);
        } catch (e2) {
            alert("Kode tidak valid! Pastikan menyalin semua teks JSON.");
        }
    }
}

function toggleManual(id) {
    toggleVisibility(id);
}

function copyToClipboard(id) {
    const el = document.getElementById(id);
    el.select();
    el.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(el.value).then(() => {
        alert("Berhasil disalin! Kirimkan ke teman.");
    }).catch(err => {
        alert("Gagal menyalin otomatis, silakan salin manual.");
    });
}

function triggerUpload(id) {
    triggerFileInput(id);
}

// ========================================
// DATA CHANNEL SETUP
// ========================================

// ========================================
// DATA CHANNEL SETUP
// ========================================





function logNative(txt, type) {
    log(txt, type, 'msgs');
}

// ========================================
// FILE TRANSFER
// ========================================

/**
 * Helper: Convert ArrayBuffer to Base64
 * Needed because JSON.stringify cannot handle raw ArrayBuffers
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function processFileToSend(file) {
    if (!dc || dc.readyState !== 'open') return alert("Koneksi belum siap!");

    // Use new chunked transfer with progress
    sendFileWithProgress(file, (data) => {
        if (typeof data === 'object') {
            // If it's a file chunk, we must Base64 encode the binary data
            // because standard JSON cannot serialize ArrayBuffers.
            if (data.type === 'file-chunk' && data.data instanceof ArrayBuffer) {
                const base64Data = arrayBufferToBase64(data.data);
                const safePacket = {
                    ...data,
                    data: base64Data,
                    isBase64: true
                };
                dc.send(JSON.stringify(safePacket));
            } else {
                dc.send(JSON.stringify(data));
            }
        } else {
            dc.send(data);
        }
    }, 'msgs');
}

function sendFileTransferManual() {
    const input = document.getElementById('fileTransferInput');
    if (input.files.length > 0) {
        Array.from(input.files).forEach(file => processFileToSend(file));
    }
}

function finishLegacyFileReceive(task) {
    const blob = new Blob(task.buffer, { type: task.meta.type });
    const url = URL.createObjectURL(blob);
    const div = document.createElement('div');
    div.className = 'msg peer';

    if (task.meta.type.startsWith('image/')) {
        div.style.background = 'transparent';
        div.style.padding = '0';
        div.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px; display:block;">
                         <a href="${url}" download="${task.meta.name}" class="file-link" style="margin-top:5px; display:block; font-size:0.8rem;">💾 Simpan Gambar</a>`;
    } else if (task.meta.type.startsWith('video/')) {
        div.style.background = 'transparent';
        div.style.padding = '0';
        div.innerHTML = `<video src="${url}" controls style="max-width:100%; border-radius:8px; display:block;"></video>
                         <a href="${url}" download="${task.meta.name}" class="file-link" style="margin-top:5px; display:block; font-size:0.8rem;">💾 Simpan Video</a>`;
    } else {
        div.innerHTML = `📂 <b>File Diterima:</b><br><a href="${url}" download="${task.meta.name}" style="color:#2563eb; font-weight:bold;">${task.meta.name}</a>`;
    }
    document.getElementById('msgs').appendChild(div);
    autoScroll('msgs');
}

// ========================================
// DRAG & DROP / PASTE
// ========================================

function setupNativeDragDrop() {
    const zone = document.getElementById('chat-zone');
    zone.addEventListener('dragenter', e => {
        e.preventDefault();
        zone.classList.add('drag-active');
    });
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-active');
    });
    zone.addEventListener('dragleave', e => {
        e.preventDefault();
        zone.classList.remove('drag-active');
    });
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(file => processFileToSend(file));
        }
    });
}

function setupNativePaste() {
    document.onpaste = e => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file') {
                processFileToSend(item.getAsFile());
            }
        }
    };
}

// ========================================
// VIDEO SIGNALING & GLOBAL HELPERS
// ========================================

function showIncomingCallModal(callerName) {
    document.getElementById('incoming-caller-id').textContent = callerName;
    document.getElementById('incoming-call-modal').classList.add('active');
    // We can play sound here if available
    try { playTone(523, 0.5, 'sine'); setTimeout(() => playTone(659, 0.5, 'sine'), 400); } catch (e) { }
}

window.acceptNativeCall = function () {
    NativeVideo.acceptCall();
    document.getElementById('incoming-call-modal').classList.remove('active');
}

window.rejectNativeCall = function () {
    NativeVideo.endCall(); // Or reject signal
    document.getElementById('incoming-call-modal').classList.remove('active');
}

// Ensure track listener is setup when PC is created
const originalInitHost = initHostConnection;
initHostConnection = async function () {
    await originalInitHost();
    setupTrackListener();
};

const originalStartJoiner = startJoiner;
startJoiner = function () {
    originalStartJoiner();
    setupTrackListener();
};

