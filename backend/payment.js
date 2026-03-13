```javascript
// payment.js
function processPayment(amount) {
    // BUG FIX 1: Add input validation to ensure 'amount' is a valid number.
    // If 'amount' is not a number or is NaN, it should fail immediately,
    // rather than proceeding with comparisons or simulations.
    if (typeof amount !== 'number' || isNaN(amount)) {
        return {
            success: false,
            message: "Payment failed: Invalid amount provided. Amount must be a valid number."
        };
    }

    if (amount <= 0) {
        // Return a structured result for failure due to invalid amount
        return {
            success: false,
            message: "Payment failed: Amount must be positive."
        };
    }

    // In a real-world scenario, payment processing involves complex logic:
    // 1. Validating payment details (card number, expiry, CVV, etc.)
    // 2. Communicating with a payment gateway.
    // 3. Handling bank approvals/declines.
    // 4. Performing fraud checks.
    // 5. Checking for sufficient funds.
    //
    // The original logic only checked if the amount was positive, which is insufficient
    // to determine payment success. We simulate an external factor for success/failure.

    // Simulate a payment gateway response
    const isGatewayApproved = Math.random() > 0.2; // 80% chance of success for positive amounts in this simulation

    if (isGatewayApproved) {
        // Return a structured result for successful payment
        return {
            success: true,
            message: "Payment successful"
        };
    } else {
        // BUG FIX 2: Enhance the simulation to provide more specific decline reasons.
        // A real payment gateway would provide specific error codes/messages,
        // and a generic "Transaction declined" is often insufficient for debugging or user feedback.
        const declineReasons = [
            "Payment failed: Transaction declined by payment gateway (Insufficient Funds).",
            "Payment failed: Transaction declined by payment gateway (Card Expired or Invalid).",
            "Payment failed: Transaction declined by payment gateway (Suspected Fraud).",
            "Payment failed: Transaction declined by payment gateway (Do Not Honor).",
            "Payment failed: Transaction declined by payment gateway (Transaction Limit Exceeded)."
        ];
        const randomDeclineReason = declineReasons[Math.floor(Math.random() * declineReasons.length)];

        // Return a structured result for failed payment due to gateway decline
        return {
            success: false,
            message: randomDeclineReason
        };
    }
}
```