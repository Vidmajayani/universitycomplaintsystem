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
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // REVEAL CONTENT
    document.getElementById("mainContent").classList.remove("hidden");

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
                <img src="${adminData.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover">
            `;
        }
    } else {
        profileImage.classList.add('hidden');
        defaultProfileIcon.classList.remove('hidden');
    }

    // Load Stats
    loadStats(adminData.id, adminData.adminrole);

    // --- ROLE-BASED ACCESS CONTROL (NAVIGATION) ---
    const navDashboard = document.getElementById('navDashboard') || document.getElementById('profileNavDashboard');
    const navAllComplaints = document.getElementById('navAllComplaints') || document.getElementById('profileNavAllComplaints');
    const navAnalytics = document.getElementById('navAnalytics') || document.getElementById('profileNavAnalytics');

    const mobileNavDashboard = document.getElementById('mobileNavDashboard') || document.getElementById('mobileProfileNavDashboard');
    const mobileNavAllComplaints = document.getElementById('mobileNavAllComplaints') || document.getElementById('mobileProfileNavAllComplaints');
    const mobileNavAnalytics = document.getElementById('mobileNavAnalytics') || document.getElementById('mobileProfileNavAnalytics');

    if (adminData.adminrole === 'LostAndFound Admin') {
        // Update Dashboard Links
        if (navDashboard) navDashboard.href = 'AdminLostFoundDashboard.html';
        if (mobileNavDashboard) mobileNavDashboard.href = 'AdminLostFoundDashboard.html';

        // Update All Complaints to Manage Items
        if (navAllComplaints) {
            navAllComplaints.textContent = 'Manage Items';
            navAllComplaints.href = 'AdminLostFound.html';
        }
        if (mobileNavAllComplaints) {
            mobileNavAllComplaints.innerHTML = '<i class="fas fa-box-open w-6 mr-3 text-lg"></i> Manage Items';
            mobileNavAllComplaints.href = 'AdminLostFound.html';
        }

        // Hide Analytics Links
        if (navAnalytics) navAnalytics.style.display = 'none';
        if (mobileNavAnalytics) mobileNavAnalytics.style.display = 'none';

        // Update Footer Navigation
        const footerNavDashboard = document.getElementById('footerNavDashboard');
        const footerNavAllComplaints = document.getElementById('footerNavAllComplaints');
        const footerNavAnalytics = document.getElementById('footerNavAnalytics');

        if (footerNavDashboard) footerNavDashboard.href = 'AdminLostFoundDashboard.html';
        if (footerNavAllComplaints) {
            const span = footerNavAllComplaints.querySelector('span');
            const icon = footerNavAllComplaints.querySelector('i');
            if (span) span.textContent = 'Manage Items';
            if (icon) icon.className = 'fas fa-search';
            footerNavAllComplaints.href = 'AdminLostFound.html';
        }
        if (footerNavAnalytics) footerNavAnalytics.style.display = 'none';

        // Update Footer Title and Description
        const adminFooterTitle = document.querySelector('footer h2');
        const adminFooterDesc = document.querySelector('footer p');
        if (adminFooterTitle) {
            adminFooterTitle.textContent = 'ComplaNet Lost & Found';
            adminFooterTitle.className = 'text-2xl font-heading font-bold mb-3 text-[var(--color-blue-btn)] dark:text-blue-400';
        }
        if (adminFooterDesc) {
            adminFooterDesc.textContent = 'Administrative portal for managing university lost and found items. Monitor, verify, and resolve reports efficiently.';
        }

        // Update Stats Label
        const statsLabel = document.querySelector('.bg-gray-50.dark\\:bg-gray-700\\/50 p');
        if (statsLabel && statsLabel.textContent === 'Complaints Handled') {
            statsLabel.textContent = 'Items Handled';
        }
    }
}

// ------------------------
//  LOAD STATISTICS
// ------------------------
async function loadStats(adminId, adminRole) {
    try {
        let count = 0;

        if (adminRole === 'LostAndFound Admin') {
            // Count lost & found items handled by this admin
            // Count from lost_and_found table where admin_id matches
            const { count: lostCount, error: lostError } = await supabase
                .from('lost_and_found')
                .select('item_id', { count: 'exact', head: true })
                .eq('admin_id', adminId);

            if (lostError) throw lostError;

            // Count from found_items table where admin_id matches
            const { count: foundCount, error: foundError } = await supabase
                .from('found_items')
                .select('found_item_id', { count: 'exact', head: true })
                .eq('admin_id', adminId);

            if (foundError) throw foundError;

            count = (lostCount || 0) + (foundCount || 0);
        } else {
            // For other admins, count complaints
            let query = supabase.from('complaint').select('complaintid', { count: 'exact', head: true });

            // If NOT master admin, only count assigned complaints
            if (adminRole !== 'Master Admin') {
                query = query.eq('adminid', adminId);
            }

            const { count: complaintCount, error } = await query;

            if (error) throw error;

            count = complaintCount || 0;
        }

        totalHandledEl.textContent = count;

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

    // Modal Action Listeners
    const modal = document.getElementById('logoutModal');
    if (modal) {
        const cancelBtn = document.getElementById('cancelLogoutBtn');
        const confirmBtn = document.getElementById('confirmLogoutBtn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Error signing out:', error);
                window.location.href = 'Login.html';
            });
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }


    // Mobile Logout Interception
    const mobileLogoutWait = setInterval(() => {
        const mobileLogout = document.querySelector('#mobileMenu a[href="Login.html"]');
        if (mobileLogout) {
            mobileLogout.addEventListener('click', handleLogout);
            clearInterval(mobileLogoutWait);
        } else if (document.readyState === 'complete') {
            const lastTry = document.querySelector('#mobileMenu a[href="Login.html"]');
            if (lastTry) lastTry.addEventListener('click', handleLogout);
            clearInterval(mobileLogoutWait);
        }
    }, 100);
}

function handleLogout(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('hidden');
}
