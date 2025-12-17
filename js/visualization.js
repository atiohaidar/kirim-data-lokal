/* ========================================
   Kirim Data - Visualization Interactivity
   Controls and animations for how-it-works page
   ======================================== */

// ========================================
// STATE
// ========================================

const vizState = {
    currentStep: 0,
    totalSteps: 6, // Added Video Call step
    animationTimers: []
};

// Step data - accurate to actual implementation
const steps = [
    {
        id: 'intro',
        title: 'Kirim Data',
        subtitle: 'Transfer file langsung antar perangkat dalam jaringan yang sama, tanpa upload ke server.',
        details: {
            title: '🎯 Apa yang dilakukan aplikasi ini?',
            items: [
                'Menghubungkan dua perangkat secara langsung (peer-to-peer)',
                'File dikirim langsung dari pengirim ke penerima',
                'Tidak ada file yang disimpan di server manapun',
                'Bekerja selama kedua perangkat ada di internet yang sama atau bisa saling terhubung'
            ]
        }
    },
    {
        id: 'create-room',
        title: 'Membuat Room',
        subtitle: 'Host membuat room dengan ID unik. PeerJS server hanya menyimpan ID untuk koordinasi awal, bukan file.',
        details: {
            title: '🔧 Apa yang terjadi di kode?',
            items: [
                'Aplikasi menghasilkan ID 6 karakter acak (generateId())',
                'Membuat koneksi ke PeerJS cloud server untuk registrasi ID',
                'Server menyimpan: ID room dan alamat jaringan host',
                'Host menunggu peer lain untuk bergabung'
            ]
        },
        code: `// Dari app.js baris 331 & 348
myId = generateId(); // "AB12CD"
peer = new Peer(myId);

peer.on('open', (id) => {
  // Room siap, ID terdaftar di server
});`
    },
    {
        id: 'join-room',
        title: 'Bergabung ke Room',
        subtitle: 'Guest memasukkan kode room atau scan QR. Aplikasi mencari peer dengan ID tersebut di server.',
        details: {
            title: '🔧 Apa yang terjadi di kode?',
            items: [
                'Guest input kode atau scan QR untuk dapat ID room',
                'Membuat peer baru dan request koneksi ke ID target',
                'PeerJS server membantu menemukan alamat host',
                'Setelah ditemukan, proses handshake WebRTC dimulai'
            ]
        },
        code: `// Dari app.js baris 489-495
peer = new Peer(); // Guest peer baru

peer.on('open', () => {
  conn = peer.connect(targetId);
  // Request koneksi ke host
});`
    },
    {
        id: 'webrtc-handshake',
        title: 'Koneksi Langsung (P2P)',
        subtitle: 'Setelah koordinasi via server, koneksi langsung terbentuk. Server tidak lagi dibutuhkan untuk transfer.',
        details: {
            title: '🔧 Apa yang terjadi?',
            items: [
                'WebRTC melakukan "handshake" untuk buat koneksi langsung',
                'Pertukaran informasi jaringan (ICE candidates) via server',
                'Setelah terhubung, data mengalir langsung peer-to-peer',
                'Server bisa disconnect, koneksi tetap berjalan'
            ]
        },
        code: `// Dari app.js baris 526-527
function setupConnection() {
  showStep('step-chat');
  // Koneksi P2P aktif via conn
}`
    },
    {
        id: 'file-transfer',
        title: 'Transfer File',
        subtitle: 'File dipecah menjadi potongan 64KB, dikirim satu per satu, lalu dirakit ulang di penerima.',
        details: {
            title: '🔧 Apa yang terjadi di kode?',
            items: [
                'File dibaca sebagai ArrayBuffer',
                'Dipecah menjadi chunks 64KB (CHUNK_SIZE = 64 * 1024)',
                'Setiap chunk dikirim dengan metadata (fileId, chunkIndex)',
                'Penerima mengumpulkan chunks dan merakit menjadi Blob',
                'Progress ditampilkan real-time di kedua sisi'
            ]
        },
        code: `// Dari file-transfer.js baris 6 & 72-78
const CHUNK_SIZE = 64 * 1024; // 64KB

sendFn({
  type: 'file-chunk',
  fileId: fileId,
  chunkIndex: chunkIndex,
  data: chunk // ArrayBuffer 64KB
});`
    },
    {
        id: 'video-call',
        title: 'Video Call (Media Stream)',
        subtitle: 'Media (Kamera/Mic) dikirim via jalur WebRTC terpisah yang dinegosiasikan oleh PeerJS.',
        details: {
            title: '🔧 PeerJS MediaConnection',
            items: [
                'PeerJS membuat koneksi media terpisah (MediaConnection)',
                'Stream Audio/Video ditransmisikan secara real-time via UDP',
                'Koneksi data & video berjalan paralel'
            ]
        },
        code: `// Dari video-call.js
const call = peer.call(remoteId, stream);

call.on('stream', (remoteStream) => {
  // Tampilkan video teman
  videoEl.srcObject = remoteStream;
});`
    }
];

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderStep(0);
    updateProgressDots();
    updateNavButtons();
});

// ========================================
// THEME TOGGLE
// ========================================

function initTheme() {
    // Check saved preference or system preference
    const savedTheme = localStorage.getItem('viz-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        document.documentElement.classList.add('light-mode');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
}

function toggleTheme() {
    const isLightMode = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('viz-theme', isLightMode ? 'light' : 'dark');
    updateThemeIcon(isLightMode);
}

function updateThemeIcon(isLightMode) {
    const btn = document.getElementById('btn-theme');
    if (btn) {
        btn.textContent = isLightMode ? '☀️' : '🌙';
        btn.title = isLightMode ? 'Mode Gelap' : 'Mode Terang';
    }
}

// ========================================
// NAVIGATION
// ========================================

function goToStep(index) {
    if (index < 0 || index >= vizState.totalSteps) return;

    // Clear any running animations
    clearAnimations();

    vizState.currentStep = index;
    renderStep(index);
    updateProgressDots();
    updateNavButtons();
}

function nextStep() {
    if (vizState.currentStep < vizState.totalSteps - 1) {
        goToStep(vizState.currentStep + 1);
    }
}

function prevStep() {
    if (vizState.currentStep > 0) {
        goToStep(vizState.currentStep - 1);
    }
}

function updateProgressDots() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i === vizState.currentStep) {
            dot.classList.add('active');
        } else if (i < vizState.currentStep) {
            dot.classList.add('completed');
        }
    });
}

function updateNavButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (prevBtn) prevBtn.disabled = vizState.currentStep === 0;
    if (nextBtn) nextBtn.disabled = vizState.currentStep === vizState.totalSteps - 1;
}

// ========================================
// RELOAD ANIMATION
// ========================================

function reloadAnimation() {
    clearAnimations();
    renderAnimation(steps[vizState.currentStep].id);
}

// ========================================
// RENDER STEP CONTENT
// ========================================

function renderStep(index) {
    const step = steps[index];

    // Update title and subtitle
    document.getElementById('step-title').textContent = step.title;
    document.getElementById('step-subtitle').textContent = step.subtitle;

    // Update details
    const detailsContainer = document.getElementById('step-details');
    if (step.details) {
        detailsContainer.innerHTML = `
            <h3>${step.details.title}</h3>
            <ul>
                ${step.details.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
            ${step.code ? `<div class="viz-code"><pre>${escapeHtml(step.code)}</pre></div>` : ''}
        `;
    }

    // Render animation
    renderAnimation(step.id);
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ========================================
// RENDER ANIMATIONS
// ========================================

function renderAnimation(stepId) {
    const canvas = document.getElementById('anim-content');
    if (!canvas) return;

    switch (stepId) {
        case 'intro':
            renderIntroAnimation(canvas);
            break;
        case 'create-room':
            renderCreateRoomAnimation(canvas);
            break;
        case 'join-room':
            renderJoinRoomAnimation(canvas);
            break;
        case 'webrtc-handshake':
            renderHandshakeAnimation(canvas);
            break;
        case 'file-transfer':
            renderFileTransferAnimation(canvas);
            break;
        case 'video-call':
            renderVideoCallAnimation(canvas);
            break;
    }
}

function clearAnimations() {
    vizState.animationTimers.forEach(t => clearTimeout(t));
    vizState.animationTimers = [];
}

function scheduleAnimation(fn, delay) {
    const timer = setTimeout(fn, delay);
    vizState.animationTimers.push(timer);
    return timer;
}

// ========================================
// ANIMATION SCENES
// ========================================

function renderIntroAnimation(canvas) {
    canvas.innerHTML = `
        <div style="text-align: center;">
            <div class="intro-logo">🚀</div>
            <div class="intro-title">Kirim Data</div>
            <div style="margin-top: 1rem; color: var(--viz-muted);">
                Transfer file peer-to-peer
            </div>
        </div>
    `;
}

function renderCreateRoomAnimation(canvas) {
    canvas.innerHTML = `
        <div style="width: 100%; height: 100%; position: relative;">
            <!-- Device A (Host) -->
            <div class="device active" id="device-a" style="left: 20%; top: 50%; transform: translate(-50%, -50%);">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>
            
            <!-- Server -->
            <div class="server" id="server" style="left: 50%; top: 20%; transform: translate(-50%, -50%); opacity: 0;">
                <div class="server-icon">☁️</div>
                <div class="server-label">PeerJS Server</div>
            </div>
            
            <!-- Room Code -->
            <div id="room-code" style="position: absolute; left: 50%; top: 70%; transform: translate(-50%, -50%); opacity: 0;">
                <div style="text-align: center; color: var(--viz-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Kode Room:</div>
                <div class="room-code" id="room-code-text"></div>
            </div>
            
            <!-- Connection line -->
            <svg style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;">
                <line id="line-to-server" x1="30%" y1="45%" x2="45%" y2="28%" 
                      stroke="var(--viz-secondary)" stroke-width="2" stroke-dasharray="5,5" opacity="0"/>
            </svg>
        </div>
    `;

    // Animate
    scheduleAnimation(() => {
        document.getElementById('server').style.opacity = '1';
        document.getElementById('line-to-server').style.opacity = '1';
    }, 500);

    scheduleAnimation(() => {
        const codeEl = document.getElementById('room-code');
        const textEl = document.getElementById('room-code-text');
        codeEl.style.opacity = '1';
        typeCode(textEl, 'AB12CD');
    }, 1200);
}

function typeCode(element, code) {
    let i = 0;
    function type() {
        if (i < code.length) {
            element.textContent += code[i];
            i++;
            scheduleAnimation(type, 150);
        }
    }
    type();
}

function renderJoinRoomAnimation(canvas) {
    canvas.innerHTML = `
        <div style="width: 100%; height: 100%; position: relative;">
            <!-- Device A (Host) -->
            <div class="device" style="left: 20%; top: 50%; transform: translate(-50%, -50%);">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>
            
            <!-- Device B (Guest) -->
            <div class="device" id="device-b" style="right: 20%; top: 50%; transform: translate(50%, -50%); opacity: 0;">
                <div class="device-screen">💻</div>
                <div class="device-label">Guest</div>
            </div>
            
            <!-- Server -->
            <div class="server" style="left: 50%; top: 20%; transform: translate(-50%, -50%);">
                <div class="server-icon">☁️</div>
                <div class="server-label">PeerJS Server</div>
            </div>
            
            <!-- Input code animation -->
            <div id="input-code" style="position: absolute; right: 25%; top: 75%; transform: translate(50%, 0); opacity: 0;">
                <div style="background: var(--viz-card); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--viz-primary);">
                    <span style="color: var(--viz-muted);">Kode: </span>
                    <span class="room-code" style="font-size: 1.2rem;">AB12CD</span>
                </div>
            </div>
            
            <!-- Connection lines -->
            <svg style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;">
                <line x1="30%" y1="45%" x2="45%" y2="28%" stroke="var(--viz-secondary)" stroke-width="2" stroke-dasharray="5,5"/>
                <line id="line-guest-server" x1="70%" y1="45%" x2="55%" y2="28%" 
                      stroke="var(--viz-secondary)" stroke-width="2" stroke-dasharray="5,5" opacity="0"/>
            </svg>
        </div>
    `;

    // Animate
    scheduleAnimation(() => {
        document.getElementById('device-b').style.opacity = '1';
    }, 500);

    scheduleAnimation(() => {
        document.getElementById('input-code').style.opacity = '1';
    }, 1000);

    scheduleAnimation(() => {
        document.getElementById('line-guest-server').style.opacity = '1';
    }, 1500);
}

function renderHandshakeAnimation(canvas) {
    canvas.innerHTML = `
        <div style="width: 100%; height: 100%; position: relative;">
            <!-- Device A (Host) -->
            <div class="device active" style="left: 15%; top: 50%; transform: translate(-50%, -50%);">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>
            
            <!-- Device B (Guest) -->
            <div class="device active" style="right: 15%; top: 50%; transform: translate(50%, -50%);">
                <div class="device-screen">💻</div>
                <div class="device-label">Guest</div>
            </div>
            
            <!-- Server (fading) -->
            <div class="server" id="server-fade" style="left: 50%; top: 20%; transform: translate(-50%, -50%);">
                <div class="server-icon">☁️</div>
                <div class="server-label">PeerJS Server</div>
            </div>
            
            <!-- P2P Tunnel -->
            <div id="p2p-tunnel" style="position: absolute; left: 50%; top: 55%; transform: translate(-50%, -50%); opacity: 0;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 80px; height: 4px; background: linear-gradient(90deg, var(--viz-primary), var(--viz-accent)); border-radius: 2px; box-shadow: 0 0 10px var(--viz-primary);"></div>
                    <span style="color: var(--viz-primary); font-weight: bold;">P2P</span>
                    <div style="width: 80px; height: 4px; background: linear-gradient(90deg, var(--viz-accent), var(--viz-primary)); border-radius: 2px; box-shadow: 0 0 10px var(--viz-primary);"></div>
                </div>
            </div>
            
            <!-- Status text -->
            <div id="status-text" style="position: absolute; left: 50%; bottom: 15%; transform: translateX(-50%); text-align: center; color: var(--viz-muted);"></div>
            
            <!-- Connection lines -->
            <svg style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;">
                <line x1="25%" y1="45%" x2="45%" y2="28%" stroke="var(--viz-secondary)" stroke-width="2" stroke-dasharray="5,5" id="line1"/>
                <line x1="75%" y1="45%" x2="55%" y2="28%" stroke="var(--viz-secondary)" stroke-width="2" stroke-dasharray="5,5" id="line2"/>
            </svg>
        </div>
    `;

    const statusText = document.getElementById('status-text');

    scheduleAnimation(() => {
        statusText.textContent = 'Pertukaran ICE candidates...';
    }, 500);

    scheduleAnimation(() => {
        statusText.textContent = 'Membuat koneksi langsung...';
        document.getElementById('p2p-tunnel').style.opacity = '1';
    }, 1500);

    scheduleAnimation(() => {
        document.getElementById('server-fade').style.opacity = '0.3';
        document.getElementById('line1').style.opacity = '0.3';
        document.getElementById('line2').style.opacity = '0.3';
        statusText.innerHTML = '<span style="color: var(--viz-primary);">✓ Koneksi P2P aktif!</span>';
    }, 2500);
}

function renderFileTransferAnimation(canvas) {
    canvas.innerHTML = `
        <div style="width: 100%; height: 100%; position: relative;">
            <!-- Device A with file -->
            <div style="position: absolute; left: 15%; top: 50%; transform: translate(-50%, -50%); text-align: center;">
                <div class="device active">
                    <div class="device-screen">📱</div>
                    <div class="device-label">Pengirim</div>
                </div>
                <div id="file-source" style="margin-top: 1rem;">
                    <div class="file-icon">📄</div>
                    <div style="font-size: 0.8rem; color: var(--viz-muted); margin-top: 0.25rem;">foto.jpg</div>
                    <div style="font-size: 0.7rem; color: var(--viz-accent);">256 KB</div>
                </div>
            </div>
            
            <!-- Device B -->
            <div style="position: absolute; right: 15%; top: 50%; transform: translate(50%, -50%); text-align: center;">
                <div class="device">
                    <div class="device-screen">💻</div>
                    <div class="device-label">Penerima</div>
                </div>
                <div id="file-target" style="margin-top: 1rem; opacity: 0.3;">
                    <div class="file-icon" style="opacity: 0.5;">📄</div>
                    <div style="font-size: 0.8rem; color: var(--viz-muted); margin-top: 0.25rem;">foto.jpg</div>
                    <div id="recv-progress" style="font-size: 0.7rem; color: var(--viz-muted);">0%</div>
                </div>
            </div>
            
            <!-- Chunks display -->
            <div id="chunks-container" style="position: absolute; left: 50%; top: 35%; transform: translate(-50%, -50%); text-align: center;">
                <div style="font-size: 0.8rem; color: var(--viz-muted); margin-bottom: 0.5rem;">Chunks (64KB each)</div>
                <div id="chunks" style="display: flex; gap: 4px; justify-content: center;"></div>
            </div>
            
            <!-- Flying packets -->
            <div id="packets-container" style="position: absolute; width: 100%; height: 20px; top: 55%;"></div>
            
            <!-- P2P line -->
            <div style="position: absolute; left: 25%; right: 25%; top: 55%; height: 4px; background: linear-gradient(90deg, var(--viz-primary), var(--viz-accent)); border-radius: 2px; opacity: 0.5;"></div>
        </div>
    `;

    // Animate chunks
    const chunksEl = document.getElementById('chunks');
    const packetsContainer = document.getElementById('packets-container');
    const recvProgress = document.getElementById('recv-progress');
    const fileTarget = document.getElementById('file-target');
    let chunkCount = 4; // 256KB / 64KB = 4 chunks

    for (let i = 0; i < chunkCount; i++) {
        scheduleAnimation(() => {
            // Add chunk
            const chunk = document.createElement('div');
            chunk.className = 'chunk';
            chunk.textContent = i + 1;
            chunk.style.animationDelay = '0s';
            chunksEl.appendChild(chunk);

            // Fly packet
            scheduleAnimation(() => {
                flyPacket(packetsContainer, i + 1);

                // Update progress
                const progress = Math.round(((i + 1) / chunkCount) * 100);
                recvProgress.textContent = progress + '%';
                recvProgress.style.color = 'var(--viz-accent)';

                if (progress === 100) {
                    scheduleAnimation(() => {
                        fileTarget.style.opacity = '1';
                        recvProgress.textContent = '✓ Selesai!';
                        recvProgress.style.color = 'var(--viz-primary)';
                    }, 500);
                }
            }, 300);
        }, i * 800);
    }
}

function flyPacket(container, num) {
    const packet = document.createElement('div');
    packet.className = 'data-packet';
    packet.textContent = num;
    packet.style.cssText = `
        position: absolute;
        left: 20%;
        animation: flyRight 0.8s ease-out forwards;
    `;
    container.appendChild(packet);

    scheduleAnimation(() => {
        packet.remove();
    }, 800);
}

// ========================================
// INTERACTIVE ELEMENTS
// ========================================

function showTooltip(element, text) {
    // Remove existing tooltips
    document.querySelectorAll('.tooltip').forEach(t => t.remove());

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip visible';
    tooltip.textContent = text;

    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 10) + 'px';

    document.body.appendChild(tooltip);


    setTimeout(() => tooltip.remove(), 3000);
}

function renderVideoCallAnimation(canvas) {
    canvas.innerHTML = `
        <div style="width: 100%; height: 100%; position: relative;">
            <!-- Device A -->
            <div style="position: absolute; left: 15%; top: 50%; transform: translate(-50%, -50%); text-align: center;">
                <div class="device active">
                    <div class="device-screen">🎥</div>
                    <div class="device-label">Caller</div>
                </div>
            </div>
            
            <!-- Device B -->
            <div style="position: absolute; right: 15%; top: 50%; transform: translate(50%, -50%); text-align: center;">
                <div class="device active">
                    <div class="device-screen">📱</div>
                    <div class="device-label">Answerer</div>
                </div>
            </div>

            <!-- Existing Data Pipe (Background) -->
            <div style="position: absolute; left: 25%; right: 25%; top: 60%; height: 2px; background: var(--viz-muted); opacity: 0.3;">
                <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-size: 0.7rem; color: var(--viz-muted);">Data Channel</div>
            </div>

            <!-- Video Pipe (Foreground) -->
            <div id="video-pipe" style="position: absolute; left: 25%; right: 25%; top: 40%; height: 6px; background: #ef4444; transform: scaleX(0); transform-origin: left; opacity: 0; border-radius: 3px; box-shadow: 0 0 10px #ef4444;">
                <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.8rem; color: #ef4444; font-weight: bold;">Media Stream</div>
            </div>

            <!-- Camera Icons Flowing -->
            <div id="stream-flow" style="position: absolute; width: 100%; height: 100%; pointer-events: none;"></div>
        </div>
    `;

    // 1. Establish Media Pipe
    scheduleAnimation(() => {
        const pipe = document.getElementById('video-pipe');
        pipe.style.transition = 'transform 1s ease-out, opacity 0.5s';
        pipe.style.opacity = '1';
        pipe.style.transform = 'scaleX(1)';
    }, 500);

    // 2. Stream Flow
    for (let i = 0; i < 5; i++) {
        scheduleAnimation(() => {
            const flow = document.createElement('div');
            flow.textContent = '📷';
            flow.style.cssText = `
                position: absolute;
                left: 20%;
                top: 38%;
                font-size: 1.2rem;
                animation: flyRight 1.5s linear forwards;
            `;
            document.getElementById('stream-flow').appendChild(flow);

            setTimeout(() => flow.remove(), 1500);
        }, 1500 + (i * 600));
    }
}
