/* ========================================
   Kirim Data - QR Mode Application
   Main script for index.html (PeerJS + QR)
   ======================================== */

// --- Global State ---
let peer;
let conn;
let myId;
let html5QrCode;

// ========================================
// HOST LOGIC
// ========================================

function initHost() {
    showStep('step-host');

    // Show ID Immediately
    myId = generateId();
    document.getElementById('my-id-display').textContent = myId;

    const qrEl = document.getElementById('qrcode');
    qrEl.innerHTML = '<div class="spinner"></div><br><p style="text-align:center; font-size:0.9rem; color:var(--text-light)">Menghubungkan ke server...</p>';

    try {
        if (typeof Peer === 'undefined') {
            alert("Library PeerJS tidak termuat. Cek koneksi internet anda.");
            return;
        }

        peer = new Peer(myId, { debug: 1 });

        peer.on('open', (id) => {
            document.getElementById('my-id-display').textContent = id;
            qrEl.innerHTML = "";

            if (typeof QRCode === 'undefined') {
                qrEl.textContent = "QR Lib Error";
                alert("Library QRCode tidak termuat.");
                return;
            }

            new QRCode(qrEl, {
                text: id,
                width: 180,
                height: 180,
                colorDark: "#2563eb",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        });

        peer.on('connection', (c) => {
            conn = c;
            setupConnection();
        });

        peer.on('error', (err) => {
            alert("Error Peer: " + err.type);
        });
    } catch (e) {
        alert("Gagal membuat room: " + e.message);
        console.error(e);
    }
}

function copyId() {
    const text = document.getElementById('my-id-display').textContent;
    copyToClipboard(text, "ID Room disalin!");
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
        }).catch(err => console.error("Failed to stop scanner", err));
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

    document.getElementById('btn-join').style.display = 'none';
    document.getElementById('join-loading').style.display = 'block';

    peer = new Peer({ debug: 1 });

    peer.on('open', () => {
        conn = peer.connect(targetId);
        conn.on('open', () => {
            document.getElementById('join-loading').style.display = 'none';
            setupConnection();
        });
        conn.on('error', (err) => {
            document.getElementById('btn-join').style.display = 'block';
            document.getElementById('join-loading').style.display = 'none';
            alert("Gagal konek: " + err);
            resetApp();
        });

        setTimeout(() => {
            if (!conn.open) {
                document.getElementById('btn-join').style.display = 'block';
                document.getElementById('join-loading').style.display = 'none';
                alert("Koneksi timeout. Pastikan ID room benar.");
            }
        }, 10000);
    });

    peer.on('error', err => {
        document.getElementById('btn-join').style.display = 'block';
        document.getElementById('join-loading').style.display = 'none';
        alert('Peer Error: ' + err);
    });
}

// ========================================
// CONNECTION LOGIC
// ========================================

function setupConnection() {
    showStep('step-chat');
    log("✅ Terhubung dengan teman!");

    // Override showStep to stop scanner
    const originalShowStep = showStep;

    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'file-meta') {
            handleIncomingFileMeta(data);
        } else if (typeof data === 'object' && data.type === 'file-chunk') {
            handleIncomingFileChunk(data);
        } else if (typeof data === 'object' && data.type === 'file') {
            handleIncomingFileLegacy(data);
        } else {
            log(data, 'peer');
        }
    });

    conn.on('close', () => {
        log("❌ Koneksi terputus.", 'system');
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
