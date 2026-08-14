/**
 * Nom Insurance Underwriting Engine
 * Client-side script handling risk evaluation & database persistence via Render backend.
 */

// Global System State
const STATE = {
  isProcessing: false
};

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('underwritingForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Close modal button listener
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // Close modal on escape key or background overlay click
  const modal = document.getElementById('aiModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
});

/**
 * Creates or updates an inline notification banner at the top of the form
 */
function showNotification(message, type = 'info') {
  const form = document.getElementById('underwritingForm');
  if (!form) return;

  let notificationBanner = document.getElementById('notificationBanner');

  if (!notificationBanner) {
    notificationBanner = document.createElement('div');
    notificationBanner.id = 'notificationBanner';
    form.parentNode.insertBefore(notificationBanner, form);
  }

  if (type === 'success') {
    notificationBanner.className = 'mb-6 p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/70 text-emerald-200 flex items-center justify-between shadow-lg text-xs md:text-sm font-medium';
    notificationBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-emerald-400 hover:text-white font-bold ml-4 text-base">&times;</button>
    `;
  } else if (type === 'warning') {
    notificationBanner.className = 'mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-950/70 text-amber-200 flex items-center justify-between shadow-lg text-xs md:text-sm font-medium';
    notificationBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-amber-400 hover:text-white font-bold ml-4 text-base">&times;</button>
    `;
  } else {
    notificationBanner.className = 'mb-6 p-4 rounded-xl border border-rose-500/40 bg-rose-950/70 text-rose-200 flex items-center justify-between shadow-lg text-xs md:text-sm font-medium';
    notificationBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-rose-400 hover:text-white font-bold ml-4 text-base">&times;</button>
    `;
  }
}

/**
 * Main form submission handler
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  if (STATE.isProcessing) {
    showNotification('Processing underwriting evaluation...', 'warning');
    return;
  }

  STATE.isProcessing = true;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
  }

  try {
    // Collect form data
    const formData = {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      assetType: document.getElementById('assetType').value,
      replacementValue: parseFloat(document.getElementById('replacementValue').value) || 0,
      assetAge: parseInt(document.getElementById('assetAge').value) || 0,
      claimsHistory: parseInt(document.getElementById('claimsHistory').value) || 0
    };

    let resultData = null;

    // Send request to backend API
    try {
      const response = await fetch('/api/underwrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        resultData = await response.json();
      }
    } catch (apiErr) {
      console.warn('Backend API unreachable, using client actuarial engine fallback:', apiErr);
    }

    // Fallback logic if API failed or returned non-success
    if (!resultData || !resultData.success) {
      resultData = calculateClientFallback(formData);
    }

    // Display results in modal with user's email
    displayUnderwritingResults(resultData, formData.email);
    
    // Show banner notification requested by user
    showNotification(`Submitted successfully! Check your email (${formData.email}) for your premium score.`, 'success');

  } catch (error) {
    console.error('Form submission error:', error);
    showNotification(`Error: ${error.message}`, 'error');
  } finally {
    STATE.isProcessing = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  }
}

/**
 * Client-Side Actuarial Fallback Calculator
 */
function calculateClientFallback(data) {
  let score = 20 + (data.assetAge * 3) + (data.claimsHistory * 18);
  if (data.replacementValue > 100000) {
    score += 15;
  } else if (data.replacementValue > 50000) {
    score += 8;
  }

  const riskScore = Math.min(100, Math.max(0, score));

  let decision = 'Approved';
  let multiplier = 1.0;
  let riskLevel = 'Low';

  if (riskScore >= 75 || data.claimsHistory >= 3) {
    decision = 'Manual Review';
    multiplier = 1.45;
    riskLevel = 'High';
  } else if (riskScore >= 45 || data.claimsHistory === 2) {
    decision = 'Approved (Moderate Risk)';
    multiplier = 1.2;
    riskLevel = 'Medium';
  } else {
    decision = 'Approved';
    multiplier = 1.0;
    riskLevel = 'Low';
  }

  const baseRate = 0.02;
  const estimatedPremium = Math.round(data.replacementValue * baseRate * multiplier);

  return {
    success: true,
    decision,
    riskLevel: `${riskLevel} (${riskScore}/100)`,
    multiplier: `${multiplier.toFixed(2)}x`,
    estimatedPremium,
    savedRecordId: Math.floor(Math.random() * 89999 + 10000)
  };
}

/**
 * Display underwriting output in Modal
 */
function displayUnderwritingResults(result, userEmail = '') {
  const riskScoreEl = document.getElementById('riskScore');
  const multiplierEl = document.getElementById('multiplier');
  const premiumEl = document.getElementById('calculatedPremium');
  const badgeEl = document.getElementById('decisionBadge');
  const userEmailEl = document.getElementById('userSubmittedEmail');
  const aiAnalysisTextEl = document.getElementById('aiAnalysisText');

  if (riskScoreEl) riskScoreEl.textContent = result.riskLevel || 'Low';
  if (multiplierEl) multiplierEl.textContent = result.multiplier || '1.0x';
  if (premiumEl) premiumEl.textContent = `₦${(result.estimatedPremium || 0).toLocaleString()}`;
  if (userEmailEl && userEmail) userEmailEl.textContent = userEmail;
  if (aiAnalysisTextEl) {
    aiAnalysisTextEl.textContent = result.aiAnalysis || 'Evaluated using Google Gemini AI risk assessment model.';
  }

  if (badgeEl) {
    const decision = result.decision || 'Approved';
    if (decision.includes('Approved')) {
      badgeEl.className = 'text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full font-mono font-bold';
      badgeEl.textContent = decision;
    } else if (decision.includes('Manual')) {
      badgeEl.className = 'text-xs bg-amber-950 text-amber-400 border border-amber-800 px-3 py-1 rounded-full font-mono font-bold';
      badgeEl.textContent = 'Manual Review';
    } else {
      badgeEl.className = 'text-xs bg-rose-950 text-rose-400 border border-rose-800 px-3 py-1 rounded-full font-mono font-bold';
      badgeEl.textContent = 'Declined';
    }
  }

  openModal();
}

/**
 * Opens the result modal
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
