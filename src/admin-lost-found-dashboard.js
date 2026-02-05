// Admin Dashboard JavaScript - Backend Integration with Supabase
import { supabase } from './supabaseClient.js';

// Global variables
let adminId = null;
let adminRole = null;
let allComplaints = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    checkAdminSession();
    setupEventListeners();
    setupNotepad(); // Initialize Notepad
});

// Make function global for HTML onclick access
window.navigateToComplaints = function (status) {
    if (status) {
        window.location.href = `AllComplaints.html?status=${status}`;
    } else {
        window.location.href = 'AllComplaints.html';
    }
};


// ------------------------
//  CHECK ADMIN SESSION
// ------------------------
async function checkAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        alert('You are not logged in. Redirecting to login page...');
        window.location.href = 'Login.html';
        return;
    }

    // Get admin details
    const { data: adminData, error } = await supabase
        .from('admin')
        .select('id, adminfirstname, adminlastname, adminrole, profile_pic')
        .eq('id', session.user.id)
        .single();

    if (error || !adminData) {
        alert('Access denied. You are not an admin.');
        window.location.href = 'Login.html';
        return;
    }

    adminId = adminData.id;
    adminRole = adminData.adminrole;

    // Display personalized welcome message
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');

    if (welcomeTitle) {
        welcomeTitle.textContent =
            `Welcome, ${adminData.adminfirstname} ${adminData.adminlastname}`;
    }

    if (welcomeSubtitle) {
        welcomeSubtitle.textContent =
            `${adminData.adminrole} Dashboard — Manage and monitor all ${adminData.adminrole.toLowerCase()} complaints assigned to you.`;
    }

    // Update Profile Picture in Header
    const profileBtn = document.getElementById('profileButton');
    if (profileBtn && adminData.profile_pic) {
        profileBtn.innerHTML = `
            <img src="${adminData.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover">
        `;
    }

    // --- ROLE-BASED ACCESS CONTROL (NAVIGATION) ---
    const navAllComplaints = document.getElementById('navAllComplaints');
    const navLostFound = document.getElementById('navLostFound');
    const mobileNavAllComplaints = document.getElementById('mobileNavAllComplaints');
    const mobileNavLostFound = document.getElementById('mobileNavLostFound');

    // Default: Show all
    if (navAllComplaints) navAllComplaints.style.display = 'block';
    if (navLostFound) navLostFound.style.display = 'block';
    if (mobileNavAllComplaints) mobileNavAllComplaints.style.display = 'block';
    if (mobileNavLostFound) mobileNavLostFound.style.display = 'block';


    if (adminRole === 'LostAndFound Admin') {
        // LostAndFound Admin: Can only see Lost & Found. CANNOT see All Complaints.
        if (navAllComplaints) navAllComplaints.style.display = 'none';
        if (mobileNavAllComplaints) mobileNavAllComplaints.style.display = 'none';

        // Ensure Lost & Found is visible
        if (navLostFound) navLostFound.style.display = 'block';
        if (mobileNavLostFound) mobileNavLostFound.style.display = 'block';

    } else if (adminRole === 'Master Admin') {
        // Master Admin: Can see EVERYTHING.
        // (Default state is fine)

    } else {
        // Other Admins (Academic, Technical, etc.):
        // Can see All Complaints (likely needed for their work or general view).
        // CANNOT see Lost & Found.
        if (navLostFound) navLostFound.style.display = 'none';
        if (mobileNavLostFound) mobileNavLostFound.style.display = 'none';
    }

    // Load complaints for this admin
    loadAdminComplaints();
}


// ------------------------
//  LOAD ONLY ADMIN'S COMPLAINTS
// ------------------------
// ------------------------
//  LOAD LOST ITEMS
// ------------------------
async function loadAdminComplaints() {
    try {
        // Fetch all lost items
        let query = supabase
            .from('lost_and_found')
            .select('*');

        // Note: Currently assumes 'LostAndFound Admin' sees ALL lost items. 
        // If they should only see assigned ones, we'd add .eq('admin_id', adminId), 
        // but typically Lost & Found is shared or managed by a team.

        const { data: items, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching lost items:', error);
            return;
        }

        allComplaints = items || []; // Reuse variable name for simplicity

        // Update summary boxes
        updateStatistics(allComplaints);

        // Render Recent Activity (Top 5 ACTIVE items only)
        const activeItems = allComplaints.filter(c => c.status !== 'Deleted');
        renderRecentActivity(activeItems.slice(0, 5));

    } catch (err) {
        console.error('Unexpected error loading lost items:', err);
    }
}


// ------------------------
//  STATISTICS CARDS
// ------------------------
function updateStatistics(items) {
    const total = items.length;
    const lost = items.filter(c => c.status === 'Lost').length;
    const claim = items.filter(c => c.status === 'Claim').length;
    const found = items.filter(c => c.status === 'Found').length;
    const deleted = items.filter(c => c.status === 'Deleted').length;

    // Update UI
    document.getElementById('totalCount').textContent = total;
    document.getElementById('lostCount').textContent = lost;
    document.getElementById('claimCount').textContent = claim;
    document.getElementById('foundCount').textContent = found;

    if (document.getElementById('deletedCount')) {
        document.getElementById('deletedCount').textContent = deleted;
    }
}


// ------------------------
//  RENDER RECENT ACTIVITY
// ------------------------
function renderRecentActivity(items) {
    const tableBody = document.getElementById('recentActivityTable');
    const cardsContainer = document.getElementById('recentActivityCards');

    if (tableBody) tableBody.textContent = ''; // Clear table
    if (cardsContainer) cardsContainer.textContent = ''; // Clear cards

    if (items.length === 0) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-gray-500">No recent activity found.</td></tr>';
        if (cardsContainer) cardsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">No recent activity found.</p>';
        return;
    }

    items.forEach(item => {
        const date = new Date(item.created_at || item.reported_date).toLocaleDateString();

        // Status Badge Color
        let statusColor = 'bg-gray-200 text-gray-700';
        if (item.status === 'Lost') statusColor = 'bg-red-100 text-red-700';
        else if (item.status === 'Claim') statusColor = 'bg-yellow-100 text-yellow-700';
        else if (item.status === 'Found') statusColor = 'bg-green-100 text-green-700';
        else if (item.status === 'Deleted') statusColor = 'bg-gray-200 text-gray-600';

        // 1. Render Table Row (Desktop)
        if (tableBody) {
            const template = document.getElementById('recentActivityRowTemplate');
            if (template) {
                const clone = template.content.cloneNode(true);
                const row = clone.querySelector('tr');

                clone.querySelector('.col-title').textContent = item.item_name || 'Unnamed Item';
                clone.querySelector('.col-category').textContent = item.item_type || 'Unknown';
                clone.querySelector('.col-date').textContent = date;

                const statusSpan = clone.querySelector('.col-status');
                statusSpan.textContent = item.status;
                statusSpan.className = `col-status py-1 px-3 rounded-full text-xs font-semibold ${statusColor}`;

                const link = clone.querySelector('.col-link');
                link.href = `AdminLostFoundDetails.html?id=${item.item_id}`;

                tableBody.appendChild(clone);
            }
        }

        // 2. Render Card (Mobile)
        if (cardsContainer) {
            const template = document.getElementById('activityCardTemplate');
            if (template) {
                const cardClone = template.content.cloneNode(true);
                const card = cardClone.querySelector('div');

                card.querySelector('.card-title').textContent = item.item_name || 'Unnamed Item';

                const statusSpan = card.querySelector('.card-status');
                statusSpan.textContent = item.status;
                statusSpan.className = `card-status py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ml-2 ${statusColor}`;

                card.querySelector('.card-category').textContent = item.item_type || 'Unknown';
                card.querySelector('.card-date').textContent = date;

                const link = card.querySelector('.card-link');
                link.href = `AdminLostFoundDetails.html?id=${item.item_id}`;

                cardsContainer.appendChild(card);
            }
        }
    });
}

// ------------------------
//  EVENT LISTENERS (MENU, PROFILE, ETC.)
// ------------------------
// ------------------------
//  EVENT LISTENERS (MENU, PROFILE, ETC.)
// ------------------------
function setupEventListeners() {
    // Header Logout
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
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

// ------------------------
//  PERSONAL NOTEPAD LOGIC
// ------------------------
function setupNotepad() {
    const notepad = document.getElementById('adminNotepad');
    const saveStatus = document.getElementById('saveStatus');

    if (!notepad) return;

    // 1. Load saved notes locally
    const savedNotes = localStorage.getItem('admin_scratchpad_notes');
    if (savedNotes) {
        notepad.value = savedNotes;
    }

    // 2. Auto-save on input
    let timeoutId;
    notepad.addEventListener('input', () => {
        // Update status to "Saving..."
        saveStatus.textContent = "Saving...";

        // Clear previous timeout
        clearTimeout(timeoutId);

        // Debounce save (wait 500ms after typing stops)
        timeoutId = setTimeout(() => {
            localStorage.setItem('admin_scratchpad_notes', notepad.value);
            saveStatus.textContent = "Auto-saved";

            // Visual feedback (flash green/text)
            saveStatus.classList.add('text-green-600', 'dark:text-green-400');
            setTimeout(() => {
                saveStatus.classList.remove('text-green-600', 'dark:text-green-400');
            }, 1000);
        }, 500);
    });
}

