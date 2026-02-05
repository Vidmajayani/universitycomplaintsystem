import { supabase } from "./supabaseClient.js";

/**
 * Admin Notifications Page Script
 * Displays all notifications for the logged-in admin
 */

let adminId = null;
let notifications = [];

/**
 * Get CSS classes for category-specific badges
 */
function getCategoryBadgeClass(category) {
    const cat = category?.toLowerCase();

    if (cat === 'academic') {
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
    } else if (cat === 'technical') {
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    } else if (cat === 'facility') {
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    } else if (cat === 'student disciplinary' || cat === 'student behavior') {
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800';
    } else if (cat === 'administrative') {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    } else {
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'Login.html';
        return;
    }

    adminId = session.user.id;
    console.log('Logged in as User ID:', adminId);

    // Get admin role
    const { data: adminData } = await supabase
        .from('admin')
        .select('adminrole')
        .eq('id', adminId)
        .single();

    if (adminData?.adminrole === 'Master Admin') {
        console.log('Master Admin detected: Redirecting to dashboard');
        window.location.href = 'AdminDashboard.html';
        return;
    }

    console.log('Admin Role:', adminData?.adminrole);

    // Load notifications
    await loadNotifications(false);

    // Set up event listeners
    setupEventListeners();
});

/**
 * Load notifications from Supabase
 */
async function loadNotifications(isAdminMaster = false) {
    try {
        let query = supabase
            .from('admin_notifications')
            .select(`
                *,
                complaint:complaint_id (
                    complainttitle,
                    category:categoryid (categoryname),
                    user:complainantid (first_name, last_name)
                )
            `);

        // If not Master Admin, only show notifications for this admin
        if (!isAdminMaster) {
            query = query.eq('admin_id', adminId);
        } else {
            console.log('Master Admin detected: Loading all notifications');
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Fetched notifications with details:', data);
        notifications = data || [];
        renderNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
        showError();
    }
}

/**
 * Render notifications on the page
 */
function renderNotifications() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const notificationsList = document.getElementById('notificationsList');
    const markAllBtn = document.getElementById('markAllReadBtn');

    loadingState.classList.add('hidden');

    if (notifications.length === 0) {
        emptyState.classList.remove('hidden');
        notificationsList.classList.add('hidden');
        markAllBtn.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    notificationsList.classList.remove('hidden');

    // Show "Mark All as Read" button if there are unread notifications
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
        markAllBtn.classList.remove('hidden');
    } else {
        markAllBtn.classList.add('hidden');
    }

    // Render each notification
    notificationsList.innerHTML = notifications.map(notification => {
        const isUnread = !notification.is_read;
        const date = new Date(notification.created_at);
        const timeAgo = getTimeAgo(date);

        // Extract extra info from joined data
        const complaint = notification.complaint;
        const complainant = complaint?.user;
        const complainantName = complainant ? `${complainant.first_name} ${complainant.last_name}` : 'Unknown User';
        const categoryName = complaint?.category?.categoryname || 'General';

        return `
            <div class="notification-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition cursor-pointer ${isUnread ? 'border-l-4 border-blue-500' : ''}"
                 data-id="${notification.id}"
                 data-complaint-id="${notification.complaint_id}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="fas fa-exclamation-circle text-blue-500"></i>
                            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${notification.type}</span>
                            <span class="px-2 py-0.5 ${getCategoryBadgeClass(categoryName)} text-xs rounded-full font-medium transition-colors">${categoryName}</span>
                            ${isUnread ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full font-medium">New</span>' : ''}
                        </div>
                        <p class="text-gray-800 dark:text-gray-200 mb-1 font-medium">${notification.message}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">By: <span class="font-semibold text-gray-800 dark:text-gray-200">${complainantName}</span></p>
                        <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span><i class="far fa-clock mr-1"></i>${timeAgo}</span>
                            <span><i class="fas fa-hashtag mr-1"></i>Complaint ${notification.complaint_id}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 ml-4">
                        ${isUnread ? `
                            <button class="mark-read-btn px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    data-id="${notification.id}">
                                <i class="fas fa-check mr-1"></i>Mark Read
                            </button>
                        ` : ''}
                        <i class="fas fa-chevron-right text-black dark:text-white text-lg"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click listeners to notification cards
    document.querySelectorAll('.notification-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            // Don't navigate if clicking the "Mark Read" button
            if (e.target.closest('.mark-read-btn')) {
                e.stopPropagation();
                const notificationId = parseInt(e.target.closest('.mark-read-btn').dataset.id);
                await markAsRead(notificationId);
                return;
            }

            const notificationId = parseInt(card.dataset.id);
            const complaintId = parseInt(card.dataset.complaintId);

            // Mark as read
            await markAsRead(notificationId);

            // Navigate to complaint details
            if (complaintId) {
                console.log('Navigating to AdminComplaintDetails for ID:', complaintId);
                window.location.href = `AdminComplaintDetails.html?id=${complaintId}`;
            }
        });
    });
}

/**
 * Mark a notification as read
 */
async function markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('admin_id', adminId);

        if (error) throw error;

        // Update local state
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = true;
            renderNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
    try {
        const { error } = await supabase
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('admin_id', adminId)
            .eq('is_read', false);

        if (error) throw error;

        // Update local state
        notifications.forEach(n => n.is_read = true);
        renderNotifications();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', markAllAsRead);
    }


    // Logout buttons are handled globally by darkMode.js
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

/**
 * Show error state
 */
function showError() {
    const loadingState = document.getElementById('loadingState');
    loadingState.innerHTML = `
        <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <p class="text-red-600 dark:text-red-400">Failed to load notifications. Please refresh the page.</p>
    `;
}
