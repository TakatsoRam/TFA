// Client-side form validation and submission
document.getElementById('registrationForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    // Fetch form values
    const fullName = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // Simple form validation
    if (password !== confirmPassword) {
        document.getElementById('message').innerText = "Passwords do not match!";
        return;
    }

    // Log the values for debugging
    console.log("Form Values: ", { fullName, email, phone, address, password });

    // Send data to the server
    fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, email, phone, address, password })
    })
    .then(response => {
        console.log("Response Status: ", response.status, response.statusText);
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(`Server Error: ${response.status} - ${error.message}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Server Response: ", data);
        if (data.success) {
            document.getElementById('message').innerText = "Registration successful! Redirecting to login page...";
            setTimeout(() => {
                window.location.href = 'http://localhost/TFA2/login.html';
            }, 2000);
        } else {
            document.getElementById('message').innerText = `Registration failed: ${data.message}`;
        }
    })
    .catch(error => {
        console.error('Registration Error: ', error);
        document.getElementById('message').innerText = `An error occurred while registering: ${error.message}. Check the server logs for more details.`;
    });
    
});
