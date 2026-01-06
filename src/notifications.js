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

    // Initialize Mobile Menu (Hamburger)
    const oldMobileBtn = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');

    if (oldMobileBtn && mobileMenu) {
        // Clone button to clear old listeners
        const mobileMenuBtn = oldMobileBtn.cloneNode(true);
        oldMobileBtn.parentNode.replaceChild(mobileMenuBtn, oldMobileBtn);

        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('-translate-x-full');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.add('-translate-x-full');
            }
        });
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
    // Add Lost & Found statuses: 'Lost', 'Claim', 'Found' case-insensitive + Legacy/Current 'LostItemUpdate', 'ItemDeleted'
    const statusTypes = [
        'in-progress', 'resolved', 'pending', 'deleted',
        'lost', 'claim', 'found',
        'lostitemupdate', 'itemdeleted' // Added these to catch the current notifications
    ];
    const isStatusUpdate = statusTypes.includes(n.type.toLowerCase());

    if (isStatusUpdate) {
        chevronBtn.classList.remove('hidden');
        timelineContainer.id = timelineId;

        // Context Detection
        const contextType = n.lost_item_id ? 'lost_item' : 'complaint';
        const contextId = n.lost_item_id || n.complaint_id;

        // Pass the notification's own creation date to filter future events
        chevronBtn.onclick = (e) => {
            e.stopPropagation();
            toggleTimeline(contextId, contextType, timelineContainer, chevronBtn, n.created_at);
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

async function toggleTimeline(contextId, contextType, container, btnElement, cutoffDate) {
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
                let initialEvent = null;
                let historyFilterColumn = '';

                // 1. Fetch Details & Determine Initial Event
                if (contextType === 'lost_item') {
                    historyFilterColumn = 'lost_item_id';
                    // Fetch Lost Item Details
                    const { data: item, error: itemError } = await supabase
                        .from('lost_and_found')
                        .select('reported_date, item_name')
                        .eq('item_id', contextId)
                        .single();

                    if (itemError) throw itemError;

                    initialEvent = {
                        type: 'Lost', // Uses orange/standard dot
                        created_at: item.reported_date,
                        message: `Item "${item.item_name || 'Reported Item'}" was reported.`
                    };

                } else {
                    historyFilterColumn = 'complaint_id';
                    // Fetch Complaint Details
                    const { data: complaint, error: compError } = await supabase
                        .from('complaint')
                        .select('submitteddate, complainttitle')
                        .eq('complaintid', contextId)
                        .single();

                    if (compError) throw compError;

                    initialEvent = {
                        type: 'Pending', // Uses red dot style
                        created_at: complaint.submitteddate,
                        message: `Complaint "${complaint.complainttitle || 'Submitted'}" was received.`
                    };
                }

                // 2. Fetch Notification History (Snapshot)
                const { data: history, error: histError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq(historyFilterColumn, contextId)
                    .lte('created_at', cutoffDate)
                    .order('created_at', { ascending: true });

                if (histError) throw histError;

                // 3. Combine Events
                // Filter out any duplicate initial events from DB if they exist as notifications
                const filteredHistory = history.filter(h => h.type !== initialEvent.type);
                const fullTimeline = [initialEvent, ...filteredHistory];

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
        const typeLower = (e.type || '').toLowerCase();

        // Styling logic - Use Design Tokens
        // Complaints
        if (typeLower === 'pending') {
            dotColor = 'bg-red-500';
            title = 'Complaint Submitted';
        }
        else if (typeLower === 'in-progress') {
            dotColor = 'bg-yellow-500';
            title = 'In Progress';
        }
        else if (typeLower === 'resolved') {
            dotColor = 'bg-green-500';
            title = 'Resolved';
        }
        // Lost & Found
        else if (typeLower === 'lost') {
            dotColor = 'bg-orange-500';
            title = 'Item Reported (Lost)';
        }
        else if (typeLower === 'claim') {
            dotColor = 'bg-blue-500';
            title = 'Potential Match Found';
        }
        else if (typeLower === 'found') {
            dotColor = 'bg-green-500';
            title = 'Item Returned / Found';
        }
        // Common
        else if (typeLower === 'deleted' || typeLower === 'itemdeleted') {
            dotColor = 'bg-gray-500';
            title = 'Deleted';
        }
        else if (typeLower === 'lostitemupdate') {
            dotColor = 'bg-blue-400';
            title = 'Status Update';
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
