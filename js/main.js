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
            role !== "courier" &&
            role !== "staff") {

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

        const approvalStatus = (role === "courier" || role === "staff")
            ? "Pending"
            : "Approved";

        const newUser = {
            id: role === "courier"
                ? `CR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
                : role === "staff"
                    ? `ST-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
                    : crypto.randomUUID(),
            name: name,
            username: username,
            email: email,
            phone: phone,
            nif: nif,
            role: role,
            approval_status: approvalStatus,
            approved_by: null,
            password: password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        localStorage.setItem(
            "cms_users",
            JSON.stringify(users)
        );

        if (role === "courier") {
            alert("Courier account created! Your account is pending Staff approval before login.");
        } else if (role === "staff") {
            alert("Staff account created! Your account is pending Admin approval before login.");
        } else {
            alert("Account created successfully! Please login.");
        }

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

        // Administrator demo access
        if (email === "admin@admin.demo" && password === "Admin123!") {
            sessionStorage.removeItem("cms_current_user");
            sessionStorage.setItem("courierflow.demo.role", "admin");
            window.location.href = "admin.html";
            return;
        }

        // Staff demo access
        if (email === "staff@staff.demo" && password === "Staff123!") {
            sessionStorage.removeItem("cms_current_user");
            sessionStorage.setItem("courierflow.demo.role", "staff");
            window.location.href = "staff.html";
            return;
        }

        // Courier demo access
        if (email === "courier@courier.demo" && password === "Courier123!") {
            sessionStorage.setItem("courierflow.demo.role", "courier");
            sessionStorage.setItem(
                "cms_current_user",
                JSON.stringify({
                    id: "CR-001",
                    name: "Alex Silva",
                    username: "alexsilva",
                    email: "courier@courier.demo",
                    role: "courier"
                })
            );
            window.location.href = "courier.html";
            return;
        }

        // Client demo access
        if (email === "client@client.demo" && password === "Client123!") {
            sessionStorage.setItem("courierflow.demo.role", "client");
            sessionStorage.setItem(
                "cms_current_user",
                JSON.stringify({
                    id: "CL-001",
                    name: "Demo Client",
                    username: "democlient",
                    email: "client@client.demo",
                    role: "client"
                })
            );
            window.location.href = "client.html";
            return;
        }

        // Clear any previous demo role session
        sessionStorage.removeItem("courierflow.demo.role");

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

        // Check approval status for Staff and Courier accounts
        if (user.role === "staff") {
            // Check latest status in Admin staff store if available
            try {
                const adminStore = JSON.parse(localStorage.getItem("courierflow.admin.staff.v1") || "null");
                const matchStaff = adminStore?.staff?.find(s => s.id === user.id || (s.email && s.email.toLowerCase() === email));
                if (matchStaff && matchStaff.approval_status) {
                    user.approval_status = matchStaff.approval_status;
                }
            } catch { /* ignore */ }

            if (user.approval_status === "Pending") {
                showError(
                    "password",
                    "passwordError",
                    "Your Staff account is pending Admin approval."
                );
                return;
            }
            if (user.approval_status === "Rejected") {
                showError(
                    "password",
                    "passwordError",
                    "Your Staff account registration was rejected by Admin."
                );
                return;
            }
        } else if (user.role === "courier") {
            // Check latest status in Staff courier store if available
            try {
                const staffStore = JSON.parse(localStorage.getItem("courierflow.staff.demo.v1") || "null");
                const matchCourier = staffStore?.couriers?.find(c => c.id === user.id || (c.email && c.email.toLowerCase() === email));
                if (matchCourier && matchCourier.approval_status) {
                    user.approval_status = matchCourier.approval_status;
                }
            } catch { /* ignore */ }

            if (user.approval_status === "Pending") {
                showError(
                    "password",
                    "passwordError",
                    "Your Courier account is pending Staff approval."
                );
                return;
            }
            if (user.approval_status === "Rejected") {
                showError(
                    "password",
                    "passwordError",
                    "Your Courier account registration was rejected by Staff."
                );
                return;
            }
        }

        // Demo session (not secure authentication)

        sessionStorage.setItem(
            "cms_current_user",
            JSON.stringify({
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role
            })
        );

        // Redirect according to user role

        if (user.role === "client") {
            window.location.href = "client.html";

        } else if (user.role === "courier") {
            window.location.href = "courier.html";

        } else if (user.role === "staff") {
            sessionStorage.setItem("courierflow.demo.role", "staff");
            window.location.href = "staff.html";

        } else if (user.role === "admin") {
            sessionStorage.setItem("courierflow.demo.role", "admin");
            window.location.href = "admin.html";
        }
    });
}

// Password visibility toggle
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", function() {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";

        const eyeIcon = togglePasswordBtn.querySelector(".eye-icon");
        const eyeOffIcon = togglePasswordBtn.querySelector(".eye-off-icon");

        if (eyeIcon && eyeOffIcon) {
            eyeIcon.style.display = isPassword ? "none" : "block";
            eyeOffIcon.style.display = isPassword ? "block" : "none";
        }

        const label = isPassword ? "Hide password" : "Show password";
        togglePasswordBtn.setAttribute("aria-label", label);
        togglePasswordBtn.setAttribute("title", label);
        passwordInput.focus();
    });
}

