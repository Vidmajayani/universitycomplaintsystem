import { supabase } from './supabaseClient.js';

let currentUser = null;

// DOM Elements (Bell Icon)
const notificationBtn = document.getElementById('notificationBtn');
const notificationBadge = document.getElementById('notificationBadge');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // 2. Initialize Bell Icon Logic
    initNotifications();

    // 3. Initialize Full Page Logic (if on Notifications.html)
    const notificationContainer = document.getElementById('fullNotificationList');
    if (notificationContainer) {
        initFullNotificationsPage(notificationContainer);
    }
});

async function initNotifications() {
    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Not logged in
    currentUser = user;

    // 2. Setup Direct Link
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'Notifications.html';
        });
    }

    // 3. Load Badge Count
    await loadNotifications();
}

async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('userid', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.warn("Notifications table issue:", error);
            return;
        }

        renderBadge(data);

    } catch (err) {
        console.error("Error fetching notifications:", err);
    }
}

function renderBadge(notifications) {
    if (!notifications || notifications.length === 0) {
        if (notificationBadge) notificationBadge.classList.add('hidden');
        return;
    }

    // Count unread
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadCount > 0 && notificationBadge) {
        notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationBadge.classList.remove('hidden');
    } else if (notificationBadge) {
        notificationBadge.classList.add('hidden');
    }
}


// --- Full Notifications Page Logic ---

async function initFullNotificationsPage(container) {
    if (!currentUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) currentUser = user;
    }

    if (!currentUser) return;

    // Setup Mark All Read Button for Page
    const markAllBtn = document.getElementById('markAllReadPageBtn');
    if (markAllBtn) {
        markAllBtn.onclick = async () => {
            await supabase.from('notifications').update({ is_read: true }).eq('userid', currentUser.id);
            loadFullList(container);
            loadNotifications(); // Update badge
        };
    }

    loadFullList(container);
}

async function loadFullList(container) {
    container.innerHTML = '';
    const loadingTemplate = document.getElementById('notificationsLoadingTemplate');
    if (loadingTemplate) {
        container.appendChild(loadingTemplate.content.cloneNode(true));
    } else {
        container.textContent = 'Loading notifications...';
    }

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userid', currentUser.id)
        .order('created_at', { ascending: false });

    if (error || !data) {
        container.innerHTML = '';
        const errorTemplate = document.getElementById('notificationsErrorTemplate');
        if (errorTemplate) {
            container.appendChild(errorTemplate.content.cloneNode(true));
        } else {
            container.textContent = 'Failed to load notifications.';
        }
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '';
        const emptyTemplate = document.getElementById('notificationsEmptyTemplate');
        if (emptyTemplate) {
            container.appendChild(emptyTemplate.content.cloneNode(true));
        } else {
            container.textContent = 'You have no notifications.';
        }
        return;
    }

    container.innerHTML = '';
    data.forEach(n => {
        const card = createNotificationCard(n);
        container.appendChild(card);
    });
}

function createNotificationCard(n) {
    const template = document.getElementById('notificationItemTemplate');
    if (!template) return null;

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.notification-card');

    const isResolved = (n.type === 'Resolved' || n.type === 'resolved');
    const timelineId = `timeline-${n.id}`;

    // 1. Background Styling
    const bgClass = n.is_read
        ? ['bg-white', 'dark:bg-gray-800', 'opacity-90']
        : ['bg-[var(--color-eco-light)]', 'dark:bg-[var(--color-green-dark)]'];

    card.classList.add(...bgClass);

    // 2. Icon Logic
    const iconElement = clone.querySelector('.notification-icon');
    let iconClass = 'fa-info-circle text-[var(--color-blue-btn)]'; // Default Blue
    if (isResolved) iconClass = 'fa-check-circle text-resolved'; // Green Token
    if (n.type === 'Deleted' || n.type === 'deleted') iconClass = 'fa-trash-alt text-pending'; // Red Token

    // Clear existing classes and add new ones (preserving 'fas')
    iconElement.className = `notification-icon fas ${iconClass}`;

    // 3. Content
    clone.querySelector('.notification-message').textContent = n.message;
    clone.querySelector('.notification-date').textContent = new Date(n.created_at).toLocaleString();

    // 4. Timeline Chevron Logic
    const chevronBtn = clone.querySelector('.notification-chevron');
    const timelineContainer = clone.querySelector('.notification-timeline');

    // Show dropdown for ANY status change that implies history
    const isStatusUpdate = ['In-Progress', 'Resolved', 'Pending', 'Deleted', 'in-progress', 'resolved', 'pending', 'deleted'].includes(n.type);

    if (isStatusUpdate) {
        chevronBtn.classList.remove('hidden');
        timelineContainer.id = timelineId;

        // Pass the notification's own creation date to filter future events
        chevronBtn.onclick = (e) => {
            e.stopPropagation();
            toggleTimeline(n.complaint_id, timelineContainer, chevronBtn, n.created_at);
        };
    }

    // 5. Card Click Interaction (Mark Read)
    card.onclick = async (e) => {
        // Prevent triggering if clicking the chevron or inside timeline
        if (e.target.closest('button') || e.target.closest(`#${timelineId}`)) return;

        if (!n.is_read) {
            await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
            // Update UI class immediately
            card.classList.remove('bg-[var(--color-eco-light)]', 'dark:bg-[var(--color-green-dark)]');
            card.classList.add('bg-white', 'dark:bg-gray-800', 'opacity-90');
            // Refresh badge count
            loadNotifications();
        }
    };

    return card;
}

async function toggleTimeline(complaintId, container, btnElement, cutoffDate) {
    const isHidden = container.classList.contains('hidden');

    if (isHidden) {
        container.classList.remove('hidden');
        btnElement.classList.add('rotate-180');

        if (!container.dataset.loaded) {
            container.innerHTML = '';
            const loadingTemplate = document.getElementById('timelineLoadingTemplate');
            if (loadingTemplate) {
                container.appendChild(loadingTemplate.content.cloneNode(true));
            } else {
                container.textContent = 'Loading history...';
            }

            try {
                // 1. Fetch Complaint Details (for Submission Date)
                const { data: complaint, error: compError } = await supabase
                    .from('complaint')
                    .select('submitteddate, complainttitle')
                    .eq('complaintid', complaintId)
                    .single();

                if (compError) throw compError;

                // 2. Fetch Notification History (Snapshot)
                const { data: history, error: histError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('complaint_id', complaintId)
                    .lte('created_at', cutoffDate)
                    .order('created_at', { ascending: true });

                if (histError) throw histError;

                // 3. Combine Events
                const submittedEvent = {
                    type: 'Pending', // Uses red dot style
                    created_at: complaint.submitteddate,
                    message: `Complaint "${complaint.complainttitle || 'Submitted'}" was received.`
                };

                // Filter out any duplicate "Pending" notifications from the DB to avoid double entry
                const filteredHistory = history.filter(h => h.type !== 'Pending');
                const fullTimeline = [submittedEvent, ...filteredHistory];

                renderTimeline(container, fullTimeline);
                container.dataset.loaded = "true";

            } catch (err) {
                console.error('Timeline error:', err);
                container.innerHTML = '';
                const errorTemplate = document.getElementById('timelineErrorTemplate');
                if (errorTemplate) {
                    container.appendChild(errorTemplate.content.cloneNode(true));
                } else {
                    container.textContent = 'Failed to load history.';
                }
            }
        }
    } else {
        container.classList.add('hidden');
        btnElement.classList.remove('rotate-180');
    }
}

function renderTimeline(container, events) {
    container.innerHTML = ''; // Clear loading text

    if (!events || events.length === 0) {
        container.textContent = 'No history found.';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'space-y-4';

    const template = document.getElementById('timelineItemTemplate');

    events.forEach(e => {
        let dotColor = 'bg-gray-400';
        let title = e.type || 'Update';

        // Styling logic - Use Design Tokens
        if (e.type === 'Pending') {
            dotColor = 'bg-red-500'; // Specific red for submission
            title = 'Complaint Submitted';
        }
        else if (e.type === 'In-Progress') {
            dotColor = 'bg-yellow-500';
            title = 'In Progress';
        }
        else if (e.type === 'Resolved') {
            dotColor = 'bg-green-500';
            title = 'Resolved';
        }
        else if (e.type === 'Deleted') {
            dotColor = 'bg-gray-500';
            title = 'Deleted';
        }

        // Extract clean reason
        let message = e.message || '';
        if (message.includes('Reason:')) {
            message = message.split('Reason:')[1].trim();
        }

        if (template) {
            const clone = template.content.cloneNode(true);

            const dot = clone.querySelector('.timeline-dot');
            dot.className = `timeline-dot w-3 h-3 rounded-full mt-1.5 border-2 border-white dark:border-gray-800 ${dotColor}`;

            const dateStr = new Date(e.created_at).toLocaleDateString();
            const timeStr = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            clone.querySelector('.timeline-date').textContent = `${dateStr} • ${timeStr}`;
            clone.querySelector('.timeline-title').textContent = title;
            clone.querySelector('.timeline-message').textContent = message;

            wrapper.appendChild(clone);
        }
    });

    container.appendChild(wrapper);
}
