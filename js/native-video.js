/* ========================================
   Kirim Data - Native Video Call Module
   Handles In-Band Renegotiation for Video
   ======================================== */

const NativeVideo = {
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    isVideoActive: false,
    isEcoMode: true, // Default to Eco (VGA)
    currentFacingMode: 'user', // 'user' or 'environment'
    statsInterval: null,
    isStatsVisible: false,

    /**
     * Start a video call (Caller)
     */
    async startCall() {
        if (!pc || pc.connectionState !== 'connected') {
            alert('Tunggu sampai terhubung dengan teman!');
            return;
        }

        try {
            // 1. Get Local Stream
            const constraints = this.getConstraints();
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localStream = stream;

            // 2. Show Video UI
            this.showVideoUI();
            this.displayLocalVideo(stream);

            // 3. Add tracks to existing PC
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // 4. Create Offer for Renegotiation
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 5. Send Offer via Data Channel (In-Band)
            const signal = {
                type: 'video-offer',
                sdp: offer
            };
            dc.send(JSON.stringify(signal));

            this.isVideoActive = true;
            addActivityLog('info', '📞 Memanggil video...');
            this.startStatsPolling();

        } catch (err) {
            console.error('Failed to start video:', err);
            alert('Gagal akses kamera: ' + err.message);
            this.endCallInternal();
        }
    },

    /**
     * Handle incoming video signal (Called from native-app.js)
     */
    async handleSignal(msg) {
        if (msg.type === 'video-offer') {
            // Incoming Call
            this.pendingOffer = msg.sdp;
            showIncomingCallModal('Teman'); // Re-use global modal logic

        } else if (msg.type === 'video-answer') {
            // Remote accepted our call
            await pc.setRemoteDescription(msg.sdp);

        } else if (msg.type === 'video-end') {
            // Remote ended call
            this.endCallInternal();
            alert('Panggilan diakhiri oleh teman.');
        } else if (msg.type === 'video-candidate') {
            // Handle ICE candidate for video (if any new ones generated)
            // For simplicity in LAN, we might rely on existing connection, 
            // but correct WebRTC needs this.
            if (msg.candidate) {
                pc.addIceCandidate(msg.candidate).catch(e => console.log(e));
            }
        }
    },

    /**
     * Accept the incoming video call
     */
    async acceptCall() {
        try {
            // 1. Get Local Stream
            const constraints = this.getConstraints();
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localStream = stream;

            // 2. Show UI
            this.showVideoUI();
            this.displayLocalVideo(stream);

            // 3. Set Remote Description (Offer)
            await pc.setRemoteDescription(this.pendingOffer);

            // 4. Add our tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // 5. Create Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // 6. Send Answer via Data Channel
            const signal = {
                type: 'video-answer',
                sdp: answer
            };
            dc.send(JSON.stringify(signal));

            this.isVideoActive = true;
            this.pendingOffer = null;
            this.startStatsPolling();

        } catch (err) {
            console.error('Failed to answer:', err);
            alert('Gagal menjawab: ' + err.message);
            this.endCallInternal();
        }
    },

    /**
     * End the current call
     */
    endCall() {
        if (dc && dc.readyState === 'open') {
            dc.send(JSON.stringify({ type: 'video-end' }));
        }
        this.endCallInternal();
    },

    // --- Stats & Monitoring ---

    toggleStats() {
        this.isStatsVisible = !this.isStatsVisible;
        const statsDiv = document.getElementById('video-stats');
        if (statsDiv) {
            statsDiv.classList.toggle('visible', this.isStatsVisible);
        }
    },

    startStatsPolling() {
        if (this.statsInterval) clearInterval(this.statsInterval);

        let lastBytesReceived = 0;
        let lastTimestamp = Date.now();

        this.statsInterval = setInterval(async () => {
            if (!this.isStatsVisible || !pc) return;

            try {
                const stats = await pc.getStats();
                let fps = 0, width = 0, height = 0, bitrate = 0, rtt = 0, loss = 0;

                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        // FPS & Resolution
                        fps = report.framesPerSecond || 0;
                        width = report.frameWidth || 0;
                        height = report.frameHeight || 0;
                        loss = report.packetsLost || 0;

                        // Bitrate Calculation
                        const now = Date.now();
                        const bytes = report.bytesReceived;
                        if (lastBytesReceived > 0) {
                            const deltaBytes = bytes - lastBytesReceived;
                            const deltaTime = (now - lastTimestamp) / 1000; // seconds
                            bitrate = Math.round((deltaBytes * 8) / deltaTime / 1000); // kbps
                        }
                        lastBytesReceived = bytes;
                        lastTimestamp = now;
                    }
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        rtt = Math.round(report.currentRoundTripTime * 1000);
                    }
                });

                document.getElementById('stat-rtt').textContent = `RTT: ${rtt}ms`;
                document.getElementById('stat-fps').textContent = `FPS: ${Math.round(fps)}`;
                document.getElementById('stat-bitrate').textContent = `Bitrate: ${bitrate} kbps`;
                document.getElementById('stat-res').textContent = `Res: ${width}x${height}`;
                document.getElementById('stat-loss').textContent = `Loss: ${loss}`;

            } catch (e) {
                console.log("Stats error", e);
            }
        }, 1000);
    },
    this.endCallInternal();
},

    /**
     * Internal cleanup
     */
    endCallInternal() {
        this.isVideoActive = false;

        // Stop local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                // Also remove from PC to clean up renegotiation state? 
                // PeerConnection.removeTrack() needs the sender.
                // For simplicity, we just stop tracks. 
                // Proper cleanup might require renegotiation to remove tracks from SDP, 
                // but for a simple session end, stopping is visual enough.
            });
            this.localStream = null;
        }

        // Remove remote video
        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo) remoteVideo.srcObject = null;

        this.hideVideoUI();

        // Clean up PC tracks (optional, but good for restart)
        pc.getSenders().forEach(sender => pc.removeTrack(sender));
    },

        // --- Media Controls ---

        toggleAudio() {
    if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            this.isMuted = !this.isMuted;
            audioTrack.enabled = !this.isMuted;
            this.updateControlUI('btn-toggle-mic', this.isMuted, '🎤', '🔇');
        }
    }
},

toggleVideo() {
    if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            this.isCameraOff = !this.isCameraOff;
            videoTrack.enabled = !this.isCameraOff;
            this.updateControlUI('btn-toggle-cam', this.isCameraOff, '📹', '🚫');
        }
    }
},

updateControlUI(btnId, isOff, onIcon, offIcon) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.innerHTML = isOff ? offIcon : onIcon;
        btn.classList.toggle('off', isOff);
    }
},

// --- UI Helpers ---

showVideoUI() {
    document.getElementById('video-overlay').classList.add('visible');
},

hideVideoUI() {
    document.getElementById('video-overlay').classList.remove('visible');
},

displayLocalVideo(stream) {
    const video = document.getElementById('local-video');
    video.srcObject = stream;
    video.muted = true;
},

displayRemoteVideo(stream) {
    const video = document.getElementById('remote-video');
    video.srcObject = stream;
},

// --- Advanced Camera Controls ---

getConstraints() {
    // Eco Mode: VGA (640x480) @ 15fps - Hemat Baterai & Data
    // HD Mode: HD (1280x720) @ 30fps
    const videoConstraints = this.isEcoMode
        ? { width: 640, height: 480, frameRate: 15, facingMode: this.currentFacingMode }
        : { width: 1280, height: 720, frameRate: 30, facingMode: this.currentFacingMode };

    return {
        video: videoConstraints,
        audio: { echoCancellation: true, noiseSuppression: true }
    };
},

    async switchCamera() {
    if (!this.localStream) return;
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    await this.restartStream();
    addActivityLog('info', `📷 Kamera: ${this.currentFacingMode === 'user' ? 'Depan' : 'Belakang'}`);
},

    async toggleQuality() {
    if (!this.localStream) return;
    this.isEcoMode = !this.isEcoMode;
    await this.restartStream();

    const mode = this.isEcoMode ? 'Eco (Hemat)' : 'HD (Jernih)';
    addActivityLog('info', `⚡ Mode Video: ${mode}`);

    // Update UI button text if needed, or toast
    const btn = document.getElementById('btn-quality');
    if (btn) btn.innerHTML = this.isEcoMode ? '⚡' : 'ᴴᴰ';
},

    async restartStream() {
    // 1. Stop current tracks
    if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
    }

    try {
        // 2. Get new stream
        const newStream = await navigator.mediaDevices.getUserMedia(this.getConstraints());
        this.localStream = newStream;
        this.displayLocalVideo(newStream);

        // 3. Replace track in Sender (Seamless Switch)
        if (pc) {
            const videoTrack = newStream.getVideoTracks()[0];
            const audioTrack = newStream.getAudioTracks()[0];

            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');

            if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack);
            if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack);
        }

        // Restore Mute/Video Off state
        if (this.isMuted && newStream.getAudioTracks()[0]) newStream.getAudioTracks()[0].enabled = false;
        if (this.isCameraOff && newStream.getVideoTracks()[0]) newStream.getVideoTracks()[0].enabled = false;

    } catch (err) {
        console.error("Camera switch failed", err);
        alert("Gagal ganti kamera: " + err.message);
    }
}
};

// Hook up listener for tracks
// This must be called from native-app.js when PC is created or tracks arrive
function setupTrackListener() {
    if (!pc) return;
    pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            NativeVideo.displayRemoteVideo(event.streams[0]);
        }
    };
}
