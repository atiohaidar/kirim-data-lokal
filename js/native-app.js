/* ========================================
   Kirim Data - Native/Offline Mode Application
   Main script for native.html (WebRTC)
   ======================================== */

// --- Global State ---
let pc, dc;
let localTicket = null;
let incomingFiles = {};
const MAX_CHUNK = 16 * 1024;
const config = { iceServers: [] };

// ========================================
// ROLE SELECTION
// ========================================

function startHost() {
    initHostConnection();
}

function startJoiner() {
    pc = new RTCPeerConnection(config);
    pc.ondatachannel = e => setupDataChannel(e.channel);
    showStep('joiner-step-1');
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
    setManualText('host-offer-text', localTicket);
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

function setManualText(id, data) {
    const str = JSON.stringify(data);
    const encoded = btoa(str);
    document.getElementById(id).value = encoded;
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
            setManualText('join-answer-text', localTicket);
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
        const decoded = atob(raw);
        const ticket = JSON.parse(decoded);
        await processTicket(ticket, type);
    } catch (e) {
        alert("Kode tidak valid! Pastikan menyalin semua karakter.");
    }
}

function toggleManual(id) {
    toggleVisibility(id);
}

function triggerUpload(id) {
    triggerFileInput(id);
}

// ========================================
// DATA CHANNEL SETUP
// ========================================

function setupDataChannel(channel) {
    dc = channel;
    dc.onopen = () => {
        showStep('step-chat');
        setupNativeDragDrop();
        setupNativePaste();
    };
    dc.onmessage = handleDataChannelMessage;
}

function handleDataChannelMessage(e) {
    const data = e.data;
    if (typeof data === 'string') {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'meta') {
                // Legacy meta format
                incomingFiles[msg.data.id] = {
                    meta: msg.data,
                    buffer: [],
                    received: 0
                };
                incomingFiles.currentId = msg.data.id;
                logNative(`⬇️ Menerima: ${msg.data.name}...`, 'system');
            } else if (msg.type === 'file-meta') {
                // New chunked format
                handleIncomingFileMeta(msg, 'msgs');
            } else if (msg.type === 'file-chunk') {
                handleIncomingFileChunk(msg, 'msgs');
            } else {
                logNative(data, 'peer');
            }
        } catch (err) {
            logNative(data, 'peer');
        }
    } else {
        // Binary data - legacy format
        const currentId = incomingFiles.currentId;
        if (currentId && incomingFiles[currentId]) {
            const task = incomingFiles[currentId];
            task.buffer.push(data);
            task.received += data.byteLength;
            if (task.received >= task.meta.size) {
                finishLegacyFileReceive(task);
                delete incomingFiles[currentId];
                incomingFiles.currentId = null;
            }
        }
    }
}

// ========================================
// CHAT & MESSAGING
// ========================================

function sendMsg() {
    const inp = document.getElementById('msgInput');
    const txt = inp.value.trim();
    if (!txt || !dc || dc.readyState !== 'open') return;
    dc.send(txt);
    logNative(txt, 'me');
    inp.value = '';
}

function logNative(txt, type) {
    log(txt, type, 'msgs');
}

// ========================================
// FILE TRANSFER
// ========================================

function processFileToSend(file) {
    if (!dc || dc.readyState !== 'open') return alert("Koneksi belum siap!");

    // Use new chunked transfer with progress
    sendFileWithProgress(file, (data) => {
        if (typeof data === 'object') {
            dc.send(JSON.stringify(data));
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
