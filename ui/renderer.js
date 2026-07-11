const logsContainer = document.getElementById('logs-container');
const qrContainer = document.getElementById('qr-container');
const qrcodeElement = document.getElementById('qrcode');
const statusBadge = document.getElementById('status-badge');

const socket = io();

socket.on('log-entry', (log) => {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${log.level.toLowerCase().replace(/\x1b\[[0-9;]*m/g, '')}`;
    // Strip ANSI codes for frontend display
    const cleanMessage = log.message.replace(/\x1b\[[0-9;]*m/g, '');
    entry.textContent = cleanMessage;
    
    logsContainer.appendChild(entry);
    
    // Auto scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
});

socket.on('qr-code', (qrDataUrl) => {
    // Show QR container
    qrContainer.classList.remove('hidden');
    
    // Set QR code image directly from the server
    qrcodeElement.innerHTML = `<img src="${qrDataUrl}" alt="WhatsApp QR Code" />`;
    
    statusBadge.textContent = 'NEEDS SCAN';
    statusBadge.className = 'badge auth';
});

socket.on('status-update', (status) => {
    if (status === 'authenticated' || status === 'ready') {
        qrContainer.classList.add('hidden');
        statusBadge.textContent = status.toUpperCase();
        statusBadge.className = 'badge ready';
    }
});
