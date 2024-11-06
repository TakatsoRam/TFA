document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDiv = document.getElementById('message'); // For displaying messages

    // Clear previous messages
    messageDiv.innerText = '';

    // Basic validation
    if (email === '' || password === '') {
        messageDiv.innerText = "Please enter both email and password.";
        return;
    }

    // Send the login request to the server
    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Send the email and password in the request body
    })
    .then(response => response.json())
    .then(data => {
        // Handle response from the server
        if (data.success) {
            messageDiv.innerText = "Login successful! Redirecting...";
            // Redirect to a dashboard or home page after successful login
            setTimeout(() => {
                window.location.href = 'dashboard.html'; 
            }, 2000);
        } else {
            // Display error message if login fails
            messageDiv.innerText = data.message || "Invalid email or password.";
        }
    })
    .catch(error => {
        console.error('Login Error:', error); // Log any errors to the console
        messageDiv.innerText = "An error occurred during login. Please try again later.";
    });
});
