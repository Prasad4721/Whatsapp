const logsContainer = document.getElementById('logs-container');
const qrContainer = document.getElementById('qr-container');
const qrcodeElement = document.getElementById('qrcode');
const statusBadge = document.getElementById('status-badge');

window.electronAPI.onLogEntry((log) => {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${log.level.toLowerCase().replace(/\x1b\[[0-9;]*m/g, '')}`;
    // Strip ANSI codes for frontend display
    const cleanMessage = log.message.replace(/\x1b\[[0-9;]*m/g, '');
    entry.textContent = cleanMessage;
    
    logsContainer.appendChild(entry);
    
    // Auto scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
});

window.electronAPI.onQrCode((qrString) => {
    // Show QR container
    qrContainer.classList.remove('hidden');
    
    // Clear previous QR code
    qrcodeElement.innerHTML = '';
    
    // Generate new QR code using QRCode library included in index.html
    QRCode.toCanvas(qrString, {
        width: 250,
        margin: 2,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        }
    }, function (err, canvas) {
        if (err) console.error(err);
        qrcodeElement.appendChild(canvas);
    });
    
    statusBadge.textContent = 'NEEDS SCAN';
    statusBadge.className = 'badge auth';
});

window.electronAPI.onStatusUpdate((status) => {
    if (status === 'authenticated' || status === 'ready') {
        qrContainer.classList.add('hidden');
        statusBadge.textContent = status.toUpperCase();
        statusBadge.className = 'badge ready';
    }
});
