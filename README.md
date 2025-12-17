# Kirim Data Lokal

Aplikasi web untuk transfer file dan video call berbasis WebRTC. Mendukung mode Online (Internet) dan Native Offline (Lokal Network).

## Fitur

### Transfer File
*   **Protokol Biner**: Mengirim data menggunakan ArrayBuffer (bukan Base64) untuk efisiensi.
*   **Streaming Read**: Membaca file secara bertahap (chunking) sehingga ramah memori untuk file besar.
*   **Backpressure**: Mengatur pengiriman data sesuai kapasitas buffer jaringan.

### Video Call
*   **Kontrol Kamera**: Fitur ganti kamera (depan/belakang) dan mute audio/video.
*   **Statistik**: Menampilkan data bitrate, FPS, dan packet loss.

### Mode Koneksi
1.  **Online (`index.html`)**: Menggunakan PeerJS untuk signaling via internet.
2.  **Offline (`native.html`)**: Menggunakan pertukaran SDP manual untuk jaringan lokal tanpa internet.

## Teknologi

*   **HTML/CSS/JS**: Vanilla JavaScript tanpa framework.
*   **WebRTC**: RTCPeerConnection & RTCDataChannel.
*   **PeerJS**: Library signaling (hanya untuk mode online).

## Cara Menjalankan

1.  Jalankan server lokal (diperlukan untuk akses Kamera & WebRTC).
    ```bash
    npx serve .
    # atau
    python -m http.server
    ```
2.  Buka di browser:
    *   Online: `http://localhost:3000/index.html`
    *   Offline: `http://localhost:3000/native.html`
