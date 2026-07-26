// Toasts + smooth cross-page navigation transitions, shared everywhere.

function showToast(message, type = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// Intercept same-site internal links so navigation fades out before the
// browser loads the next page, and the next page fades in on arrival.
function initPageTransitions() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-nav]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || link.target === '_blank') return;
    e.preventDefault();
    document.body.classList.add('page-out');
    setTimeout(() => {
      window.location.href = href;
    }, 220);
  });
}

document.addEventListener('DOMContentLoaded', initPageTransitions);
