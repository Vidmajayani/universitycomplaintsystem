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
// INITIALIZATION
// ==========================================
// Runs when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Event Listeners
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.onclick = generatePDFReport;
    }

    // 2. Start Authentication Flow
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
        .select('id, adminrole')
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
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek); // Start of this week (Sunday)
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
            const days = Math.floor((now - submitted) / (1000 * 60 * 60 * 24));
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
        const totalDays = catComplaints.reduce((sum, c) => sum + Math.floor((new Date() - new Date(c.submitteddate)) / (1000 * 60 * 60 * 24)), 0);
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

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);

    filteredComplaints.forEach(c => {
        const dayIndex = new Date(c.submitteddate).getDay();
        counts[dayIndex]++;
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

        const kpiSection = document.getElementById('kpiContainer');
        if (kpiSection) {
            const canvas = await html2canvas(kpiSection, { scale: 2, backgroundColor: '#ffffff', logging: false });
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

        // 2. Render visible charts without gaps
        for (let i = 0; i < visibleCharts.length; i++) {
            const container = visibleCharts[i];
            const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = (pageWidth - 50) / 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (yPosition + imgHeight > pageHeight - 20) { pdf.addPage(); yPosition = 20; }

            // Arrange charts in a grid (2 per row) based on VISIBLE index
            const xPosition = i % 2 === 0 ? 20 : pageWidth / 2 + 5;
            pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);

            // Move Y down only after every 2nd chart (or if it's the last one)
            if (i % 2 === 1 || i === visibleCharts.length - 1) {
                // If it's the end of a row, move down. 
                // Note: We use the height of the current chart for spacing. 
                // Ideally they are same height, if not, this might need max-height logic, 
                // but standard charts usually match.
                if (i % 2 === 1) yPosition += imgHeight + 10;
            }
        }

        // 4. Add Active Issues Section (Master Admin Only)
        const activeIssuesContainer = document.getElementById('activeIssuesContainer');
        if (activeIssuesContainer && activeIssuesContainer.style.display !== 'none') {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) { pdf.addPage(); yPosition = 20; }

            yPosition += 10;
            pdf.setFontSize(14);
            pdf.setTextColor(40, 40, 40);
            pdf.text('Active Issues Breakdown', 20, yPosition);
            yPosition += 10;

            const canvas = await html2canvas(activeIssuesContainer, { scale: 2, backgroundColor: '#ffffff', logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 40; // Full width
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (yPosition + imgHeight > pageHeight - 20) { pdf.addPage(); yPosition = 20; }
            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        }

        // 5. Add Footer with Page Numbers
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${i} of ${totalPages} | ComplaNet Analytics | ${reportDate}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        // 6. Save File
        const dateStr = new Date().toISOString().split('T')[0];
        const filterSuffix = filterState.type === 'all' ? 'AllTime' : filterState.type.charAt(0).toUpperCase() + filterState.type.slice(1);
        pdf.save(`Analytics_Report_${dateStr}_${filterSuffix}.pdf`);

        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i><span>Download Report</span>';

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
        const button = document.getElementById('downloadPdfBtn');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i><span>Download Report</span>';
    }
}
