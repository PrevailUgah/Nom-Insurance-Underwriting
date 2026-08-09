/**
 * Nom Insurance Underwriting Engine
 * Client-side script handling risk evaluation & fallback handling.
 */

// Global System State
const STATE = {
  isAiActive: false, // Set to true when your AI backend model/API is available
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
});

/**
 * Main form submission handler
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Gather input parameters
  const formData = {
    assetType: document.getElementById('assetType').value,
    replacementValue: parseFloat(document.getElementById('replacementValue').value) || 0,
    assetAge: parseInt(document.getElementById('assetAge').value, 10) || 0,
    claimsHistory: parseInt(document.getElementById('claimsHistory').value, 10) || 0,
  };

  // Check AI Engine Availability
  if (!STATE.isAiActive) {
    // Show Modal Notice & proceed with Fallback Engine upon user confirmation
    showAiInactiveModal(() => {
      const evaluation = evaluateFallbackRisk(formData);
      renderResults(evaluation);
    });
  } else {
    // Run primary AI evaluation
    runAiEvaluation(formData);
  }
}

/**
 * Displays the Modal Popup when AI is inactive
 * @param {Function} onConfirm - Callback after user acknowledges notice
 */
function showAiInactiveModal(onConfirm) {
  if (!modal) {
    // Fallback if modal DOM is missing
    alert('AI currently Inactive, fallback risk evaluator initialized.');
    onConfirm();
    return;
  }

  modal.classList.remove('hidden');

  const handleClose = () => {
    modal.classList.add('hidden');
    closeModalBtn.removeEventListener('click', handleClose);
    onConfirm();
  };

  closeModalBtn.addEventListener('click', handleClose);
}

/**
 * Fallback Algorithmic Underwriting Engine
 * Used when AI model is offline or unreachable.
 */
function evaluateFallbackRisk(data) {
  let baseScore = 20;

  // Age Factor Calculation
  baseScore += data.assetAge * 3;

  // Claims History Weighting (High Risk Factor)
  baseScore += data.claimsHistory * 18;

  // Valuation Threshold Factor
  if (data.replacementValue > 100000) {
    baseScore += 15;
  } else if (data.replacementValue > 50000) {
    baseScore += 8;
  }

  // Cap Risk Score between 0 and 100
  const riskScore = Math.min(Math.max(baseScore, 0), 100);

  // Determine Approval Status & Premium Multiplier
  let status = 'Approved';
  let badgeClass = 'status-approved';
  let multiplierVal = 1.0;

  if (riskScore >= 75) {
    status = 'Declined';
    badgeClass = 'status-declined';
    multiplierVal = 0;
  } else if (riskScore >= 45) {
    status = 'Manual Review';
    badgeClass = 'status-review';
    multiplierVal = 1.45;
  } else {
    multiplierVal = 1 + (riskScore / 100) * 0.5;
  }

  // Base rate calculation (2% base rate * asset replacement value * risk multiplier)
  const baseRate = 0.02;
  const rawPremium = data.replacementValue * baseRate * multiplierVal;

  // Format Premium to Nigerian Naira (₦)
  const formattedPremium = status === 'Declined'
    ? 'N/A'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(rawPremium);

  return {
    riskScore,
    status,
    badgeClass,
    multiplier: status === 'Declined' ? 'N/A' : `${multiplierVal.toFixed(2)}x`,
    premium: formattedPremium,
  };
}

/**
 * Placeholder for primary AI Risk Evaluation API call
 */
async function runAiEvaluation(data) {
  try {
    // Replace with your actual AI backend endpoint (e.g., fetch('/api/evaluate', ...))
    console.log('Sending payload to AI model...', data);
  } catch (error) {
    console.error('AI evaluation failed, reverting to modal fallback:', error);
    STATE.isAiActive = false;
    showAiInactiveModal(() => renderResults(evaluateFallbackRisk(data)));
  }
}

/**
 * Updates UI Output Card with calculated metrics
 */
function renderResults(result) {
  if (decisionBadge) {
    decisionBadge.textContent = result.status;
    decisionBadge.className = `badge ${result.badgeClass}`;
  }

  if (riskScoreEl) {
    riskScoreEl.textContent = `${result.riskScore} / 100`;
  }

  if (multiplierEl) {
    multiplierEl.textContent = result.multiplier;
  }

  if (premiumEl) {
    premiumEl.textContent = result.premium;
  }
}
