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
            .select('id')
            .eq('id', userId)
            .single();

        if (adminData) {
            // User is already logged in as Admin
            window.location.href = 'AdminDashboard.html';
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

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!import.meta.env.VITE_SUPABASE_KEY) {
        alert('Supabase key missing! Check .env and restart server.');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert('Login failed: ' + error.message);
            return;
        }

        if (!data || !data.user) {
            alert('Login failed: No user data returned.');
            return;
        }

        const userId = data.user.id;

        // 1. Check if user is an Admin
        const { data: adminData, error: adminError } = await supabase
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

            window.location.href = 'AdminDashboard.html';
            return;
        }

        // 2. Check if user is a regular User(Student or Staff)
        const { data: userData, error: userError } = await supabase
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
        alert('Login successful, but no profile found in Admin or Users table.');
        await supabase.auth.signOut();

    } catch (err) {
        console.error('Login error:', err);
        alert('Unexpected error: ' + err.message);
    }
});
