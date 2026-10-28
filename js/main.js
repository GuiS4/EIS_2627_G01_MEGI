// Main JavaScript file for the Courier Management System

console.log("Courier Management System loaded.");


"use strict";

// =====================================
// COURIERFLOW - DEMO AUTHENTICATION
// Sprint 1 frontend prototype only
// =====================================

function getUsers() {
    return JSON.parse(
        localStorage.getItem("cms_users") || "[]"
    );
}

function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    error.textContent = message;
    input.classList.add("input-error");
}

function resetError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    error.textContent = "";
    input.classList.remove("input-error");
}


// =====================================
// REGISTER
// =====================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const fields = [
            ["name", "nameError"],
            ["username", "usernameError"],
            ["registerEmail", "registerEmailError"],
            ["phone", "phoneError"],
            ["nif", "nifError"],
            ["role", "roleError"],
            ["registerPassword", "registerPasswordError"],
            ["confirmPassword", "confirmPasswordError"]
        ];

        let valid = true;

        fields.forEach(function([inputId, errorId]) {
            resetError(inputId, errorId);

            const input = document.getElementById(inputId);

            if (input.value.trim() === "") {
                showError(
                    inputId,
                    errorId,
                    "This field is required."
                );
                valid = false;
            }
        });

        const name = document.getElementById("name").value.trim();
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("registerEmail").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const nif = document.getElementById("nif").value.trim();
        const role = document.getElementById("role").value;
        const password = document.getElementById("registerPassword").value;
        const confirmation = document.getElementById("confirmPassword").value;

        if (email !== "" &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            showError(
                "registerEmail",
                "registerEmailError",
                "Please enter a valid email."
            );
            valid = false;
        }

        if (password !== "" && password.length < 6) {
            showError(
                "registerPassword",
                "registerPasswordError",
                "Password must contain at least 6 characters."
            );
            valid = false;
        }

        if (confirmation !== "" && password !== confirmation) {
            showError(
                "confirmPassword",
                "confirmPasswordError",
                "Passwords do not match."
            );
            valid = false;
        }

        if (role !== "" &&
            role !== "client" &&
            role !== "courier") {

            showError(
                "role",
                "roleError",
                "Please select a valid account type."
            );
            valid = false;
        }

        const users = getUsers();

        if (users.some(user => user.email === email)) {
            showError(
                "registerEmail",
                "registerEmailError",
                "This email is already registered."
            );
            valid = false;
        }

        if (users.some(user => user.username === username)) {
            showError(
                "username",
                "usernameError",
                "This username is already taken."
            );
            valid = false;
        }

        if (!valid) {
            return;
        }

        // DEMO ONLY:
        // Passwords are stored locally in plain text.
        // Never use this approach in production.

        const newUser = {
            id: crypto.randomUUID(),
            name: name,
            username: username,
            email: email,
            phone: phone,
            nif: nif,
            role: role,
            password: password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        localStorage.setItem(
            "cms_users",
            JSON.stringify(users)
        );

        alert("Account created successfully! Please login.");

        window.location.href = "login.html";
    });
}


// =====================================
// LOGIN
// =====================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();

        resetError("email", "emailError");
        resetError("password", "passwordError");

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const password =
            document.getElementById("password").value;

        let valid = true;

        if (email === "") {
            showError(
                "email",
                "emailError",
                "Email is required."
            );
            valid = false;
        }

        if (password === "") {
            showError(
                "password",
                "passwordError",
                "Password is required."
            );
            valid = false;
        }

        if (!valid) {
            return;
        }

        const users = getUsers();

        const user = users.find(function(savedUser) {
            return savedUser.email === email &&
                   savedUser.password === password;
        });

        if (!user) {
            showError(
                "password",
                "passwordError",
                "Incorrect email or password."
            );
            return;
        }

        // Demo session (not secure authentication)

        sessionStorage.setItem(
            "cms_current_user",
            JSON.stringify({
                id: user.id,
                name: user.name,
                role: user.role
            })
        );

        // Redirect according to user role

        if (user.role === "client") {
            window.location.href = "client.html";

        } else if (user.role === "courier") {
            window.location.href = "courier.html";

        }
    });
}

