// script.js - Logic for the Financing & Subscription Calculator and FAQ

document.addEventListener('DOMContentLoaded', () => {

    // Initialize Stripe using the provided Live Publishable Key
    const stripe = Stripe('pk_live_51TC4SELaBFlnvJbWczLT71J1MU0txs693i5hasLyXyDlDZqNFwpdcxWrFD60IpV3lncUYED7FbCOXeJk1TGEhxvB00xPuVEMSd');
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
            
            // Hide the apply button
            continueBtn.parentElement.style.display = 'none';

            // Show the payment section
            const paymentSection = document.getElementById('payment-section');
            paymentSection.style.display = 'block';

            // Mount the Stripe element
            elements = stripe.elements({ clientSecret: subscriptionClientSecret });
            cardElement = elements.create('card');
            cardElement.mount('#card-element');

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to connect to the checkout server.');
            continueBtn.disabled = false;
            continueBtn.textContent = 'Apply & Continue';
        }
    });

    // Handle Payment Submission
    const submitBtn = document.getElementById('submit-payment');
    const paymentError = document.getElementById('payment-error');

    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing Payment...';
        paymentError.textContent = '';

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
