/* ========================================
   Kirim Data - File Transfer Module
   Reusable file transfer with chunking and progress
   ======================================== */

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

// Track incoming file transfers
let incomingFiles = {};

// ========================================
// SENDING FILES
// ========================================

/**
 * Send a file with chunked transfer and progress (Optimized with Backpressure)
 * @param {File} file - The file to send
 * @param {RTCDataChannel} connection - The WebRTC DataChannel
 * @param {Function} sendFn - Function to send data (connection.send or dc.send)
 * @param {string} containerId - Chat container ID for logging
 */
async function sendFileWithProgress(file, connection, sendFn, containerId = 'chat-box') {
    const fileId = generateFileId();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Backpressure threshold (e.g., 64KB - 256KB). 
    // Keep it low enough to ensure responsiveness, high enough for throughput.
    const BUFFER_THRESHOLD = 64 * 1024;

    // Show sender preview
    const url = URL.createObjectURL(file);
    let displayContent = `📤 <b>${file.name}</b> (${formatBytes(file.size)})`;

    if (file.type.startsWith('image/')) {
        displayContent += `<br><img src="${url}" class="img-preview" alt="Dikirim">`;
    } else if (file.type.startsWith('video/')) {
        displayContent += `<br><video src="${url}" controls class="img-preview"></video>`;
    } else {
        displayContent += `<br><a href="${url}" target="_blank" style="font-size:0.9rem; text-decoration:underline;">Lihat File</a>`;
    }

    log(displayContent, 'me', containerId);

    // Create progress element
    const progressId = 'send-progress-' + fileId;
    log(`<span id="${progressId}">⏳ Mengirim: 0%</span>`, 'system', containerId);

    // Send file metadata first
    sendFn({
        type: 'file-meta',
        fileId: fileId,
        name: file.name,
        size: file.size,
        fileType: file.type,
        totalChunks: totalChunks
    });

    // OPTIMIZATION: Streaming Read (Zero RAM Load)
    // Instead of loading the entire file into memory (which crashes on large files),
    // we read small chunks directly from disk/blob storage.

    let offset = 0;
    let chunkIndex = 0;
    const progressEl = document.getElementById(progressId);

    // Optimized Sending Loop with Streaming
    while (offset < file.size) {
        // 1. Backpressure Check
        // Support both raw DataChannel (dc.bufferedAmount) and PeerJS (conn.dataChannel.bufferedAmount)
        const getBufferedAmount = () => connection.bufferedAmount ?? connection.dataChannel?.bufferedAmount ?? 0;

        if (getBufferedAmount() > BUFFER_THRESHOLD) {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (getBufferedAmount() < BUFFER_THRESHOLD) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 10); // Check every 10ms
            });
        }

        // 2. Read ONLY the next chunk from disk
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const chunk = await slice.arrayBuffer();

        // 3. Send
        sendFn({
            type: 'file-chunk',
            fileId: fileId,
            chunkIndex: chunkIndex,
            data: chunk
        });

        offset += CHUNK_SIZE;
        chunkIndex++;

        // 4. Update Progress (Throttled UI update)
        if (chunkIndex % 5 === 0 || offset >= file.size) {
            const percent = Math.min(100, Math.round((offset / file.size) * 100));
            if (progressEl) progressEl.textContent = `⏳ Mengirim: ${percent}%`;
        }
    }

    // Done
    if (progressEl) progressEl.textContent = '✅ Terkirim!';

    if (typeof trackFileSent === 'function') {
        trackFileSent(file.name, file.size);
    }
}

// ========================================
// RECEIVING FILES
// ========================================

/**
 * Handle incoming file metadata
 * @param {Object} meta - File metadata
 * @param {string} containerId - Chat container ID
 */
function handleIncomingFileMeta(meta, containerId = 'chat-box') {
    const progressId = 'recv-progress-' + meta.fileId;
    incomingFiles[meta.fileId] = {
        meta: meta,
        chunks: [],
        receivedBytes: 0,
        progressId: progressId
    };

    log(`📥 Menerima: <b>${meta.name}</b> (${formatBytes(meta.size)})<br><span id="${progressId}">⏳ Menerima: 0%</span>`, 'peer', containerId);
}

/**
 * Handle incoming file chunk
 * @param {Object} data - Chunk data
 * @param {string} containerId - Chat container ID
 */
function handleIncomingFileChunk(data, containerId = 'chat-box') {
    const fileData = incomingFiles[data.fileId];
    if (!fileData) return;

    fileData.chunks[data.chunkIndex] = data.data;
    fileData.receivedBytes += data.data.byteLength;

    // Update progress
    const percent = Math.min(100, Math.round((fileData.receivedBytes / fileData.meta.size) * 100));
    const progressEl = document.getElementById(fileData.progressId);
    if (progressEl) progressEl.textContent = `⏳ Menerima: ${percent}%`;

    // Check if complete
    if (fileData.chunks.filter(c => c).length >= fileData.meta.totalChunks) {
        // Combine chunks
        const combined = new Blob(fileData.chunks, { type: fileData.meta.fileType });
        const url = URL.createObjectURL(combined);

        // Update progress to show completion with download link
        if (progressEl) {
            let content = `✅ Selesai! <a href="${url}" download="${fileData.meta.name}" style="color:var(--primary)">Download</a>`;

            if (fileData.meta.fileType && fileData.meta.fileType.startsWith('image/')) {
                content += `<br><img src="${url}" class="img-preview" alt="Diterima" onclick="window.open('${url}')">`;
            } else if (fileData.meta.fileType && fileData.meta.fileType.startsWith('video/')) {
                content += `<br><video src="${url}" controls class="img-preview"></video>`;
            }

            progressEl.innerHTML = content;
        }

        // Track file received for statistics
        if (typeof trackFileRecv === 'function') {
            trackFileRecv(fileData.meta.name, fileData.meta.size);
        }

        // Cleanup
        delete incomingFiles[data.fileId];
    }
}

/**
 * Legacy handler for single-message file transfer
 * @param {Object} data - File data
 * @param {string} containerId - Chat container ID
 */
function handleIncomingFileLegacy(data, containerId = 'chat-box') {
    let blob = data.content;
    if (!(blob instanceof Blob)) {
        blob = new Blob([data.content], { type: data.fileType });
    }

    const url = URL.createObjectURL(blob);

    let displayContent = `📂 File diterima: <br><a href="${url}" download="${data.name}" style="color:var(--primary)"><b>${data.name}</b></a> (${formatBytes(data.size)})`;

    if (data.fileType && data.fileType.startsWith('image/')) {
        displayContent += `<br><img src="${url}" class="img-preview" alt="Diterima" onclick="window.open('${url}')">`;
    } else if (data.fileType && data.fileType.startsWith('video/')) {
        displayContent += `<br><video src="${url}" controls class="img-preview"></video>`;
    }

    log(displayContent, 'peer', containerId);
}
