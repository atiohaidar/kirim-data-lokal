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
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
