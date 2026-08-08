const logsContainer = document.getElementById('logs-container');
const qrContainer = document.getElementById('qr-container');
const qrcodeElement = document.getElementById('qrcode');
const statusBadge = document.getElementById('status-badge');

const socket = io();

// Simple parser to extract standard info from Winston logs if they are JSON
socket.on('log-entry', (log) => {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${log.level.toLowerCase().replace(/\x1b\[[0-9;]*m/g, '')}`;
    
    // Strip ANSI codes for frontend display
    const cleanMessage = log.message.replace(/\x1b\[[0-9;]*m/g, '');
    entry.textContent = cleanMessage;
    
    logsContainer.appendChild(entry);
    
    // Keep only last 200 logs to prevent memory issues
    if (logsContainer.children.length > 200) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
    
    // Auto scroll to bottom
    requestAnimationFrame(() => {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    });
});

socket.on('qr-code', (qrDataUrl) => {
    qrContainer.classList.remove('hidden');
    qrcodeElement.innerHTML = `<img src="${qrDataUrl}" alt="WhatsApp QR Code" style="display: block; max-width: 100%; border-radius: 8px;" />`;
    
    statusBadge.textContent = 'NEEDS SCAN';
    statusBadge.className = 'badge auth';
});

socket.on('status-update', (status) => {
    if (status === 'authenticated' || status === 'ready') {
        qrContainer.classList.add('hidden');
        statusBadge.textContent = status.toUpperCase();
        statusBadge.className = 'badge ready';
    } else {
        statusBadge.textContent = status.toUpperCase();
        statusBadge.className = 'badge';
    }
});
