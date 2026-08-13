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
  
  // Close modal button listener
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
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
async function handleFormSubmit(event) {
  event.preventDefault();
  
  // Prevent duplicate submissions
  if (STATE.isAiActive) {
    showNotification('Processing underwriting request...', 'warning');
    return;
  }

  STATE.isAiActive = true;
  
  try {
    // Collect form data
    const formData = {
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      assetType: document.getElementById('assetType').value,
      replacementValue: parseFloat(document.getElementById('replacementValue').value),
      assetAge: parseInt(document.getElementById('assetAge').value),
      claimsHistory: parseInt(document.getElementById('claimsHistory').value)
    };

    // Send to backend API
    const response = await fetch('/api/underwrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();

    if (result.success) {
      // Update modal with results
      document.getElementById('riskScore').textContent = result.riskLevel;
      document.getElementById('multiplier').textContent = '1.0x'; // You can calculate this if needed
      document.getElementById('calculatedPremium').textContent = `₦${result.estimatedPremium.toLocaleString()}`;
      
      // Update badge color based on decision
      const badge = document.getElementById('decisionBadge');
      if (result.decision === 'Approved') {
        badge.className = 'text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono';
        badge.textContent = 'Approved';
      } else if (result.decision === 'Manual Review') {
        badge.className = 'text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full font-mono';
        badge.textContent = 'Manual Review';
      } else {
        badge.className = 'text-xs bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full font-mono';
        badge.textContent = 'Declined';
      }
      
      // Show the modal
      openModal();
      
      // Show success notification
      showNotification(`Underwriting complete - Record #${result.savedRecordId} saved.`, 'success');
    } else {
      showNotification('Underwriting processing failed. Please try again.', 'warning');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    showNotification(`Error: ${error.message}`, 'warning');
  } finally {
    STATE.isAiActive = false;
  }
}

/**
 * Opens the modal displaying underwriting results
 */
function openModal() {
  const modal = document.getElementById('aiModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

/**
 * Closes the modal
 */
function closeModal() {
  const modal = document.getElementById('aiModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}
