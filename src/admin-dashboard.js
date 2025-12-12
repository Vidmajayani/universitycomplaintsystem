// Admin Dashboard JavaScript - Backend Integration with Supabase
import { supabase } from './supabaseClient.js';

// Global variables
let adminId = null;
let adminRole = null;
let allComplaints = [];

// Initialize dashboard
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
            <img src="${adminData.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm">
        `;
    }

    // Load complaints for this admin
    loadAdminComplaints();
}


// ------------------------
//  LOAD ONLY ADMIN'S COMPLAINTS
// ------------------------
async function loadAdminComplaints() {
    try {
        // Build query based on admin role
        let query = supabase
            .from('complaint')
            .select('*');

        // Master Admin sees ALL complaints, others see only assigned
        if (adminRole !== 'Master Admin') {
            query = query.eq('adminid', adminId);
        }

        const { data: complaints, error } = await query.order('submitteddate', { ascending: false });

        if (error) {
            console.error('Error fetching complaints:', error);
            return;
        }

        // Fetch categories to map IDs to Names
        const { data: categories } = await supabase
            .from('category')
            .select('categoryid, categoryname');

        const categoryMap = {};
        if (categories) {
            categories.forEach(cat => {
                categoryMap[cat.categoryid] = cat.categoryname;
            });
        }

        allComplaints = (complaints || []).map(c => ({
            ...c,
            categoryName: categoryMap[c.categoryid] || 'Uncategorized'
        }));

        // Update summary boxes
        updateStatistics(allComplaints);

        // Render Recent Activity (Top 5)
        renderRecentActivity(allComplaints.slice(0, 5));

    } catch (err) {
        console.error('Unexpected error loading complaints:', err);
    }
}


// ------------------------
//  STATISTICS CARDS
// ------------------------
function updateStatistics(complaints) {
    const total = complaints.length;
    const pending = complaints.filter(c => c.complaintstatus === 'Pending').length;
    const inProgress = complaints.filter(c => c.complaintstatus === 'In-Progress').length;
    const resolved = complaints.filter(c => c.complaintstatus === 'Resolved').length;
    const deleted = complaints.filter(c => c.complaintstatus === 'Deleted').length;

    // Update UI
    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('inProgressCount').textContent = inProgress;
    document.getElementById('resolvedCount').textContent = resolved;
    if (document.getElementById('deletedCount')) {
        document.getElementById('deletedCount').textContent = deleted;
    }
    if (document.getElementById('deletedCount')) {
        document.getElementById('deletedCount').textContent = deleted;
    }
}

// ------------------------
//  RENDER RECENT ACTIVITY
// ------------------------
// ------------------------
//  RENDER RECENT ACTIVITY
// ------------------------
function renderRecentActivity(complaints) {
    const tableBody = document.getElementById('recentActivityTable');
    const cardsContainer = document.getElementById('recentActivityCards');

    if (tableBody) tableBody.textContent = ''; // Clear table
    if (cardsContainer) cardsContainer.textContent = ''; // Clear cards

    if (complaints.length === 0) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-gray-500">No recent activity found.</td></tr>';
        if (cardsContainer) cardsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">No recent activity found.</p>';
        return;
    }

    complaints.forEach(complaint => {
        const date = new Date(complaint.submitteddate).toLocaleDateString();

        // Status Badge Color
        let statusColor = 'bg-gray-200 text-gray-700';
        if (complaint.complaintstatus === 'Pending') statusColor = 'bg-yellow-100 text-yellow-700';
        else if (complaint.complaintstatus === 'In-Progress') statusColor = 'bg-purple-100 text-purple-700';
        else if (complaint.complaintstatus === 'Resolved') statusColor = 'bg-green-100 text-green-700';
        else if (complaint.complaintstatus === 'Deleted') statusColor = 'bg-gray-200 text-gray-600'; // Changed Deleted to Gray/Red

        // 1. Render Table Row (Desktop)
        if (tableBody) {
            const template = document.getElementById('recentActivityRowTemplate');
            if (template) {
                const clone = template.content.cloneNode(true);
                const row = clone.querySelector('tr');

                clone.querySelector('.col-title').textContent = complaint.complainttitle || 'Untitled';
                clone.querySelector('.col-category').textContent = complaint.categoryName;
                clone.querySelector('.col-date').textContent = date;

                const statusSpan = clone.querySelector('.col-status');
                statusSpan.textContent = complaint.complaintstatus;
                statusSpan.className = `col-status py-1 px-3 rounded-full text-xs font-semibold ${statusColor}`;

                const link = clone.querySelector('.col-link');
                link.href = `AdminComplaintDetails.html?id=${complaint.complaintid}`;

                tableBody.appendChild(clone);
            }
        }

        // 2. Render Card (Mobile)
        if (cardsContainer) {
            const template = document.getElementById('activityCardTemplate');
            if (template) {
                const cardClone = template.content.cloneNode(true);
                const card = cardClone.querySelector('div');

                card.querySelector('.card-title').textContent = complaint.complainttitle || 'Untitled';

                const statusSpan = card.querySelector('.card-status');
                statusSpan.textContent = complaint.complaintstatus;
                statusSpan.className = `card-status py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ml-2 ${statusColor}`;

                card.querySelector('.card-category').textContent = complaint.categoryName;
                card.querySelector('.card-date').textContent = date;

                const link = card.querySelector('.card-link');
                link.href = `AdminComplaintDetails.html?id=${complaint.complaintid}`;

                cardsContainer.appendChild(card);
            }
        }
    });
}

// ------------------------
//  EVENT LISTENERS (MENU, PROFILE, ETC.)
// ------------------------
function setupEventListeners() {
    // Mobile menu is handled by darkMode.js
    // Profile Menu is handled by darkMode.js
    // We only need to handle Logout here

    // Mobile menu is handled by darkMode.js

    // Header Logout
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
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

