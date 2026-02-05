import { supabase } from './supabaseClient.js'; // import for Supabase Client
import Chart from 'chart.js/auto'; // import for Chart.js
import jsPDF from 'jspdf'; // import for PDF Report Generation
import html2canvas from 'html2canvas'; // import for PDF Report Generation

// ==========================================
// STATE MANAGEMENT
// ==========================================
// These variables hold the application state during runtime
let adminId = null;          // ID of the currently logged-in admin
let adminRole = null;        // Role of the admin (e.g., 'Master Admin', 'Technical Admin')
let allComplaints = [];      // Stores ALL fetched complaints (raw data)
let filteredComplaints = []; // Stores complaints after applying date filters (used for charts)
let adminMap = {};           // Helper map to convert admin IDs to Role Names (for performance)
let charts = {};             // Stores Chart.js instances so we can update/destroy them

// Filter Configuration
// Tracks the currently active date filter
let filterState = {
    type: 'all',      // Current filter type: 'all', 'week', 'month', 'year', 'custom'
    startDate: null,  // Start date for custom filter
    endDate: null     // End date for custom filter
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate the difference in calendar days between two dates.
 * This ignores the time component and only counts midnight-to-midnight transitions.
 * 
 * Example: Dec 19 at 9:00 AM to Dec 20 at 10:00 AM = 1 day (not 25 hours)
 * 
 * @param {Date} startDate - The earlier date
 * @param {Date} endDate - The later date
 * @returns {number} Number of calendar days between the dates
 */
function getCalendarDaysDifference(startDate, endDate) {
    // Create new date objects set to midnight (00:00:00.000)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Calculate difference in milliseconds and convert to days
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
}

// ==========================================
// INITIALIZATION
// ==========================================
// Runs when the page is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // 2. Setup Event Listeners
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.onclick = generatePDFReport;
    }

    setupEventListeners();

    // 3. Start Authentication Flow
    checkAdminSession();
});

// ==========================================
// AUTHENTICATION & DATA LOADING
// ==========================================

/**
 * Checks if a user is logged in and verifies they are an admin.
 * Redirects to login page if not authenticated.
 */
async function checkAdminSession() {
    // Get current session from Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'Login.html'; // Redirect if not logged in
        return;
    }

    // Verify user exists in the 'admin' table
    const { data: adminData, error } = await supabase
        .from('admin')
        .select('id, adminrole, profile_pic')
        .eq('id', session.user.id)
        .single();

    if (error || !adminData) {
        alert('Access denied.'); // User is logged in but not an admin
        window.location.href = 'Login.html';
        return;
    }

    // Store admin details in state
    adminId = adminData.id;
    adminRole = adminData.adminrole;
    console.log(`Analytics loaded for Admin: ${adminRole}`);

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
    }

    // Proceed to load data
    await loadAnalyticsData();
}

/**
 * Fetches all necessary data from Supabase.
 * - Complaints
 * - User names (for display)
 * - Category names (for display)
 * - Admin roles (if Master Admin)
 */
async function loadAnalyticsData() {
    try {
        // 1. Fetch Complaints
        let query = supabase.from('complaint').select('*');

        // ROLE-BASED ACCESS CONTROL:
        // If NOT Master Admin, only fetch complaints assigned to this specific admin.
        if (adminRole !== 'Master Admin') {
            query = query.eq('adminid', adminId);
        }

        const { data: complaints, error } = await query;
        if (error) throw error;

        allComplaints = complaints || [];

        // 2. Fetch User Details (to show names instead of IDs)
        if (allComplaints.length > 0) {
            const userIds = [...new Set(allComplaints.map(c => c.complainantid))];
            const { data: users } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .in('id', userIds);

            if (users) {
                // Create a lookup map: ID -> "First Last"
                const userMap = {};
                users.forEach(u => {
                    userMap[u.id] = `${u.first_name} ${u.last_name}`;
                });
                // Attach names to complaint objects
                allComplaints = allComplaints.map(c => ({
                    ...c,
                    complainantName: userMap[c.complainantid] || 'Unknown'
                }));
            }
        }

        // 3. Fetch Category Details (to show names instead of IDs)
        if (allComplaints.length > 0) {
            const categoryIds = [...new Set(allComplaints.map(c => c.categoryid))].filter(Boolean);
            if (categoryIds.length > 0) {
                const { data: categories } = await supabase
                    .from('category')
                    .select('categoryid, categoryname')
                    .in('categoryid', categoryIds);

                if (categories) {
                    const categoryMap = {};
                    categories.forEach(cat => {
                        categoryMap[cat.categoryid] = cat.categoryname;
                    });
                    allComplaints = allComplaints.map(c => ({
                        ...c,
                        categoryName: categoryMap[c.categoryid] || 'Unknown'
                    }));
                }
            }
        }

        // 4. Fetch Admin Roles (Master Admin Only)
        // Used for the "Admin Performance" chart
        if (adminRole === 'Master Admin') {
            const { data: admins } = await supabase
                .from('admin')
                .select('id, adminrole');

            if (admins) {
                admins.forEach(a => {
                    adminMap[a.id] = a.adminrole;
                });
            }
        }

        // Initialize filtered data with everything and render
        filteredComplaints = [...allComplaints];
        renderAll();

    } catch (err) {
        console.error('Error loading analytics:', err);
        alert(`Failed to load analytics data: ${err.message}`);
    }
}

// ==========================================
// FILTERING LOGIC
// ==========================================

/**
 * Filters the `allComplaints` array based on the current `filterState`.
 * Updates `filteredComplaints` and re-renders the dashboard.
 */
function applyDateFilter() {
    if (filterState.type === 'all') {
        filteredComplaints = [...allComplaints]; // No filter, show everything
    } else {
        const now = new Date();
        let startDate, endDate;

        // Calculate start/end dates based on filter type
        if (filterState.type === 'week') {
            // Sri Lankan week: Monday to Sunday
            // getDay() returns: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
            const dayOfWeek = now.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; else go back (dayOfWeek - 1) days

            startDate = new Date(now);
            startDate.setDate(now.getDate() - daysFromMonday); // Start of this week (Monday)
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
        } else if (filterState.type === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of this month
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
        } else if (filterState.type === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st of this year
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
        } else if (filterState.type === 'custom') {
            startDate = filterState.startDate;
            endDate = filterState.endDate;
        }

        // Perform the actual filtering
        filteredComplaints = allComplaints.filter(c => {
            const submittedDate = new Date(c.submitteddate);
            return submittedDate >= startDate && submittedDate <= endDate;
        });
    }

    // Re-draw everything with the new data
    renderAll();
}

/**
 * Sets a quick filter (Week, Month, Year) from the UI buttons.
 * @param {string} type - 'week', 'month', or 'year'
 */
window.setQuickFilter = function (type) {
    filterState.type = type;
    filterState.startDate = null;
    filterState.endDate = null;

    // Reset custom date inputs
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';

    // Update the "Showing: ..." text
    const filterText = {
        'week': 'This Week',
        'month': 'This Month',
        'year': 'This Year'
    };
    document.getElementById('currentFilterText').innerHTML =
        `Showing: <span class="font-semibold text-eco">${filterText[type]}</span>`;

    applyDateFilter();
};

/**
 * Applies a custom date range filter from the date pickers.
 */
window.applyCustomFilter = function () {
    const startInput = document.getElementById('startDate').value;
    const endInput = document.getElementById('endDate').value;

    if (!startInput || !endInput) {
        alert('Please select both start and end dates');
        return;
    }

    filterState.type = 'custom';
    filterState.startDate = new Date(startInput);
    filterState.startDate.setHours(0, 0, 0, 0);
    filterState.endDate = new Date(endInput);
    filterState.endDate.setHours(23, 59, 59, 999);

    document.getElementById('currentFilterText').innerHTML =
        `Showing: <span class="font-semibold text-eco">${startInput} to ${endInput}</span>`;

    applyDateFilter();
};

/**
 * Resets all filters to show "All Time" data.
 */
window.resetFilter = function () {
    filterState.type = 'all';
    filterState.startDate = null;
    filterState.endDate = null;

    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';

    document.getElementById('currentFilterText').innerHTML =
        `Showing: <span class="font-semibold text-eco">All Time</span>`;

    applyDateFilter();
};

// ==========================================
// RENDERING (UI & CHARTS)
// ==========================================

/**
 * Master render function. Updates KPIs and all Charts.
 */
function renderAll() {
    renderKPIs();
    renderCharts();
}

/**
 * Calculates and updates the Key Performance Indicator (KPI) cards at the top.
 */
function renderKPIs() {
    const total = filteredComplaints.length;
    const pending = filteredComplaints.filter(c => c.complaintstatus === 'Pending').length;
    const inProgress = filteredComplaints.filter(c => c.complaintstatus === 'In-Progress').length;
    const resolved = filteredComplaints.filter(c => c.complaintstatus === 'Resolved').length;
    const deleted = filteredComplaints.filter(c => c.complaintstatus === 'Deleted').length;

    // Calculate percentages
    const pendingPercent = total > 0 ? ((pending / total) * 100).toFixed(1) : 0;
    const inProgressPercent = total > 0 ? ((inProgress / total) * 100).toFixed(1) : 0;
    const resolvedPercent = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;
    const deletedPercent = total > 0 ? ((deleted / total) * 100).toFixed(1) : 0;

    // Calculate Average Resolution Time (in days)
    const resolvedComplaints = filteredComplaints.filter(c => c.complaintstatus === 'Resolved');
    let avgResolution = 0;
    if (resolvedComplaints.length > 0) {
        const totalDays = resolvedComplaints.reduce((sum, c) => {
            const submitted = new Date(c.submitteddate);
            const now = new Date(); // Note: Ideally this should be resolution date, using 'now' as proxy if missing
            // Use calendar days (midnight to midnight) instead of exact 24-hour periods
            const days = getCalendarDaysDifference(submitted, now);
            return sum + days;
        }, 0);
        avgResolution = Math.round(totalDays / resolvedComplaints.length);
    }

    // Update DOM elements
    document.getElementById('totalComplaints').textContent = total;
    document.getElementById('totalTrend').textContent = filterState.type === 'all' ? '↑ All time' : '📅 Filtered';

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('pendingPercent').textContent = `${pendingPercent}%`;

    document.getElementById('inProgressCount').textContent = inProgress;
    document.getElementById('inProgressPercent').textContent = `${inProgressPercent}%`;

    document.getElementById('resolvedCount').textContent = resolved;
    document.getElementById('resolvedPercent').textContent = `${resolvedPercent}%`;

    // New Deleted Stats
    const deletedCountEl = document.getElementById('deletedCount');
    const deletedPercentEl = document.getElementById('deletedPercent');
    if (deletedCountEl) deletedCountEl.textContent = deleted;
    if (deletedPercentEl) deletedPercentEl.textContent = `${deletedPercent}%`;

    document.getElementById('avgResolution').textContent = avgResolution;
}

/**
 * Renders all charts using Chart.js.
 * Handles role-based visibility logic.
 */
function renderCharts() {
    // Theme colors for Dark/Light mode
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    // 1. Render Common Charts (Visible to ALL Admins)
    renderStatusChart(textColor, gridColor);
    renderTrendChart(textColor, gridColor);
    renderDailyTrendChart(textColor, gridColor);
    renderResolutionChart(textColor, gridColor); // Available to all admins

    // 2. Handle Master Admin Only Charts
    const categoryContainer = document.getElementById('categoryChartContainer');
    const resolutionContainer = document.getElementById('resolutionChartContainer');
    const adminPerformanceContainer = document.getElementById('adminPerformanceContainer');
    const activeIssuesContainer = document.getElementById('activeIssuesContainer');

    // Ensure Resolution chart container is always visible (it was previously restricted)
    if (resolutionContainer) resolutionContainer.style.display = 'block';

    if (adminRole === 'Master Admin') {
        // Show Master Admin containers
        if (categoryContainer) categoryContainer.style.display = 'block';
        if (adminPerformanceContainer) adminPerformanceContainer.style.display = 'block';
        if (activeIssuesContainer) activeIssuesContainer.style.display = 'block';

        // Render Master Admin charts
        renderCategoryChart(textColor, gridColor);
        renderAdminPerformanceChart(textColor, gridColor);
        renderCategoryStatus(); // "Active Issues" list
    } else {
        // Hide Master Admin containers for other roles
        if (categoryContainer) categoryContainer.style.display = 'none';
        if (adminPerformanceContainer) adminPerformanceContainer.style.display = 'none';
        if (activeIssuesContainer) activeIssuesContainer.style.display = 'none';
    }
}

// ---------------------------------------------------------
// INDIVIDUAL CHART FUNCTIONS
// ---------------------------------------------------------

// 1. Status Distribution (Doughnut Chart)
function renderStatusChart(textColor, gridColor) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    if (charts.status) charts.status.destroy(); // Destroy old chart before creating new one

    const pending = filteredComplaints.filter(c => c.complaintstatus === 'Pending').length;
    const inProgress = filteredComplaints.filter(c => c.complaintstatus === 'In-Progress').length;
    const resolved = filteredComplaints.filter(c => c.complaintstatus === 'Resolved').length;
    const deleted = filteredComplaints.filter(c => c.complaintstatus === 'Deleted').length;

    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'In Progress', 'Resolved', 'Deleted'],
            datasets: [{
                data: [pending, inProgress, resolved, deleted],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)', // Red
                    'rgba(234, 179, 8, 0.8)', // Yellow
                    'rgba(34, 197, 94, 0.8)', // Green
                    'rgba(107, 114, 128, 0.8)' // Gray for Deleted
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(107, 114, 128, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
            }
        }
    });
}

// 2. Category Distribution (Bar Chart) - Master Admin Only
function renderCategoryChart(textColor, gridColor) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    if (charts.category) charts.category.destroy();

    const categories = [...new Set(filteredComplaints.map(c => c.categoryName).filter(Boolean))].sort();
    const counts = categories.map(cat => filteredComplaints.filter(c => c.categoryName?.toLowerCase() === cat.toLowerCase()).length);

    const colors = ['rgba(168, 85, 247, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(234, 179, 8, 0.8)'];
    const bgColors = categories.map((_, i) => colors[i % colors.length]);

    charts.category = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Complaints',
                data: counts,
                backgroundColor: bgColors,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}

// 3. Monthly Trend (Line Chart)
function renderTrendChart(textColor, gridColor) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (charts.trend) charts.trend.destroy();

    const months = [];
    const counts = [];
    const now = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthName);
        const count = filteredComplaints.filter(c => {
            const cDate = new Date(c.submitteddate);
            return cDate.getMonth() === date.getMonth() && cDate.getFullYear() === date.getFullYear();
        }).length;
        counts.push(count);
    }

    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Complaints',
                data: counts,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}

// 4. Resolution Time by Category (Bar Chart) - Available to ALL Admins
function renderResolutionChart(textColor, gridColor) {
    const ctx = document.getElementById('resolutionChart');
    if (!ctx) return;
    if (charts.resolution) charts.resolution.destroy();

    const categories = [...new Set(filteredComplaints.map(c => c.categoryName).filter(Boolean))].sort();

    // Calculate average days to resolve for each category
    const avgTimes = categories.map(cat => {
        const catComplaints = filteredComplaints.filter(c => c.categoryName?.toLowerCase() === cat.toLowerCase() && c.complaintstatus === 'Resolved');
        if (catComplaints.length === 0) return 0;
        // Use calendar days (midnight to midnight) instead of exact 24-hour periods
        const totalDays = catComplaints.reduce((sum, c) => sum + getCalendarDaysDifference(new Date(c.submitteddate), new Date()), 0);
        return Math.round(totalDays / catComplaints.length);
    });

    const colors = ['rgba(168, 85, 247, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(234, 179, 8, 0.8)'];
    const bgColors = categories.map((_, i) => colors[i % colors.length]);

    charts.resolution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Days',
                data: avgTimes,
                backgroundColor: bgColors,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}

// 5. Daily Trend Chart (Bar Chart) - Shows complaints by Day of Week
function renderDailyTrendChart(textColor, gridColor) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    if (charts.daily) charts.daily.destroy();

    // Days starting from Monday (Sri Lankan/International standard)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = new Array(7).fill(0);

    filteredComplaints.forEach(c => {
        const dayIndex = new Date(c.submitteddate).getDay();
        // Remap: getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
        // We want: 0=Mon, 1=Tue, ..., 6=Sun
        const remappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        counts[remappedIndex]++;
    });

    charts.daily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Complaints',
                data: counts,
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}

// 6. Admin Performance Chart (Bar Chart) - Master Admin Only
function renderAdminPerformanceChart(textColor, gridColor) {
    const ctx = document.getElementById('adminChart');
    if (!ctx) return;
    if (charts.admin) charts.admin.destroy();

    // Group resolved complaints by admin role
    const roleCounts = {};
    filteredComplaints.forEach(c => {
        if (c.adminid && c.complaintstatus === 'Resolved') {
            const role = adminMap[c.adminid] || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        }
    });

    const roles = Object.keys(roleCounts).sort();
    const resolvedCounts = roles.map(role => roleCounts[role]);

    charts.admin = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roles,
            datasets: [{
                label: 'Resolved Complaints',
                data: resolvedCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}

// Dark Mode Observer: Re-renders charts when theme changes
const observer = new MutationObserver(() => {
    if (Object.keys(charts).length > 0) renderCharts();
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// 7. Active Issues List (Data Binding) - Master Admin Only
function renderCategoryStatus() {
    const activeComplaints = filteredComplaints.filter(c => c.complaintstatus !== 'Resolved');
    const totalActive = activeComplaints.length;
    const noDataMsg = document.getElementById('noActiveComplaintsMsg');

    // Reset UI
    document.querySelectorAll('.category-row').forEach(row => row.classList.add('hidden'));

    if (totalActive === 0) {
        if (noDataMsg) {
            noDataMsg.classList.remove('hidden');
            noDataMsg.classList.add('flex');
        }
        return;
    } else {
        if (noDataMsg) {
            noDataMsg.classList.add('hidden');
            noDataMsg.classList.remove('flex');
        }
    }

    // Count active issues per category
    const categoryCounts = {};
    activeComplaints.forEach(c => {
        const cat = c.categoryName || 'Uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Update progress bars in the UI
    Object.entries(categoryCounts).forEach(([cat, count]) => {
        let selector = `.category-row[data-category="${cat}"]`;
        let row = document.querySelector(selector);
        if (!row) row = document.querySelector('.category-row[data-category="Other"]');

        if (row) {
            const percentage = Math.round((count / totalActive) * 100);
            const countSpan = row.querySelector('.category-count');
            if (countSpan) countSpan.textContent = `${count} (${percentage}%)`;
            const bar = row.querySelector('.category-bar');
            if (bar) bar.style.width = `${percentage}%`;
            row.classList.remove('hidden');
        }
    });
}

// ==========================================
// LOGOUT LOGIC
// ==========================================
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

// ==========================================
// PDF REPORT GENERATION
// ==========================================
async function generatePDFReport() {
    try {
        const button = document.getElementById('downloadPdfBtn');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Generating PDF...</span>';

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPosition = 20;

        // 1. Add Header
        pdf.setFontSize(20);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        pdf.text(`Generated: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
        pdf.text(`Admin: ${adminRole}`, pageWidth / 2, yPosition + 5, { align: 'center' });

        // Add current filter info
        const filterText = document.getElementById('currentFilterText').textContent;
        pdf.text(filterText, pageWidth / 2, yPosition + 10, { align: 'center' });

        yPosition += 20;
        pdf.setLineWidth(0.5);
        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 10;

        // 2. Add KPI Section (Screenshot)
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Key Performance Indicators', 20, yPosition);
        yPosition += 8;

        // Determine PDF generation options based on device
        const isMobile = window.innerWidth <= 1366;
        const canvasOptions = {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        };

        if (isMobile) {
            canvasOptions.windowWidth = 1440;
        }

        const kpiSection = document.getElementById('kpiContainer');
        if (kpiSection) {
            const canvas = await html2canvas(kpiSection, canvasOptions);
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 40;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            if (yPosition + imgHeight > pageHeight - 20) { pdf.addPage(); yPosition = 20; }
            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 15;
        }

        // 3. Add Charts (Screenshots)
        if (yPosition > pageHeight - 40) { pdf.addPage(); yPosition = 20; }
        pdf.setFontSize(14);
        pdf.text('Analytics Charts', 20, yPosition);
        yPosition += 10;

        const chartContainers = document.querySelectorAll('.grid.grid-cols-1.lg\\:grid-cols-2 > div');
        let visibleCharts = [];

        // 1. Filter visible charts first
        for (let i = 0; i < chartContainers.length; i++) {
            if (chartContainers[i].style.display !== 'none') {
                visibleCharts.push(chartContainers[i]);
            }
        }

        // 2. Render visible charts with descriptions
        for (let i = 0; i < visibleCharts.length; i++) {
            const container = visibleCharts[i];
            const canvasEl = container.querySelector('canvas');
            const canvasId = canvasEl ? canvasEl.id : null;

            // Capture Screenshot
            const canvasImg = await html2canvas(container, canvasOptions);
            const imgData = canvasImg.toDataURL('image/png');

            // Dimensions
            // We'll stack them simply: Image then Text, then next chart. 
            // 2-column grid is tricky with variable text height, let's switch to 1-column single list for cleaner "Report" style?
            // User asked for "under every report you can show the informations". 
            // A 1-column layout is safer for this.

            const imgWidth = pageWidth - 40; // Full width (minus margins)
            const imgHeight = (canvasImg.height * imgWidth) / canvasImg.width;

            // Check Page Break for Image
            if (yPosition + imgHeight > pageHeight - 30) {
                pdf.addPage();
                yPosition = 20;
            }

            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 5;

            // Add Insight Text
            const insightText = getChartInsight(canvasId);
            pdf.setFontSize(10);
            pdf.setTextColor(80, 80, 80);

            // Split text to fit width
            const splitText = pdf.splitTextToSize(insightText, pageWidth - 40);
            pdf.text(splitText, 20, yPosition);

            // Update Y position based on text lines
            yPosition += (splitText.length * 5) + 15; // +15 for gap to next chart
        }

        // 4. Add Active Issues Section (Master Admin Only)
        const activeIssuesContainer = document.getElementById('activeIssuesContainer');
        if (activeIssuesContainer && activeIssuesContainer.style.display !== 'none') {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) { pdf.addPage(); yPosition = 20; }

            yPosition += 10;
            pdf.setFontSize(14);
            pdf.text('Active Issues Breakdown', 20, yPosition);
            yPosition += 10; // Space after title

            // Capture the Active Issues container
            const canvas = await html2canvas(activeIssuesContainer, canvasOptions);
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 40; // Full width - margins
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Page break check (again, just in case) - redundant but safe
            if (yPosition + imgHeight > pageHeight - 20) { pdf.addPage(); yPosition = 20; }

            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);

            yPosition += imgHeight + 5;

            // Add Insight Text for Active Issues
            const insightText = getChartInsight('activeIssues');
            pdf.setFontSize(10);
            pdf.setTextColor(80, 80, 80);

            // Split text to fit width
            const splitText = pdf.splitTextToSize(insightText, pageWidth - 40);

            // Check page break for text
            if (yPosition + (splitText.length * 5) > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
            }

            pdf.text(splitText, 20, yPosition);
        }

        // Save
        pdf.save(`Analytics_Report_${Date.now()}.pdf`);

        // Reset Button
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i><span>Download Report</span>';

    } catch (err) {
        console.error('Error generating PDF:', err);
        alert('Failed to generate PDF report.');
        const button = document.getElementById('downloadPdfBtn');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i><span>Download Report</span>';
    }
}

/**
 * Generates a text summary/insight for a specific chart.
 */
function getChartInsight(canvasId) {
    if (!filteredComplaints || filteredComplaints.length === 0) return "No data available.";

    const total = filteredComplaints.length;

    switch (canvasId) {
        case 'statusChart': {
            const pending = filteredComplaints.filter(c => c.complaintstatus === 'Pending').length;
            const inProgress = filteredComplaints.filter(c => c.complaintstatus === 'In-Progress').length;
            const resolved = filteredComplaints.filter(c => c.complaintstatus === 'Resolved').length;
            const deleted = filteredComplaints.filter(c => c.complaintstatus === 'Deleted').length;

            const pSent = total > 0 ? ((pending / total) * 100).toFixed(1) : 0;
            const iSent = total > 0 ? ((inProgress / total) * 100).toFixed(1) : 0;
            const rSent = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;

            return `Detailed Status Breakdown:
• Total Complaints Processed: ${total}
• Resolved: ${resolved} (${rSent}%) - Completed cases.
• Pending: ${pending} (${pSent}%) - Awaiting initial action.
• In-Progress: ${inProgress} (${iSent}%) - Currently being worked on.
• Deleted/Invalid: ${deleted}`;
        }

        case 'categoryChart': {
            const counts = {};
            filteredComplaints.forEach(c => {
                const cat = c.categoryName || 'Unknown';
                counts[cat] = (counts[cat] || 0) + 1;
            });

            // Sort categories by count desc
            const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const top3 = sortedCats.slice(0, 3).map(([k, v]) => `• ${k}: ${v} (${((v / total) * 100).toFixed(1)}%)`).join('\n');
            const least = sortedCats.length > 3 ? sortedCats[sortedCats.length - 1][0] : null;

            let text = `Category Analysis:\n${top3}`;
            if (least) text += `\n• Least Reported: ${least}`;
            text += `\n\nInsight: The majority of issues stem from the top category, indicating a potential systemic issue in that area.`;
            return text;
        }

        case 'trendChart': {
            if (charts.trend && charts.trend.data.datasets[0].data.length > 0) {
                const data = charts.trend.data.datasets[0].data;
                const labels = charts.trend.data.labels;

                const maxVal = Math.max(...data);
                const minVal = Math.min(...data);
                const maxIndex = data.indexOf(maxVal);
                const totalPeriod = data.reduce((a, b) => a + b, 0);
                const avg = (totalPeriod / data.length).toFixed(1);

                return `Temporal Trends (Last 6 Months):
• Peak Activity: ${labels[maxIndex]} with ${maxVal} complaints.
• Lowest Activity: ${minVal} complaints.
• Monthly Average: ~${avg} complaints/month.

Observation: Monitoring spikes in ${labels[maxIndex]} helps in resource planning for future similar periods.`;
            }
            return "Trend data shows complaint volume over the last 6 months.";
        }

        case 'resolutionChart': {
            const categories = [...new Set(filteredComplaints.map(c => c.categoryName).filter(Boolean))];
            let timings = [];

            categories.forEach(cat => {
                const catComplaints = filteredComplaints.filter(c => c.categoryName === cat && c.complaintstatus === 'Resolved');
                if (catComplaints.length > 0) {
                    // Use calendar days (midnight to midnight) instead of exact 24-hour periods
                    const totalDays = catComplaints.reduce((sum, c) => sum + getCalendarDaysDifference(new Date(c.submitteddate), new Date()), 0);
                    const avg = totalDays / catComplaints.length;
                    timings.push({ cat, avg });
                }
            });

            if (timings.length === 0) return "No resolution time data available yet.";

            timings.sort((a, b) => a.avg - b.avg); // Sort fastest to slowest
            const fastest = timings[0];
            const slowest = timings[timings.length - 1];
            const avgAll = (timings.reduce((a, b) => a + b.avg, 0) / timings.length).toFixed(1);

            return `Resolution Performance:
• Fastest Category: "${fastest.cat}" (~${Math.round(fastest.avg)} days).
• Slowest Category: "${slowest.cat}" (~${Math.round(slowest.avg)} days).
• Average Across All: ${avgAll} days.

Recommendation: Investigate bottlenecks in "${slowest.cat}" to improve overall turnaround time.`;
        }

        case 'dailyChart': {
            // Days in Monday-Sunday order to match the chart
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const counts = new Array(7).fill(0);

            filteredComplaints.forEach(c => {
                const dayIndex = new Date(c.submitteddate).getDay();
                // Remap: getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
                // We want: 0=Mon, 1=Tue, ..., 6=Sun
                const remappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                counts[remappedIndex]++;
            });

            const maxVal = Math.max(...counts);
            const busiestDay = days[counts.indexOf(maxVal)];
            // Weekend: Saturday (index 5) and Sunday (index 6)
            const weekendCount = counts[5] + counts[6];
            const weekdayCount = counts.reduce((a, b) => a + b, 0) - weekendCount;

            return `Day-of-Week Patterns:
• Busiest Day: ${busiestDay} (${maxVal} complaints).
• Weekday Load: ${weekdayCount} (${((weekdayCount / total) * 100).toFixed(0)}%).
• Weekend Load: ${weekendCount} (${((weekendCount / total) * 100).toFixed(0)}%).

Insight: Staffing should be optimized for ${busiestDay} to handle peak volumes effectively.`;
        }

        case 'adminChart': {
            if (adminRole !== 'Master Admin') return "";

            const counts = {};
            let totalResolved = 0;
            filteredComplaints.forEach(c => {
                if (c.adminid && c.complaintstatus === 'Resolved') {
                    const role = adminMap[c.adminid] || 'Unknown';
                    counts[role] = (counts[role] || 0) + 1;
                    totalResolved++;
                }
            });

            if (totalResolved === 0) return "No resolution data available for admins.";

            const sortedAdmins = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const top = sortedAdmins[0];

            return `Admin Performance Leaderboard:
• Top Performer: ${top[0]} with ${top[1]} resolved cases.
• Contribution: This role accounts for ${((top[1] / totalResolved) * 100).toFixed(1)}% of all resolutions.

Note: Balanced workload distribution ensures simpler cases don't inflate statistics artificially.`;
        }

        case 'activeIssues': {
            // For the Active Issues List
            const active = filteredComplaints.filter(c => c.complaintstatus !== 'Resolved' && c.complaintstatus !== 'Deleted');
            if (active.length === 0) return "No active issues currently.";

            const counts = {};
            active.forEach(c => {
                const cat = c.categoryName || 'Unknown';
                counts[cat] = (counts[cat] || 0) + 1;
            });

            const verifiedTotal = active.length;
            if (verifiedTotal === 0) return "No active issues.";

            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const top = sorted[0];

            return `Active Issues Overview:
• Critical Focus: "${top[0]}" has the highest backlog with ${top[1]} active complaints.
• Total Backlog: ${verifiedTotal} issues requiring attention.
• Impact: This category represents ${((top[1] / verifiedTotal) * 100).toFixed(1)}% of the total active workload.

Recommendation: Immediate resource allocation to "${top[0]}" is advised to reduce the backlog.`;
        }
        default:
            return "Analytics Chart Data";
    }
}
