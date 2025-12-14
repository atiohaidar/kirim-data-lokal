/* ========================================
   Kirim Data - Drag & Drop / Paste Module
   Reusable input handlers
   ======================================== */

/**
 * Setup drag and drop for a container
 * @param {string} dropZoneId - ID of the drop zone element
 * @param {string} overlayId - ID of the overlay element (optional)
 * @param {Function} onFilesDropped - Callback when files are dropped
 */
function setupDragAndDrop(dropZoneId, overlayId, onFilesDropped) {
    const dropZone = document.getElementById(dropZoneId);
    const overlay = overlayId ? document.getElementById(overlayId) : null;

    if (!dropZone) return;

    // OPTIMIZATION: Prevent duplicate listeners
    if (dropZone.dataset.listenersAttached === 'true') return;
    dropZone.dataset.listenersAttached = 'true';

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', () => {
        if (overlay) {
            overlay.style.display = 'flex';
        } else {
            dropZone.classList.add('drag-active');
        }
    });

    if (overlay) {
        overlay.addEventListener('dragleave', () => {
            overlay.style.display = 'none';
        });
    } else {
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-active');
        });
    }

    dropZone.addEventListener('drop', (e) => {
        if (overlay) {
            overlay.style.display = 'none';
        } else {
            dropZone.classList.remove('drag-active');
        }

        const files = e.dataTransfer.files;
        if (files.length > 0 && onFilesDropped) {
            onFilesDropped(files);
        }
    });
}

/**
 * Setup paste handler for files/images
 * @param {string} activeStepId - ID of the step that must be active for paste to work (optional)
 * @param {Function} onFilesPasted - Callback when files are pasted
 */
function setupPaste(activeStepId, onFilesPasted) {
    window.addEventListener('paste', (e) => {
        // Check if we should process paste
        if (activeStepId) {
            const activeStep = document.getElementById(activeStepId);
            if (!activeStep || !activeStep.classList.contains('active')) return;
        }

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        const files = [];

        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file') {
                let file = item.getAsFile();

                // Fix for pasted images often having generic names
                if (file.name === 'image.png' || !file.name.includes('.')) {
                    const ext = file.type.split('/')[1] || 'png';
                    const newName = `pasted_image_${Date.now()}.${ext}`;
                    file = new File([file], newName, { type: file.type });
                }

                files.push(file);
            }
        }

        if (files.length > 0) {
            e.preventDefault();
            if (onFilesPasted) {
                onFilesPasted(files);
            }
        }
    });
}

/**
 * Process multiple files
 * @param {FileList|Array} files - Files to process
 * @param {Function} processFile - Function to process each file
 */
function processFiles(files, processFile) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => processFile(file));
}
