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
        { label: '6 Weeks (0% APR)', interval: 'week', intervalCount: 1, rate: 0, formatter: (val) => `$${(val/6).toFixed(2)} / wk`, getPerInterval: (val) => val/6 },
        { label: '12 Weeks (0% APR)', interval: 'week', intervalCount: 1, rate: 0, formatter: (val) => `$${(val/12).toFixed(2)} / wk`, getPerInterval: (val) => val/12 },
        { label: '3 Months (0% APR)', interval: 'month', intervalCount: 1, rate: 0, formatter: (val) => `$${(val/3).toFixed(2)} / mo`, getPerInterval: (val) => val/3 },
        { label: '6 Months (0% APR)', interval: 'month', intervalCount: 1, rate: 0, formatter: (val) => `$${(val/6).toFixed(2)} / mo`, getPerInterval: (val) => val/6 },
        { label: '12 Months (5.99% APR)', interval: 'month', intervalCount: 1, rate: 0.0599, formatter: (val) => `$${((val * 1.0599)/12).toFixed(2)} / mo`, getPerInterval: (val) => (val * 1.0599)/12 }
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
                <div style="display:flex; gap:10px; font-family: sans-serif;">
                    <input type="text" placeholder="Card number" value="4242  4242  4242  4242" disabled style="flex: 1; min-width: 0; padding: 10px; border: 1px solid #E5E7EB; border-radius: 5px; background: #FAFAFB; color: #888;">
                    <input type="text" placeholder="MM/YY" value="12 / 26" disabled style="width: 70px; padding: 10px; border: 1px solid #E5E7EB; border-radius: 5px; background: #FAFAFB; color: #888;">
                    <input type="text" placeholder="CVC" value="123" disabled style="width: 60px; padding: 10px; border: 1px solid #E5E7EB; border-radius: 5px; background: #FAFAFB; color: #888;">
                </div>
                <div style="font-size: 0.75rem; color: #888; text-align: center; margin-top: 8px;">(Local File Preview: This input will activate securely once hosted online)</div>
            `;
            document.getElementById('card-element').style.border = 'none';
            document.getElementById('card-element').style.padding = '0';
        }
    });

    // Handle Payment Submission
    const submitBtn = document.getElementById('submit-payment');
    const paymentError = document.getElementById('payment-error');

    submitBtn.addEventListener('click', async () => {
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
                    name: 'Financing Customer', // Ideally collected from an input field
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
