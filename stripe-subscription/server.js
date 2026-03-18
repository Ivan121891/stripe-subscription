const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_replace_me');

const app = express();
app.use(cors());
app.use(express.static('.')); // Serve the HTML/CSS/JS statically
app.use(express.json());

// Create Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { planName, amountPerInterval, totalAmount, interval, intervalCount } = req.body;

        // Ensure variables are formatted for Stripe (uses cents)
        const unitAmount = Math.round(amountPerInterval * 100);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Financing: ${planName}`,
                            description: `Subscription Auto Pay for total of $${totalAmount}`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval, 
                            interval_count: intervalCount || 1,
                        },
                    },
                    quantity: 1,
                },
            ],
            // Redirect URLs
            success_url: `${req.headers.origin}?success=true`,
            cancel_url: `${req.headers.origin}?canceled=true`,
        });

        res.json({ id: session.id, url: session.url });
    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

const PORT = 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));
