const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_replace_me');

const app = express();
app.use(cors());
app.use(express.static('.')); 
app.use(express.json());

// Endpoint to handle inline element Checkout via Subscription Intents
app.post('/create-subscription', async (req, res) => {
    try {
        const { planName, amountPerInterval, totalAmount, interval, intervalCount } = req.body;
        const unitAmount = Math.round(amountPerInterval * 100);

        // 1. Create a logical customer container for the Subscription to attach to
        const customer = await stripe.customers.create({
            description: `Auto Pay Financing intent for ${planName} - Total $${totalAmount}`,
        });

        // 2. Build the exact Subscription layout required including the recurring price data inline
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Financing Plan: ${planName}`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval, 
                            interval_count: intervalCount || 1,
                        },
                    },
                },
            ],
            // Request an incomplete state to pass to the frontend elements to fulfill
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        // 3. Return the intent secret required to render Stripe Elements on the client
        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

const PORT = 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));
