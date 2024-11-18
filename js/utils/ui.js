export function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    document.querySelector('.container').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

export function showLoading(show, initialMessage = '') {
    const loading = document.getElementById('loading');
    if (!loading) return;

    if (show) {
        loading.classList.remove('hidden');
        const messageText = loading.querySelector('.message-text');
        if (messageText) {
            messageText.textContent = initialMessage;
        }
        // Réinitialiser la barre de progression au démarrage
        const progressBar = loading.querySelector('.progress-bar');
        const progressText = loading.querySelector('.progress-text');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
    } else {
        loading.classList.add('hidden');
    }
}

export function updateLoadingProgress(progress, message) {
    const loading = document.getElementById('loading');
    if (!loading || loading.classList.contains('hidden')) return;

    const progressBar = loading.querySelector('.progress-bar');
    const progressText = loading.querySelector('.progress-text');
    const messageText = loading.querySelector('.message-text');

    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
        progressText.textContent = `${progress}%`;
    }
    if (messageText && message) {
        messageText.textContent = message;
    }
}