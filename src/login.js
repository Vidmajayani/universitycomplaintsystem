import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // CHECK IF USER IS ALREADY LOGGED IN
    // If yes, redirect to appropriate dashboard
    // ============================================
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
        const userId = session.user.id;

        // Check if user is an Admin
        const { data: adminData } = await supabase
            .from('admin')
            .select('id, adminrole')
            .eq('id', userId)
            .single();

        if (adminData) {
            // User is already logged in as Admin
            if (adminData.adminrole === 'LostAndFound Admin') {
                window.location.href = 'AdminLostFoundDashboard.html';
            } else {
                window.location.href = 'AdminDashboard.html';
            }
            return;
        }

        // Check if user is a regular User
        const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userData) {
            // User is already logged in as regular User
            window.location.href = 'UserDashboard.html';
            return;
        }
    }
    // ============================================

    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.classList.remove('hidden');
                eyeOffIcon.classList.add('hidden');
            } else {
                passwordInput.type = 'password';
                eyeIcon.classList.add('hidden');
                eyeOffIcon.classList.remove('hidden');
            }
        });
    }
});

const loginError = document.getElementById('loginError');
const errorText = document.getElementById('errorText');

function showError(message) {
    if (loginError && errorText) {
        errorText.textContent = message;
        loginError.classList.remove('hidden');
        // Simple shake animation if already visible
        loginError.classList.remove('animate-shake');
        void loginError.offsetWidth; // Trigger reflow
        loginError.classList.add('animate-shake');
    } else {
        alert(message);
    }
}

function hideError() {
    if (loginError) {
        loginError.classList.add('hidden');
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }

    // Check network connectivity first
    if (!navigator.onLine) {
        showError('Cannot connect to server. Please check your internet connection.');
        return;
    }

    if (!import.meta.env.VITE_SUPABASE_KEY) {
        showError('Configuration error: Supabase key missing.');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Supabase Auth Error:', error);

            // Handle network errors that might occur during the request
            if (error.message.includes('fetch') || error.message.includes('network')) {
                showError('Cannot connect to server. Please check your internet connection.');
                return;
            }

            // Map server maintenance/errors (500+)
            if (error.status >= 500) {
                showError('University service temporarily unavailable. Please try again in a few minutes.');
                return;
            }

            // Map specific error messages
            switch (error.status) {
                case 400:
                    if (error.message.includes('invalid_credentials') || error.message.toLowerCase().includes('invalid login credentials')) {
                        showError('Invalid credentials, please try again!');
                    } else if (error.message.includes('Email not confirmed')) {
                        showError('Please confirm your email address before logging in.');
                    } else {
                        showError('Invalid login details. Please check your email and password.');
                    }
                    break;
                case 422:
                    showError('Please enter a valid university email address.');
                    break;
                case 429:
                    showError('Too many failed attempts. Please try again later.');
                    break;
                default:
                    showError(error.message || 'Login failed. Please try again.');
            }
            return;
        }

        if (!data || !data.user) {
            showError('Authentication failed: No user profile found.');
            return;
        }

        const userId = data.user.id;

        // 1. Check if user is an Admin
        const { data: adminData } = await supabase
            .from('admin')
            .select('adminfirstname, adminlastname, adminrole')
            .eq('id', userId)
            .single();

        if (adminData) {
            // User is an Admin
            localStorage.setItem("isAdminLoggedIn", "true");
            localStorage.setItem("adminId", userId);
            localStorage.setItem("adminFirstName", adminData.adminfirstname);
            localStorage.setItem("adminLastName", adminData.adminlastname);
            localStorage.setItem("adminRole", adminData.adminrole);

            if (adminData.adminrole === 'LostAndFound Admin') {
                window.location.href = 'AdminLostFoundDashboard.html';
            } else {
                window.location.href = 'AdminDashboard.html';
            }
            return;
        }

        // 2. Check if user is a regular User(Student or Staff)
        const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name, username')
            .eq('id', userId)
            .single();

        if (userData) {
            // User is a regular User
            localStorage.setItem("userId", userId);
            localStorage.setItem("firstName", userData.first_name);
            localStorage.setItem("lastName", userData.last_name);
            localStorage.setItem("username", userData.username);

            window.location.href = 'UserDashboard.html';
            return;
        }

        // If neither found
        showError('Login successful, but no associated profile found.');
        await supabase.auth.signOut();

    } catch (err) {
        console.error('Unexpected login error:', err);
        showError('An unexpected error occurred. Please try again.');
    }
});
