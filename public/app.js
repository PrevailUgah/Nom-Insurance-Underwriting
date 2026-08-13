/**
 * Nom Insurance Underwriting Engine
 * Client-side script handling risk evaluation & database persistence via Render backend.
 */

// Global System State
const STATE = {
  isAiActive: false // Flag indicating AI status
};

// DOM Element References
const form = document.getElementById('underwritingForm');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});

/**
 * Creates or updates an inline notification banner at the top of the form
 */
function showNotification(message, type = 'info') {
  let notificationBanner = document.getElementById('notificationBanner');

  // Create banner dynamically if it doesn't exist yet
  if (!notificationBanner) {
    notificationBanner = document.createElement('div');
    notificationBanner.id = 'notificationBanner';
    form.parentNode.insertBefore(notificationBanner, form);
  }

  if (type === 'success') {
    notificationBanner.className = 'mb-6 p-4 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 flex items-center justify-between shadow-lg';
    notificationBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-emerald-400 hover:text-white font-bold ml-4">&times;</button>
    `;
  } else if (type === 'warning') {
    notificationBanner.className = 'mb-6 p-4 rounded-lg border border-amber-500/40 bg-amber-950/60 text-amber-200 flex items-center justify-between shadow-lg';
    notificationBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-amber-400 hover:text-white font-bold ml-4">&times;</button>
    `;
  } else {
    notificationBanner.className = 'mb-6 p-4 rounded-lg border border-rose-500/40 bg-rose-950/60 text-rose-200 flex items-center justify-between shadow-lg';
    notificationBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-rose-400 hover:text-white font-bold ml-4">&times;</button>
    `;
  }
}

/**
 * Main form submission handler
 */
why is the premium not visible in the frontend?
