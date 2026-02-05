// Admin Dashboard JavaScript - Backend Integration with Supabase
import { supabase } from './supabaseClient.js';
import { getTrendingAlerts } from './trend-alerts-api.js';

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
    setupTrendAlerts(); // Initialize Trend Alerts
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
    const navDashboard = document.getElementById('navDashboard');
    const navAllComplaints = document.getElementById('navAllComplaints');
    const navAnalytics = document.getElementById('navAnalytics');
    const mobileNavDashboard = document.getElementById('mobileNavDashboard');
    const mobileNavAllComplaints = document.getElementById('mobileNavAllComplaints');
    const mobileNavAnalytics = document.getElementById('mobileNavAnalytics');

    if (adminRole === 'LostAndFound Admin') {
        // Update Dashboard Links
        if (navDashboard) navDashboard.href = 'AdminLostFoundDashboard.html';
        if (mobileNavDashboard) mobileNavDashboard.href = 'AdminLostFoundDashboard.html';

        // Update All Complaints to Manage Items
        if (navAllComplaints) {
            navAllComplaints.textContent = 'Manage Items';
            navAllComplaints.href = 'AdminLostFound.html';
        }
        if (mobileNavAllComplaints) {
            mobileNavAllComplaints.textContent = 'Manage Items';
            mobileNavAllComplaints.href = 'AdminLostFound.html';
        }

        // Hide Analytics
        if (navAnalytics) navAnalytics.style.display = 'none';
        if (mobileNavAnalytics) mobileNavAnalytics.style.display = 'none';

    } else if (adminRole === 'Master Admin') {
        // Master Admin can see everything
    }

    // Load complaints for this admin
    loadAdminComplaints();

    // Load trend alerts for this admin
    loadTrendAlerts();
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

        // Update summary boxes (still counts deleted ones)
        updateStatistics(allComplaints);

        // Render Recent Activity (Top 5 ACTIVE complaints only)
        const activeComplaints = allComplaints.filter(c => c.complaintstatus !== 'Deleted');
        renderRecentActivity(activeComplaints.slice(0, 5));

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

// ------------------------
//  TREND ALERTS SYSTEM
// ------------------------
function setupTrendAlerts() {
    // No time period selector - analyzing all complaints
}

async function loadTrendAlerts() {
    if (!adminRole) {
        console.log('Admin role not yet loaded, skipping trend alerts');
        return;
    }

    // Hide trend alerts for General Admin (Other category has no subcategories)
    if (adminRole === 'General Admin') {
        const trendAlertsSection = document.getElementById('trendAlertsSection');
        if (trendAlertsSection) {
            trendAlertsSection.style.display = 'none';
        }
        return;
    }

    const container = document.getElementById('trendAlertsContainer');

    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-3xl text-gray-400 mb-3"></i>
            <p class="text-gray-500 dark:text-gray-400">Analyzing complaint patterns...</p>
        </div>
    `;


    const days = 36500; // Analyze ALL complaints (100 years)
    const threshold = 10; // Minimum complaints to trigger alert

    console.log(`🔍 Loading trend alerts for ${adminRole}, last ${days} days, threshold: ${threshold}`);

    try {
        const alerts = await getTrendingAlerts(adminRole, days, threshold);

        console.log(`✅ Got ${alerts.length} alerts:`, alerts);

        if (alerts.length === 0) {
            // Show "All Clear" message
            const noAlertsTemplate = document.getElementById('noAlertsTemplate');
            if (noAlertsTemplate) {
                container.innerHTML = '';
                const clone = noAlertsTemplate.content.cloneNode(true);
                container.appendChild(clone);
            }
        } else {
            // Render alert cards
            container.innerHTML = '';
            alerts.forEach(alert => {
                renderAlertCard(alert, container);
            });
        }
    } catch (error) {
        console.error('Error loading trend alerts:', error);
        container.innerHTML = `
            <div class="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-3"></i>
                <p class="text-red-600 dark:text-red-400">Error loading trend alerts. Please try again later.</p>
            </div>
        `;
    }
}

function renderAlertCard(alert, container) {
    const template = document.getElementById('alertCardTemplate');
    if (!template) return;

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.alert-card');

    // Set severity border color
    const borderColors = {
        'critical': 'border-red-500',
        'high': 'border-orange-500',
        'warning': 'border-yellow-500'
    };
    card.classList.add(borderColors[alert.severity] || 'border-yellow-500');

    // Set icon
    clone.querySelector('.alert-icon').textContent = alert.severityIcon;

    // Set severity label
    const severityLabel = clone.querySelector('.alert-severity-label');
    const severityColors = {
        'critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'warning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    severityLabel.textContent = alert.severityIcon + ' ' + (alert.severity === 'critical' ? 'CRITICAL' : alert.severity === 'high' ? 'HIGH PRIORITY' : 'ATTENTION NEEDED');
    severityLabel.className = `alert-severity-label text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${severityColors[alert.severity]}`;

    // Set title
    const title = alert.location
        ? `${alert.subcategory} - ${alert.location}${alert.floor ? ' (' + alert.floor + ')' : ''}`
        : alert.subcategory;
    clone.querySelector('.alert-title').textContent = title;

    // Set count badge
    const countBadge = clone.querySelector('.alert-count-badge div:first-child');
    const countColors = {
        'critical': 'text-red-600 dark:text-red-400',
        'high': 'text-orange-600 dark:text-orange-400',
        'warning': 'text-yellow-600 dark:text-yellow-400'
    };
    countBadge.textContent = alert.count;
    countBadge.className = `text-3xl font-bold ${countColors[alert.severity]}`;

    // Set urgency message
    const urgencyMessage = clone.querySelector('.alert-urgency-message');
    const urgencyBgColors = {
        'critical': 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800',
        'high': 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800',
        'warning': 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
    };
    urgencyMessage.innerHTML = alert.urgencyMessage;
    urgencyMessage.className = `alert-urgency-message p-4 rounded-lg mb-4 ${urgencyBgColors[alert.severity]} text-gray-800 dark:text-gray-200 font-medium text-sm`;

    // Set detailed message
    clone.querySelector('.alert-detailed-message').innerHTML = alert.detailedMessage;

    // Render action items
    const actionItemsContainer = clone.querySelector('.alert-action-items');
    alert.actionItems.forEach(action => {
        renderActionItem(action, actionItemsContainer);
    });

    container.appendChild(clone);
}

function renderActionItem(action, container) {
    // Simple text display without template
    const actionDiv = document.createElement('div');
    actionDiv.className = 'p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500';

    const messageP = document.createElement('p');
    messageP.className = 'text-sm text-gray-700 dark:text-gray-300 leading-relaxed';
    messageP.innerHTML = `<i class="fas fa-info-circle text-blue-500 mr-2"></i>${action.message}`;

    actionDiv.appendChild(messageP);
    container.appendChild(actionDiv);
}
