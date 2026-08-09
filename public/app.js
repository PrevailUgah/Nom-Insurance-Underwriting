document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('underwriting-form');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = {
        assetType: document.getElementById('assetType')?.value || 'Property',
        assetValue: document.getElementById('assetValue')?.value || 25000000,
        claimsHistory: document.getElementById('claimsHistory')?.value || 0
      };

      try {
        // Relative API URL enables request routing across local & cloud environments
        const response = await fetch('/api/underwrite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          updateUI(data);
        } else {
          alert('Failed to evaluate underwriting request.');
        }
      } catch (error) {
        console.error('API submission error:', error);
        alert('An error occurred while connecting to the underwriting server.');
      }
    });
  }
});

function updateUI(result) {
  const resultCard = document.getElementById('result-card');
  if (resultCard) {
    resultCard.innerHTML = `
      <h3>Decision: ${result.decision}</h3>
      <p><strong>Risk Level:</strong> ${result.riskLevel}</p>
      <p><strong>Estimated Premium:</strong> ₦${result.estimatedPremium.toLocaleString()}</p>
    `;
  }
}
