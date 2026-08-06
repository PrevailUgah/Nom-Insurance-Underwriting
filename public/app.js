document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('underwritingForm');
    const submitBtn = document.getElementById('submitBtn');
    
    // Results DOM elements
    const loadingState = document.getElementById('loadingState');
    const resultsContent = document.getElementById('resultsContent');
    const resTier = document.getElementById('resTier');
    const resStatus = document.getElementById('resStatus');
    const resBasePremium = document.getElementById('resBasePremium');
    const resMultiplier = document.getElementById('resMultiplier');
    const resFinalPremium = document.getElementById('resFinalPremium');
    const resFactorsList = document.getElementById('resFactorsList');
    const resSource = document.getElementById('resSource');
    
    const historyBody = document.getElementById('historyBody');

    // Formatters
    const formatMoney = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Build payload for property/vehicle
        const payload = {
            assetType: document.getElementById('assetType').value,
            assetValue: parseFloat(document.getElementById('assetValue').value),
            assetAge: parseInt(document.getElementById('assetAge').value, 10),
            environmentRisk: document.getElementById('environmentRisk').value,
            previousClaims: parseInt(document.getElementById('previousClaims').value, 10),
            securityFeatures: document.getElementById('securityFeatures').checked
        };

        // UI State: Loading
        submitBtn.disabled = true;
        submitBtn.textContent = "Analyzing...";
        resultsContent.classList.add('hidden');
        loadingState.classList.remove('hidden');

        try {
            const response = await fetch('http://localhost:3000/api/underwrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                renderResults(data, payload);
                addToHistory(data, payload);
            } else {
                alert("Underwriting failed: " + data.error);
            }
        } catch (error) {
            console.error('Network Error:', error);
            alert("Connection error to underwriting server.");
        } finally {
            // UI State: Reset
            submitBtn.disabled = false;
            submitBtn.textContent = "Evaluate Asset Risk";
            loadingState.classList.add('hidden');
            resultsContent.classList.remove('hidden');
        }
    });

    function renderResults(data, payload) {
        const assessment = data.assessment;

        // Reset badge classes
        resTier.className = 'badge';
        resStatus.className = 'badge';

        // Apply dynamic classes based on AI output
        resTier.textContent = assessment.riskTier;
        resTier.classList.add(assessment.riskTier.toLowerCase());

        resStatus.textContent = assessment.approvalStatus;
        if (assessment.approvalStatus === 'Approved') resStatus.classList.add('approved');
        else if (assessment.approvalStatus === 'Declined') resStatus.classList.add('declined');
        else resStatus.classList.add('review');

        // Financials
        resBasePremium.textContent = formatMoney(data.basePremium);
        resMultiplier.textContent = assessment.recommendedMultiplier + "x";
        resFinalPremium.textContent = formatMoney(data.finalPremium);

        // Factors list
        resFactorsList.innerHTML = '';
        assessment.riskFactors.forEach(factor => {
            const li = document.createElement('li');
            li.textContent = factor;
            resFactorsList.appendChild(li);
        });

        resSource.textContent = assessment.source;
    }

    function addToHistory(data, payload) {
        const assessment = data.assessment;
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${payload.assetType}</strong></td>
            <td>${formatMoney(payload.assetValue)}</td>
            <td>${payload.assetAge} yrs</td>
            <td><span class="badge ${assessment.riskTier.toLowerCase()}">${assessment.riskTier}</span></td>
            <td>${assessment.recommendedMultiplier}x</td>
            <td class="money">${formatMoney(data.finalPremium)}</td>
            <td>${assessment.approvalStatus}</td>
        `;

        // Prepend to show newest first
        historyBody.insertBefore(tr, historyBody.firstChild);
    }
});
