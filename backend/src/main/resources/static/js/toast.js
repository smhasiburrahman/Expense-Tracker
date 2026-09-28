/**
 * Integrated Toast Notification System
 * Replaces native browser alert() popups with elegant, accessible toasts.
 */
(function() {
  function getContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const recentToasts = new Map();

  function showToast(message, type = 'info', duration = 3500, title = null) {
    if (!message) return null;
    const normMsg = String(message).trim();
    const now = Date.now();
    const dedupKey = `${type}:${normMsg}`;

    // Suppress duplicate toasts if identical alert was triggered within the last 1500ms
    if (recentToasts.has(dedupKey) && (now - recentToasts.get(dedupKey)) < 1500) {
      return null;
    }
    recentToasts.set(dedupKey, now);

    // Prune stale entries
    if (recentToasts.size > 30) {
      for (const [k, time] of recentToasts.entries()) {
        if (now - time > 5000) recentToasts.delete(k);
      }
    }

    const container = getContainer();

    // Prevent duplicate alerts from firing simultaneously if already visible in DOM
    const activeToasts = container.querySelectorAll('.custom-toast:not(.toast-leaving)');
    for (const active of activeToasts) {
      const msgEl = active.querySelector('.toast-message');
      if (msgEl && msgEl.textContent.trim() === normMsg) {
        return active;
      }
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;

    let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
    let defaultTitle = 'Notice';
    if (type === 'success') {
      iconHtml = '<i class="fa-solid fa-circle-check"></i>';
      defaultTitle = 'Success';
    } else if (type === 'error') {
      iconHtml = '<i class="fa-solid fa-circle-xmark"></i>';
      defaultTitle = 'Error';
    } else if (type === 'warning') {
      iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';
      defaultTitle = 'Warning';
    }

    const toastTitle = title || defaultTitle;

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(toastTitle)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Close">&times;</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    function escapeHtml(str) {
      if (typeof str !== 'string') return String(str);
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function removeToast() {
      if (toast.classList.contains('toast-leaving')) return;
      toast.classList.add('toast-leaving');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) closeBtn.onclick = removeToast;

    let timer = setTimeout(removeToast, duration);

    toast.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      const progress = toast.querySelector('.toast-progress');
      if (progress) progress.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      const progress = toast.querySelector('.toast-progress');
      if (progress) progress.style.animationPlayState = 'running';
      timer = setTimeout(removeToast, 1500);
    });

    container.appendChild(toast);
    return toast;
  }

  window.showToast = showToast;
  window.Toast = {
    success: (msg, duration, title) => showToast(msg, 'success', duration, title),
    error: (msg, duration, title) => showToast(msg, 'error', duration, title),
    warning: (msg, duration, title) => showToast(msg, 'warning', duration, title),
    info: (msg, duration, title) => showToast(msg, 'info', duration, title)
  };

  // Intercept native browser alert() to render our integrated UI toast notification
  window.alert = function(message) {
    if (typeof message === 'string') {
      const lower = message.toLowerCase();
      if (lower.includes('fail') || lower.includes('error') || lower.includes('denied') || lower.includes('invalid') || lower.includes('insufficient')) {
        showToast(message, 'error');
        return;
      }
      if (lower.includes('success') || lower.includes('saved') || lower.includes('updated') || lower.includes('deleted') || lower.includes('refunded')) {
        showToast(message, 'success');
        return;
      }
      if (lower.includes('warn') || lower.includes('please') || lower.includes('check')) {
        showToast(message, 'warning');
        return;
      }
    }
    showToast(message, 'info');
  };
})();
