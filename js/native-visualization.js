/* ========================================
   Kirim Data - Native Visualization
   Controls and animations for offline mode explanation
   ======================================== */

// ========================================
// STATE
// ========================================

const vizState = {
    currentStep: 0,
    totalSteps: 7, // Added Video Call step
    animationTimers: []
};

// Step data - tailored for Offline/Native flow
const steps = [
    {
        id: 'intro',
        title: 'WebRTC Murni (Tanpa Server)',
        subtitle: 'Komunikasi Peer-to-Peer (P2P) langsung tanpa perantara server signaling eksternal.',
        details: {
            title: '🎯 Konsep Teknis',
            items: [
                'Menggunakan protokol <b>RTCPeerConnection</b> browser native.',
                'Menghilangkan kebutuhan <i>Signaling Server</i> (WebSocket) yang biasanya menjembatani koneksi.',
                'Proses <i>Handshake</i> (SDP Exchange) dilakukan secara manual ("Sneaker-net").',
                'Ideal untuk jaringan terisolasi (Air-gapped) atau Local Area Network (LAN).'
            ]
        }
    },
    {
        id: 'host-ticket',
        title: '1. Inisialisasi & SDP Offer',
        subtitle: 'Host membuat deskripsi sesi jaringan lokalnya (SDP Offer) untuk memulai handshake.',
        details: {
            title: '🔧 Session Description Protocol (SDP)',
            items: [
                '<b>SDP</b> adalah format standar untuk mendeskripsikan parameter inisialisasi media streaming.',
                'Berisi informasi: Codec yang didukung, Alamat IP & Port (ICE Candidates), dan protokol enkripsi (DTLS).',
                'Browser mengumpulkan kandidat jaringan lokal (Host Candidates) secara asinkron.',
                'Hasil akhirnya adalah blok teks JSON yang merepresentasikan "identitas koneksi" Host.'
            ]
        },
        code: `// native-app.js (WebRTC API)
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
// Menunggu ICE Candidates selesai dikumpulkan...
localTicket = pc.localDescription; // Berisi tipe 'offer' & SDP`
    },
    {
        id: 'exchange-offer',
        title: '2. Transportasi Data Signaling',
        subtitle: 'Memindahkan paket signaling (SDP Offer) dari Host ke Client melalui media eksternal.',
        details: {
            title: '🚚 Out-of-Band Signaling',
            items: [
                'WebRTC membutuhkan saluran signaling, namun tidak mendefinisikan cara pengirimannya.',
                'Di mode ini, kita menggunakan "Out-of-Band Signaling" manual.',
                'Data SDP (JSON string) disalin via Clipboard atau File.',
                'Ini menggantikan peran server WebSocket/Socket.io pada aplikasi online.'
            ]
        }
    },
    {
        id: 'generate-answer',
        title: '3. Memproses Offer & SDP Answer',
        subtitle: 'Client menerima tawaran koneksi dan menghasilkan jawaban (SDP Answer) yang kompatibel.',
        details: {
            title: '🔧 Remote & Local Description',
            items: [
                'Client menyimpan SDP Host sebagai <b>RemoteDescription</b> (Pihak Luar).',
                'Client menghasilkan <b>SDP Answer</b> yang menyetujui parameter koneksi (misal: setuju pakai codec VP8).',
                'Proses ini melengkapi setengah dari prosedur handshake (Half-RTCP Loop).',
                'Answer ini juga berisi IP & Port lokal milik Client.'
            ]
        },
        code: `// native-app.js
await pc.setRemoteDescription(offerTicket);
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer); 
// Answer siap dikirim balik`
    },
    {
        id: 'exchange-answer',
        title: '4. Penyelesaian Handshake',
        subtitle: 'Mengembalikan SDP Answer ke Host untuk memverifikasi dan menyepakati koneksi.',
        details: {
            title: '🔄 Menutup Loop Signaling',
            items: [
                'SDP Answer harus dikembalikan ke Host agar Host tahu siapa yang merespons.',
                'Host akan menyimpan SDP Answer ini sebagai <b>RemoteDescription</b>.',
                'Pada titik ini, kedua pihak saling mengetahui IP, Port, dan parameter keamanan satu sama lain.',
                'Jalur koneksi langsung (P2P Mesh) mulai dibentuk.'
            ]
        }
    },
    {
        id: 'connection',
        title: '5. Data Channel Established',
        subtitle: 'Koneksi P2P SCTP (Stream Control Transmission Protocol) berhasil dibuat.',
        details: {
            title: '✨ RTCDataChannel',
            items: [
                'Koneksi menggunakan protokol <b>SCTP</b> di atas UDP untuk performa & reliabilitas.',
                'Data ditransfer langsung antar browser tanpa server (Hop-by-Hop).',
                'Dienkripsi End-to-End menggunakan DTLS (Datagram Transport Layer Security).',
                'Latency minimal karena tidak ada rute memutar ke server cloud.'
            ]
        }
    },
    {
        id: 'video-renegotiation',
        title: '6. Video Call (In-Band)',
        subtitle: 'Menambahkan Video ke koneksi yang sudah ada (Renegotiation) lewat Data Channel.',
        details: {
            title: '✨ WebRTC Renegotiation',
            items: [
                'Untuk Video Call, kita tidak membuat koneksi baru.',
                'Kita "menambahkan track" (pc.addTrack) ke koneksi yang sudah jalan.',
                'Signaling Offer/Answer baru dikirim LEWAT Data Channel yang sudah aktif (In-Band).',
                'Jauh lebih cepat karena tidak perlu copy-paste manual lagi!'
            ]
        },
        code: `// native-video.js
// 1. Kirim sinyal video via Data Channel
dc.send(JSON.stringify({ 
  type: 'video-offer', 
  sdp: offer 
}));

// 2. Penerima otomatis setuju
await pc.setRemoteDescription(offer);`
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
// THEME & NAV (Reused Utils)
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('viz-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        document.documentElement.classList.add('light-mode');
    }
}

function goToStep(index) {
    if (index < 0 || index >= vizState.totalSteps) return;
    clearAnimations();
    vizState.currentStep = index;
    renderStep(index);
    updateProgressDots();
    updateNavButtons();
}

function nextStep() {
    if (vizState.currentStep < vizState.totalSteps - 1) goToStep(vizState.currentStep + 1);
}

function prevStep() {
    if (vizState.currentStep > 0) goToStep(vizState.currentStep - 1);
}

function updateProgressDots() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i === vizState.currentStep) dot.classList.add('active');
        else if (i < vizState.currentStep) dot.classList.add('completed');
    });
}

function updateNavButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.disabled = vizState.currentStep === 0;
    if (nextBtn) nextBtn.disabled = vizState.currentStep === vizState.totalSteps - 1;
}

function reloadAnimation() {
    clearAnimations();
    renderAnimation(steps[vizState.currentStep].id);
}

function renderStep(index) {
    const step = steps[index];
    document.getElementById('step-title').textContent = step.title;
    document.getElementById('step-subtitle').textContent = step.subtitle;

    const detailsContainer = document.getElementById('step-details');
    if (step.details) {
        detailsContainer.innerHTML = `
            <h3>${step.details.title}</h3>
            <ul>${step.details.items.map(item => `<li>${item}</li>`).join('')}</ul>
            ${step.code ? `<div class="viz-code"><pre>${escapeHtml(step.code)}</pre></div>` : ''}
        `;
    }
    renderAnimation(step.id);
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

function renderAnimation(stepId) {
    const canvas = document.getElementById('anim-content');
    if (!canvas) return;

    switch (stepId) {
        case 'intro': renderIntro(canvas); break;
        case 'host-ticket': renderHostTicket(canvas); break;
        case 'exchange-offer': renderExchange(canvas, 'offer'); break;
        case 'generate-answer': renderGenerateAnswer(canvas); break;
        case 'exchange-answer': renderExchange(canvas, 'answer'); break;
        case 'exchange-answer': renderExchange(canvas, 'answer'); break;
        case 'connection': renderConnection(canvas); break;
        case 'video-renegotiation': renderVideoRenegotiation(canvas); break;
    }
}

// --- Specific Animators ---

// 1. INTRO
function renderIntro(canvas) {
    canvas.innerHTML = `
        <div style="text-align: center;">
            <div class="intro-logo" style="font-size: 5rem; animation: floatUp 3s infinite;">📡</div>
            <div class="intro-title" style="font-size: 2rem; font-weight:bold; margin-top:1rem; color:var(--viz-primary);">WebRTC Murni</div>
            <div style="margin-top: 1rem; color: var(--viz-muted);">Tanpa Server, Tanpa Internet</div>
        </div>
    `;
}

// 2. HOST MAKES TICKET
function renderHostTicket(canvas) {
    canvas.innerHTML = `
        <div style="width:100%; height:100%; position:relative;">
            <div class="device active" style="left:50%; top:50%; transform:translate(-50%, -50%);">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>
            <div id="ticket" style="position:absolute; left:50%; top:50%; transform:translate(-50%, -50%) scale(0); opacity:0;">
                <div style="font-size:2rem;">🎫</div>
            </div>
        </div>
    `;

    // Pop out ticket
    scheduleAnimation(() => {
        const t = document.getElementById('ticket');
        t.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        t.style.transform = 'translate(-50%, -150%) scale(1.5)';
        t.style.opacity = '1';
    }, 500);
}

// 3. EXCHANGE (OFFER OR ANSWER)
// 3. EXCHANGE (OFFER OR ANSWER)
function renderExchange(canvas, type) {
    const isOffer = type === 'offer';
    const icon = isOffer ? '🎫' : '✅';

    // Fixed Positions: Host Left (20%), Guest Right (80%)
    const hostOpacity = isOffer ? '1' : '0.5'; // Host active when sending offer
    const guestOpacity = isOffer ? '0.5' : '1'; // Guest active when sending answer

    canvas.innerHTML = `
        <div style="width:100%; height:100%; position:relative;">
            <!-- Host Device (Left) -->
            <div class="device ${isOffer ? 'active' : ''}" style="left:20%; top:50%; transform:translate(-50%, -50%); opacity: ${hostOpacity};">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>

            <!-- Guest Device (Right) -->
            <div class="device ${!isOffer ? 'active' : ''}" style="right:20%; top:50%; transform:translate(50%, -50%); opacity: ${guestOpacity};">
                <div class="device-screen">💻</div>
                <div class="device-label">Guest</div>
            </div>

            <!-- Moving Ticket -->
            <div id="moving-ticket" style="position:absolute; top:30%; transform:translate(-50%, -50%); opacity:0;">
                <div style="font-size:2rem;">${icon}</div>
                <div style="font-size:0.6rem; color:var(--viz-muted); text-align:center; background:var(--viz-bg); padding:2px; border-radius:4px; margin-top:5px;">Manual</div>
            </div>
        </div>
    `;

    // Animation Config
    const startPos = isOffer ? '20%' : '80%';
    const endPos = isOffer ? '80%' : '20%';
    const ticket = () => document.getElementById('moving-ticket');

    // 1. Init Position
    scheduleAnimation(() => {
        const t = ticket();
        t.style.left = startPos;
    }, 10);

    // 2. Appear at source
    scheduleAnimation(() => {
        const t = ticket();
        t.style.opacity = '1';
    }, 300);

    // 3. Move across
    scheduleAnimation(() => {
        const t = ticket();
        t.style.transition = 'left 1.5s ease-in-out';
        t.style.left = endPos;
    }, 800);

    // 4. Disappear at target
    scheduleAnimation(() => {
        const t = ticket();
        t.style.transition = 'opacity 0.3s, transform 0.3s';
        t.style.opacity = '0';
        t.style.transform = 'translate(-50%, 0) scale(0.5)';
    }, 2300);
}

// 4. GENERATE ANSWER (GUEST)
function renderGenerateAnswer(canvas) {
    canvas.innerHTML = `
        <div style="width:100%; height:100%; position:relative;">
            <div class="device" style="left:20%; top:50%; transform:translate(-50%, -50%); opacity:0.5;">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>
            <div class="device active" style="right:20%; top:50%; transform:translate(50%, -50%);">
                <div class="device-screen">💻</div>
                <div class="device-label">Guest</div>
            </div>

            <div id="host-info" style="position:absolute; right:20%; top:30%; transform:translate(50%, -50%); opacity:0;">
                <div style="font-size:1.5rem;">🎫</div>
            </div>
            
            <div id="new-answer" style="position:absolute; right:20%; top:50%; transform:translate(50%, -50%) scale(0);">
                <div style="font-size:2.5rem;">✅</div>
            </div>
        </div>
    `;

    // Show ingested offer
    scheduleAnimation(() => {
        document.getElementById('host-info').style.opacity = '1';
        document.getElementById('host-info').style.transition = 'top 0.5s, opacity 0.5s';
        document.getElementById('host-info').style.top = '50%';
        document.getElementById('host-info').style.opacity = '0';
    }, 200);

    // Pop out answer
    scheduleAnimation(() => {
        const a = document.getElementById('new-answer');
        a.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        a.style.transform = 'translate(50%, -150%) scale(1)';
    }, 800);
}

// 5. CONNECTION
function renderConnection(canvas) {
    canvas.innerHTML = `
        <div style="width:100%; height:100%; position:relative;">
            <div class="device active" style="left:20%; top:50%; transform:translate(-50%, -50%);">
                <div class="device-screen">📱</div>
                <div class="device-label">Host</div>
            </div>
            <div class="device active" style="right:20%; top:50%; transform:translate(50%, -50%);">
                <div class="device-screen">💻</div>
                <div class="device-label">Guest</div>
            </div>

            <!-- Beam -->
            <div id="beam" style="position:absolute; left:20%; right:20%; top:50%; height:6px; background:linear-gradient(90deg, var(--viz-primary), var(--viz-secondary)); transform:translateY(-50%) scaleX(0); transform-origin:left; opacity:0; box-shadow:0 0 15px var(--viz-primary);"></div>
            
            <div id="success-icon" style="position:absolute; left:50%; top:50%; transform:translate(-50%, -50%) scale(0); font-size:3rem;">🤝</div>
        </div>
    `;

    scheduleAnimation(() => {
        const b = document.getElementById('beam');
        b.style.transition = 'transform 0.8s ease-out, opacity 0.3s';
        b.style.opacity = '1';
        b.style.transform = 'translateY(-50%) scaleX(1)';
    }, 500);

    scheduleAnimation(() => {
        const s = document.getElementById('success-icon');
        s.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        s.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 1400);
}
