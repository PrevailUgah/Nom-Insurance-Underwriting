/**
 * Nom Insurance Underwriting Engine
 * Client-side script handling risk evaluation & database persistence via Render backend.
 */

// Global System State
const STATE = {
  isAiActive: true // Route submissions to backend API
};

// DOM Element References
const form = document.getElementById('underwritingForm');
const modal = document.getElementById('aiModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const decisionBadge = document.getElementById('decisionBadge');
const riskScoreEl = document.getElementById('riskScore');
const multiplierEl = document.getElementById('multiplier');
const premiumEl = document.getElementById('calculatedPremium');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
});

/**
 * Main form submission handler
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Gather all input parameters matching form IDs
  const formData = {
    fullName: document.getElementById('fullName')?.value || '',
    email: document.getElementById('email')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    assetType: document.getElementById('assetType')?.value || '',
    replacementValue: Number(document.getElementById('replacementValue')?.value || 0),
    assetAge: Number(document.getElementById('assetAge')?.value || 0),
    claimsHistory: Number(document.getElementById('claimsHistory')?.value || 0)
  };

  try {
    // Send payload to your live Render Backend API
    const response = await fetch('https://nom-insurance-backend.onrender.com/api/underwrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update Modal UI with results returned from server
    if (result.success && result.data) {
      if (riskScoreEl) riskScoreEl.textContent = result.data.risk_score || 'N/A';
      if (multiplierEl) multiplierEl.textContent = `${result.data.multiplier || 1}x`;
      if (premiumEl) premiumEl.textContent = `$${result.data.calculated_premium || '0.00'}`;
      if (decisionBadge) decisionBadge.textContent = 'Approved & Saved to Neon';
    }

    // Show modal
    if (modal) modal.classList.remove('hidden');

  } catch (error) {
    console.error('Submission Error:', error);
    alert('Failed to save to database. Check console for details.');
  }
}
