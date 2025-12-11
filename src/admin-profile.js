// Admin Profile Logic
import { supabase } from './supabaseClient.js';

// DOM Elements
const adminNameEl = document.getElementById('adminName');
const adminRoleEl = document.getElementById('adminRole');
const adminEmailEl = document.getElementById('adminEmail');
const adminIdEl = document.getElementById('adminId');
const totalHandledEl = document.getElementById('totalHandled');
const logoutBtn = document.getElementById('logoutBtn');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');

// Profile Pic Elements
const defaultProfileIcon = document.getElementById('defaultProfileIcon');
const profileImage = document.getElementById('profileImage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();
    setupEventListeners();
});

// ------------------------
//  CHECK ADMIN SESSION & LOAD DATA
// ------------------------
async function checkAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // Get admin details
    const { data: adminData, error } = await supabase
        .from('admin')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !adminData) {
        console.error('Error fetching admin data:', error);
        alert('Failed to load profile.');
        return;
    }

    // Populate Profile Fields
    adminNameEl.textContent = `${adminData.adminfirstname} ${adminData.adminlastname}`;
    adminRoleEl.textContent = adminData.adminrole;
    adminEmailEl.textContent = adminData.adminemail;
    adminIdEl.textContent = adminData.id;

    // Handle Profile Pic (Read-Only)
    if (adminData.profile_pic) {
        // Main Profile Card Image
        profileImage.src = adminData.profile_pic;
        profileImage.classList.remove('hidden');
        defaultProfileIcon.classList.add('hidden');

        // Header Profile Icon (Standardized)
        const profileBtn = document.getElementById('profileButton');
        if (profileBtn) {
            profileBtn.innerHTML = `
                <img src="${adminData.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm">
            `;
        }
    } else {
        profileImage.classList.add('hidden');
        defaultProfileIcon.classList.remove('hidden');
    }

    // Load Stats
    loadStats(adminData.id, adminData.adminrole);
}

// ------------------------
//  LOAD STATISTICS
// ------------------------
async function loadStats(adminId, adminRole) {
    try {
        let query = supabase.from('complaint').select('complaintid', { count: 'exact', head: true });

        // If NOT master admin, only count assigned complaints
        if (adminRole !== 'Master Admin') {
            query = query.eq('adminid', adminId);
        }

        const { count, error } = await query;

        if (error) throw error;

        totalHandledEl.textContent = count || 0;

    } catch (err) {
        console.error('Error loading stats:', err);
        totalHandledEl.textContent = '-';
    }
}

// ------------------------
//  EVENT LISTENERS
// ------------------------
function setupEventListeners() {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (headerLogoutBtn) {
        headerLogoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
        alert('Failed to log out.');
    } else {
        window.location.href = 'Login.html';
    }
}
