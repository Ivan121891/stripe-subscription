// script.js - Logic for the Financing & Subscription Calculator and FAQ

document.addEventListener('DOMContentLoaded', () => {

    // Initialize Stripe using the provided Live Publishable Key (Wrapped in try/catch to survive local file:// previews)
    let stripe = null;
    try {
        if (window.location.protocol.startsWith('http')) {
            stripe = Stripe('pk_live_51TC4SELaBFlnvJbWczLT71J1MU0txs693i5hasLyXyDlDZqNFwpdcxWrFD60IpV3lncUYED7FbCOXeJk1TGEhxvB00xPuVEMSd');
        }
    } catch (e) {
        // Silently bypass initialization if blocked
    }
    let elements;
    let cardElement;
    let subscriptionClientSecret;

    // --- Calculator Logic ---
    const calcAmount = document.getElementById('calcAmount');
    const getOptionsBtn = document.getElementById('calcGetOptionsBtn');
    const resultsContainer = document.getElementById('calcResults');
    const disclaimer = document.getElementById('calcDisclaimer');
    const actionsContainer = document.getElementById('calcActions');
    const continueBtn = document.getElementById('calcContinueBtn');

    let selectedPlan = null;

    // Standard tier logic based on total amount
    const tiers = [
        { label: 'Biweekly', interval: 'week', intervalCount: 2, formatter: (val) => `$${(val/4).toFixed(2)} / biweekly`, getPerInterval: (val) => val/4 },
        { label: '3 Months', interval: 'month', intervalCount: 1, formatter: (val) => `$${(val/3).toFixed(2)} / mo`, getPerInterval: (val) => val/3 },
        { label: '4 Months', interval: 'month', intervalCount: 1, formatter: (val) => `$${(val/4).toFixed(2)} / mo`, getPerInterval: (val) => val/4 },
        { label: '5 Months', interval: 'month', intervalCount: 1, formatter: (val) => `$${(val/5).toFixed(2)} / mo`, getPerInterval: (val) => val/5 },
        { label: '6 Months', interval: 'month', intervalCount: 1, formatter: (val) => `$${(val/6).toFixed(2)} / mo`, getPerInterval: (val) => val/6 },
        { label: '7 Months', interval: 'month', intervalCount: 1, formatter: (val) => `$${(val/7).toFixed(2)} / mo`, getPerInterval: (val) => val/7 },
        { label: '12 Months', interval: 'month', intervalCount: 1, formatter: (val) => `$${(val/12).toFixed(2)} / mo`, getPerInterval: (val) => val/12 }
    ];

    getOptionsBtn.addEventListener('click', () => {
        const amount = parseFloat(calcAmount.value);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        // Hide button, show results
        getOptionsBtn.style.display = 'none';
        
        // Generate options HTML
        resultsContainer.innerHTML = '';
        selectedPlan = null;
        continueBtn.disabled = true;

        tiers.forEach((tier, index) => {
            const el = document.createElement('div');
            el.className = 'tier-option';
            el.innerHTML = `
                <span class="tier-term">${tier.label}</span>
                <span class="tier-price">${tier.formatter(amount)}</span>
            `;
            
            // Selection logic
            el.addEventListener('click', () => {
                // Remove selected class from all
                document.querySelectorAll('.tier-option').forEach(t => t.classList.remove('selected'));
                el.classList.add('selected');
                
                selectedPlan = {
                    totalAmount: amount,
                    planName: tier.label,
                    paymentText: tier.formatter(amount),
                    interval: tier.interval,
                    intervalCount: tier.intervalCount,
                    amountPerInterval: tier.getPerInterval(amount)
                };
                
                continueBtn.disabled = false;
            });

            resultsContainer.appendChild(el);
        });

        resultsContainer.style.display = 'block';
        disclaimer.style.display = 'block';
        actionsContainer.style.display = 'block';
    });

    // Reset view if input changes
    calcAmount.addEventListener('input', () => {
        if (resultsContainer.style.display === 'block') {
            resultsContainer.style.display = 'none';
            disclaimer.style.display = 'none';
            actionsContainer.style.display = 'none';
            getOptionsBtn.style.display = 'block';
        }
    });

    // Continue action (Trigger Subscription and show Card form)
    continueBtn.addEventListener('click', async () => {
        if (!selectedPlan) return;
        
        // Disable button to prevent double clicks
        continueBtn.disabled = true;
        continueBtn.textContent = 'Processing...';

        try {
            const response = await fetch('http://localhost:4242/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planName: selectedPlan.planName,
                    amountPerInterval: selectedPlan.amountPerInterval,
                    totalAmount: selectedPlan.totalAmount,
                    interval: selectedPlan.interval,
                    intervalCount: selectedPlan.intervalCount
                }),
            });

            const session = await response.json();

            if (session.error) {
                alert('Stripe Error: ' + session.error);
                continueBtn.disabled = false;
                continueBtn.textContent = 'Apply & Continue';
                return;
            }

            subscriptionClientSecret = session.clientSecret;
            elements = stripe.elements({ clientSecret: subscriptionClientSecret });

        } catch (error) {
            if (stripe) elements = stripe.elements();
        }

        // Hide the apply button
        continueBtn.parentElement.style.display = 'none';

        // Show the payment section
        const paymentSection = document.getElementById('payment-section');
        paymentSection.style.display = 'block';

        // Mount the Stripe element or a realistic visual proxy if blocked by file://
        if (stripe) {
            cardElement = elements.create('card', { style: { base: { fontSize: '16px', color: '#1A0D3E', '::placeholder': { color: '#888' } } }});
            cardElement.mount('#card-element');
        } else {
            document.getElementById('card-element').innerHTML = `
                <div style="display:flex; flex-direction:column; gap:0.8rem; font-family: var(--font-body, sans-serif);">
                    <input type="text" placeholder="Name on card" style="width: 100%; padding: 0.8rem 1rem; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 0.95rem; outline:none; background: #fff;">
                    <div style="display:flex; gap:0.8rem;">
                        <div style="position: relative; flex: 1; min-width: 0;">
                            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #ccc; display: flex;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                            </span>
                            <input type="tel" placeholder="Card number" maxlength="19" style="width: 100%; padding: 0.8rem 6rem 0.8rem 2.6rem; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 0.95rem; outline:none; background: #fff;">
                            <div style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: #011E13; color: white; padding: 5px 10px; border-radius: 6px; font-weight: 500; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; font-family: sans-serif;">
                                Autofill <span style="color: #00D66F; font-weight: 700;">link</span>
                            </div>
                        </div>
                        <input type="tel" placeholder="MM / YY" maxlength="5" style="width: 90px; padding: 0.8rem 1rem; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 0.95rem; text-align:center; outline:none; background: #fff;">
                        <input type="tel" placeholder="CVC" maxlength="4" style="width: 80px; padding: 0.8rem 1rem; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 0.95rem; text-align:center; outline:none; background: #fff;">
                    </div>
                </div>
                <div style="font-size: 0.75rem; color: #888; text-align: center; margin-top: 10px;">(Local Demo Mode: Card fields are unlocked for your visual presentation)</div>
            `;
            document.getElementById('card-element').style.border = 'none';
            document.getElementById('card-element').style.padding = '0';
        }
    });

    // Handle Payment Submission
    const submitBtn = document.getElementById('submit-payment');
    const paymentError = document.getElementById('payment-error');
    const cancelBtn = document.getElementById('cancel-payment');

    cancelBtn.addEventListener('click', () => {
        // Reverse UI state back to the tier selection
        document.getElementById('payment-section').style.display = 'none';
        continueBtn.parentElement.style.display = 'block';
        continueBtn.disabled = false;
        continueBtn.textContent = 'Apply & Continue';
        
        // Clean up Stripe element instance to prevent duplicates on re-entry
        if (cardElement && typeof cardElement.destroy === 'function') {
            cardElement.destroy();
            cardElement = null;
        }
    });

    submitBtn.addEventListener('click', async () => {
        // Collect demographic and billing values
        const custName = document.getElementById('custName').value.trim() || 'Financing Customer';
        const custEmail = document.getElementById('custEmail').value.trim() || 'customer@example.com';
        const custPhone = document.getElementById('custPhone').value.trim() || '';
        const custAddress = document.getElementById('custAddress').value.trim() || '';
        const custCity = document.getElementById('custCity').value.trim() || '';
        const custState = document.getElementById('custState').value.trim() || '';
        const custZip = document.getElementById('custZip').value.trim() || '';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing Payment...';
        paymentError.textContent = '';

        if (!subscriptionClientSecret) {
            // Mock Mode Completion
            setTimeout(() => {
                document.getElementById('payment-section').innerHTML = '<h3 style="color: #2e7d32; text-align:center;">Demo Payment Successful!</h3><p style="text-align:center; margin-top: 1rem; color: #555;">(Visual Mockup: The local Node.js server is currently offline.)</p>';
            }, 1000);
            return;
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(subscriptionClientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: custName,
                    email: custEmail,
                    phone: custPhone,
                    address: {
                        line1: custAddress,
                        city: custCity,
                        state: custState,
                        postal_code: custZip
                    }
                }
            }
        });

        if (error) {
            paymentError.textContent = error.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Payment';
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            document.getElementById('payment-section').innerHTML = '<h3 style="color: #2e7d32; text-align:center;">Payment Successful!</h3><p style="text-align:center; margin-top: 1rem; color: #555;">Your financing subscription has been confirmed and activated.</p>';
        }
    });


    // --- FAQ Accordion Logic ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        btn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(i => i.classList.remove('active'));

            // Open if wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

});
