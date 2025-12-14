/* ========================================
   Kirim Data - Video Call Module
   Handles WebRTC Media Calls via PeerJS
   ======================================== */

const VideoCall = {
    localStream: null,
    currentCall: null,
    peerInstance: null,
    isMuted: false,
    isCameraOff: false,

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
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
    }
};
