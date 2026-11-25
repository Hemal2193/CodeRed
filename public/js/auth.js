const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");


function showRegister() {
    loginForm.hidden = true;
    registerForm.hidden = false;
    message.textContent = "";
}


function showLogin() {
    loginForm.hidden = false;
    registerForm.hidden = true;
    message.textContent = "";
}


function changeRole() {

    const role = document.getElementById("role").value;

    document.getElementById("bloodGroup").hidden =
        role === "hospital";
}


// Login
loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = "/";
        } else {
            message.textContent = data.message;
            message.style.color = "red";
        }

    } catch (error) {
        message.textContent = "Unable to connect to server";
    }
});


// Register
registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const user = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value,
        blood_group: document.getElementById("bloodGroup").value,
        city: document.getElementById("city").value
    };

    try {

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        });

        const data = await response.json();

        if (response.ok) {

            registerForm.reset();
            changeRole();
            showLogin();

            message.textContent = "Registration successful! Please login.";
            message.style.color = "green";

        } else {
            message.textContent = data.message;
            message.style.color = "red";
        }

    } catch (error) {
        message.textContent = "Unable to connect to server";
    }
});