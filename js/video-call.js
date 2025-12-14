/* ========================================
   Kirim Data - Video Call Module
   Handles WebRTC Media Calls via PeerJS
   ======================================== */

const VideoCall = {
    localStream: null,
    currentCall: null,
    peerInstance: null,
    isMuted: false,
    isMuted: false,
    isCameraOff: false,
    isEcoMode: true, // Default to Eco (VGA)
    currentFacingMode: 'user', // 'user' or 'environment'

    /**
     * Initialize video call module
     * @param {Object} peer - The PeerJS instance
     */
    init(peer) {
        this.peerInstance = peer;

        // Listen for incoming calls
        peer.on('call', (call) => {
            // Check if already in a call
            if (this.currentCall) {
                call.close(); // Busy
                return;
            }

            // Show incoming call UI (simple confirm for now, better UI later)
            // In a real app we'd show a custom modal. For now, let's use a browser confirm or custom UI event
            // triggerIncomingCallUI(call); -> We will implement this in app.js or here

            // For now, let's auto-notify app.js to show UI
            if (typeof showIncomingCallModal === 'function') {
                showIncomingCallModal(call);
            } else {
                // Fallback auto-answer if no UI handler (for testing)
                // this.answerCall(call);
            }
        });
    },

    /**
     * Start a call to a peer
     * @param {string} remotePeerId 
     */
    async startCall(remotePeerId) {
        try {
            // 1. Get Local Stream
            const constraints = this.getConstraints();
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localStream = stream;

            // 2. Show Video UI
            this.showVideoUI();
            this.displayLocalVideo(stream);

            // 3. Make the call
            const call = this.peerInstance.call(remotePeerId, stream);
            this.handleCallEvents(call);

        } catch (err) {
            console.error('Failed to get local stream', err);
            alert('Gagal mengakses kamera/mic: ' + err.message);
        }
    },

    /**
     * Answer an incoming call
     * @param {Object} call - The PeerJS call object
     */
    async answerCall(call) {
        try {
            // 1. Get Local Stream
            const constraints = this.getConstraints();
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localStream = stream;

            // 2. Answer the call with our stream
            call.answer(stream);

            // 3. Show Video UI
            this.showVideoUI();
            this.displayLocalVideo(stream);

            // 4. Handle stream events
            this.handleCallEvents(call);

        } catch (err) {
            console.error('Failed to get local stream', err);
            alert('Gagal mengakses kamera/mic: ' + err.message);
            call.close();
        }
    },

    /**
     * Handle common call events
     */
    handleCallEvents(call) {
        this.currentCall = call;

        // When we receive their stream
        call.on('stream', (remoteStream) => {
            this.displayRemoteVideo(remoteStream);
        });

        // When call ends
        call.on('close', () => {
            this.endCallInternal();
        });

        call.on('error', (err) => {
            console.error('Call error:', err);
            this.endCallInternal();
        });
    },

    /**
     * End the current call
     */
    endCall() {
        if (this.currentCall) {
            this.currentCall.close();
        }
        this.endCallInternal();
    },

    /**
     * Internal cleanup
     */
    endCallInternal() {
        // Stop local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.currentCall = null;
        this.hideVideoUI();

        // Notify user
        if (typeof addActivityLog === 'function') {
            addActivityLog('info', '📴 Panggilan berakhir');
        }
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
        document.getElementById('remote-video').srcObject = null;
        document.getElementById('local-video').srcObject = null;
    },

    displayLocalVideo(stream) {
        const video = document.getElementById('local-video');
        video.srcObject = stream;
        video.muted = true; // Always mute local video
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
        if (typeof addActivityLog === 'function') {
            addActivityLog('info', `📷 Kamera: ${this.currentFacingMode === 'user' ? 'Depan' : 'Belakang'}`);
        }
    },

    async toggleQuality() {
        if (!this.localStream) return;
        this.isEcoMode = !this.isEcoMode;
        await this.restartStream();

        const mode = this.isEcoMode ? 'Eco (Hemat)' : 'HD (Jernih)';
        if (typeof addActivityLog === 'function') {
            addActivityLog('info', `⚡ Mode Video: ${mode}`);
        }

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

            // 3. Replace track in PeerJS Call (Seamless Switch)
            // PeerJS wraps RTCPeerConnection in call.peerConnection
            if (this.currentCall && this.currentCall.peerConnection) {
                const pc = this.currentCall.peerConnection;
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
