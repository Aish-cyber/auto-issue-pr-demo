```javascript
// signup.js
function signup(email, password) {
    if(email.includes("@")) {
        // FIX: Add password length check
        if (password.length < 8) { // Example: minimum 8 characters for a strong password
            console.log("Password is too weak. Must be at least 8 characters long.");
            return; // Prevent account creation with a weak password
        }
        console.log("Account created!");
    } else {
        console.log("Invalid email");
    }
}

signup("test@example.com", "123"); // Should warn about weak password
```