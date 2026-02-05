// All Complaints JavaScript - Role-Based Management with Master Admin Support
import { supabase } from './supabaseClient.js';

// State variables
let adminId = null;
let adminRole = null;
let allComplaints = [];
let filteredComplaints = [];
let categoryMap = {}; // Map category ID to Name
let currentPage = 1;
const itemsPerPage = 5;

// DOM Elements
const tableBody = document.getElementById('complaintsTableBody');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const filterCategory = document.getElementById('filterCategory');
const totalCountSpan = document.getElementById('totalComplaintsCount');
const startRangeSpan = document.getElementById('startRange');
const endRangeSpan = document.getElementById('endRange');
const totalEntriesSpan = document.getElementById('totalEntries');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const paginationNumbers = document.getElementById('paginationNumbers');
const complaintRowTemplate = document.getElementById('complaintRowTemplate');

// Initialize
// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    checkAdminSession();
    setupEventListeners();
});

// ------------------------
//  CHECK ADMIN SESSION
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
        .select('id, adminrole, profile_pic')
        .eq('id', session.user.id)
        .single();

    if (error || !adminData) {
        alert('Access denied.');
        window.location.href = 'Login.html';
        return;
    }

    adminId = adminData.id;
    adminRole = adminData.adminrole;

    // Update Profile Picture in Header
    const profileBtn = document.getElementById('profileButton');
    if (profileBtn && adminData.profile_pic) {
        profileBtn.innerHTML = `
            <img src="${adminData.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover">
        `;
    }

    console.log(`Logged in as Admin: ${adminRole} (${adminId})`);



    // Show Category Filter for Master Admin
    if (adminRole === 'Master Admin' && filterCategory) {
        filterCategory.classList.remove('hidden');
    }

    await fetchCategories(); // Fetch categories first

    // Check for URL parameters (e.g. ?status=Pending)
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam && filterStatus) {
        filterStatus.value = statusParam;
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

    loadComplaints();
}

// ------------------------
//  LOAD COMPLAINTS
// ------------------------
async function loadComplaints() {
    try {
        tableBody.textContent = ''; // Clear table
        const loadingRow = document.createElement('tr');
        const loadingCell = document.createElement('td');
        loadingCell.colSpan = 7;
        loadingCell.className = 'py-6 text-center';
        loadingCell.textContent = 'Loading complaints...';
        loadingRow.appendChild(loadingCell);
        tableBody.appendChild(loadingRow);

        // Build query based on admin role
        let query = supabase
            .from('complaint')
            .select('*');

        // Master Admin sees ALL complaints, others see only assigned - MOST IMPORTANT
        if (adminRole !== 'Master Admin') {
            query = query.eq('adminid', adminId);
        }

        // Hide Deleted complaints from the table view
        query = query.neq('complaintstatus', 'Deleted');

        const { data: complaints, error } = await query.order('submitteddate', { ascending: false });

        if (error) throw error;

        allComplaints = complaints || [];

        // Map Category IDs to Names
        allComplaints = allComplaints.map(c => ({
            ...c,
            categoryName: categoryMap[c.categoryid] || 'Unknown Category' // Use map
        }));

        // Fetch user details for these complaints
        if (allComplaints.length > 0) {
            const userIds = [...new Set(allComplaints.map(c => c.complainantid))];

            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, first_name, last_name, email') // Added email
                .in('id', userIds);

            if (!userError && users) {
                // Create a map of userId -> userDetails
                const userMap = {};
                users.forEach(u => {
                    userMap[u.id] = {
                        name: `${u.first_name} ${u.last_name}`,
                        email: u.email
                    };
                });

                // Attach user names and emails to complaints
                allComplaints = allComplaints.map(c => {
                    const user = userMap[c.complainantid];
                    return {
                        ...c,
                        complainantName: user ? user.name : 'Unknown User',
                        complainantEmail: user ? user.email : null // Store email
                    };
                });
            }
        }

        updateStats(); // Update totals

        filterComplaints(); // Apply filters (includes renderTable & renderPagination)

    } catch (err) {
        console.error('Error loading complaints:', err);
        tableBody.textContent = '';
        const errorRow = document.createElement('tr');
        const errorCell = document.createElement('td');
        errorCell.colSpan = 7;
        errorCell.className = 'py-6 text-center text-red-500';
        errorCell.textContent = 'Error loading complaints. Please try again.';
        errorRow.appendChild(errorCell);
        tableBody.appendChild(errorRow);
    }
}

// ------------------------
//  FETCH CATEGORIES
// ------------------------
async function fetchCategories() {
    try {
        const { data: categories, error } = await supabase
            .from('category')
            .select('categoryid, categoryname');

        if (error) throw error;

        if (categories) {
            categories.forEach(cat => {
                categoryMap[cat.categoryid] = cat.categoryname;
            });
            console.log('Categories loaded:', categoryMap);
        }
    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

// ------------------------
//  RENDER TABLE
// ------------------------
// ------------------------
//  RENDER COMPLAINTS (TABLE & CARDS)
// ------------------------
function renderTable() {
    const tableBody = document.getElementById('complaintsTableBody');
    const cardsView = document.getElementById('complaintsCardsView');

    if (tableBody) tableBody.textContent = ''; // Clear existing rows
    if (cardsView) cardsView.textContent = ''; // Clear existing cards

    if (filteredComplaints.length === 0) {
        // Empty State - Table
        if (tableBody) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 7;
            emptyCell.className = 'py-8 text-center text-gray-500 dark:text-gray-400';
            emptyCell.innerHTML = '<i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i><br>No complaints found.';
            emptyRow.appendChild(emptyCell);
            tableBody.appendChild(emptyRow);
        }

        // Empty State - Cards
        if (cardsView) {
            cardsView.innerHTML = `
                <div class="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
                    <i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i><br>No complaints found.
                </div>
            `;
        }
        return;
    }

    // Pagination Logic
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredComplaints.length);
    const pageData = filteredComplaints.slice(startIndex, endIndex);

    // Update Range Display
    startRangeSpan.textContent = filteredComplaints.length > 0 ? startIndex + 1 : 0;
    endRangeSpan.textContent = endIndex;
    totalEntriesSpan.textContent = filteredComplaints.length;

    const fragment = document.createDocumentFragment();
    const cardsFragment = document.createDocumentFragment();

    pageData.forEach(complaint => {
        // --- 1. RENDER TABLE ROW (Desktop) ---
        const clone = complaintRowTemplate.content.cloneNode(true);
        const row = clone.querySelector('tr');

        // Populate Data
        clone.querySelector('.col-id').textContent = `#${complaint.complaintid}`;
        clone.querySelector('.col-title').textContent = complaint.complainttitle || 'Untitled';

        // Category Badge Logic
        const categorySpan = clone.querySelector('.col-category');
        const category = complaint.categoryName || 'General';
        categorySpan.textContent = category;

        // Dynamic Colors Helper
        const getCategoryClass = (cat) => {
            if (cat === 'Academic') return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';
            if (cat === 'Facility') return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300';
            if (cat === 'Technical') return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
            if (cat === 'Administrative') return 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300';
            return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        };

        categorySpan.className = `col-category inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryClass(category)}`;

        // Priority Column Logic
        const priorityCell = clone.querySelector('.col-priority');
        if (complaint.priority) {
            // Render Badge with Remove Button
            const getPriorityClass = (p) => {
                if (p === 'High') return 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
                if (p === 'Medium') return 'bg-yellow-100 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
                return 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            };

            priorityCell.innerHTML = `
                <div class="relative inline-flex items-center justify-center w-28 px-3 py-1.5 rounded text-sm font-medium border ${getPriorityClass(complaint.priority)}">
                    ${complaint.priority}
                    <button type="button" class="absolute top-0.5 right-1 inline-flex items-center justify-center text-current hover:opacity-75 focus:outline-none remove-priority-btn" data-id="${complaint.complaintid}">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;

            // Attach remove listener
            setTimeout(() => {
                const removeBtn = priorityCell.querySelector('.remove-priority-btn');
                if (removeBtn) {
                    removeBtn.onclick = (e) => {
                        e.stopPropagation(); // Prevent row click
                        openRemovePriorityModal(complaint.complaintid);
                    };
                }
            }, 0);

        } else {
            // Render Prioritize Button
            // Render Prioritize Button
            priorityCell.innerHTML = `
                <button class="inline-flex items-center justify-center w-28 px-3 py-1.5 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all btn-prioritize" data-id="${complaint.complaintid}">
                    <i class="fas fa-sort-amount-up mr-1.5"></i> Prioritize
                </button>
            `;
            // Attach prioritize listener
            setTimeout(() => {
                const prioritizeBtn = priorityCell.querySelector('.btn-prioritize');
                if (prioritizeBtn) {
                    prioritizeBtn.onclick = (e) => {
                        e.stopPropagation();
                        openPriorityModal(complaint.complaintid);
                    };
                }
            }, 0);
        }

        const date = new Date(complaint.submitteddate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        clone.querySelector('.col-date').textContent = date;

        const userName = complaint.complainantName || 'Unknown User';
        clone.querySelector('.complainant-name').textContent = userName;

        // Status Badge
        const statusSpan = clone.querySelector('.col-status');
        statusSpan.textContent = complaint.complaintstatus;

        const getStatusClass = (stat) => {
            if (stat === 'Pending') return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300';
            if (stat === 'In-Progress') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
            if (stat === 'Resolved') return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
            if (stat === 'Deleted') return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
            return 'bg-gray-100 text-gray-600';
        };

        statusSpan.className = `col-status py-1 px-3 rounded-full text-xs font-semibold ${getStatusClass(complaint.complaintstatus)}`;

        // Action Buttons Logic (Used for both)
        const setupActions = (container) => {
            const previewBtn = container.querySelector('.btn-preview');
            const statusBtn = container.querySelector('.btn-status');
            const deleteBtn = container.querySelector('.btn-delete');

            if (previewBtn) previewBtn.onclick = () => window.location.href = `AdminComplaintDetails.html?id=${complaint.complaintid}`;
            if (statusBtn) statusBtn.onclick = () => changeComplaintStatus(complaint.complaintid, complaint.complaintstatus, row);
            if (deleteBtn) deleteBtn.onclick = () => deleteComplaint(complaint.complaintid);
        };

        setupActions(clone);
        fragment.appendChild(clone);

        // --- 2. RENDER CARD (Mobile/Tablet) ---
        if (cardsView) {
            const cardTemplate = document.getElementById('complaintCardTemplate');
            if (cardTemplate) {
                const cardClone = cardTemplate.content.cloneNode(true);
                const card = cardClone.querySelector('div');

                // Populate Fields
                card.querySelector('.card-category').textContent = category;
                card.querySelector('.card-category').className = `card-category px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getCategoryClass(category)}`;

                card.querySelector('.card-title').textContent = complaint.complainttitle || 'Untitled';
                card.querySelector('.card-user').textContent = userName;
                card.querySelector('.card-id').textContent = complaint.complainantid || 'N/A';

                card.querySelector('.card-date').textContent = date;

                const statusEl = card.querySelector('.card-status');
                statusEl.textContent = complaint.complaintstatus;
                statusEl.className = `card-status px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusClass(complaint.complaintstatus)}`;

                // Mobile Priority Logic
                const priorityContainer = card.querySelector('.card-priority');
                if (priorityContainer) {
                    if (complaint.priority) {
                        // Re-use Badge Logic (Inline definition for safety if scope issue)
                        const getPriorityClassMobile = (p) => {
                            if (p === 'High') return 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
                            if (p === 'Medium') return 'bg-yellow-100 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
                            return 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
                        };

                        priorityContainer.innerHTML = `
                            <div class="relative inline-flex items-center justify-center w-28 px-3 py-1.5 rounded text-xs font-bold uppercase border ${getPriorityClassMobile(complaint.priority)}">
                                ${complaint.priority}
                                <button type="button" class="absolute top-0.5 right-1 inline-flex items-center justify-center text-current hover:opacity-75 focus:outline-none remove-priority-btn-mobile" data-id="${complaint.complaintid}">
                                    <i class="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        `;

                        // Attach remove listener
                        setTimeout(() => {
                            const removeBtn = priorityContainer.querySelector('.remove-priority-btn-mobile');
                            if (removeBtn) {
                                removeBtn.onclick = (e) => {
                                    e.stopPropagation();
                                    openRemovePriorityModal(complaint.complaintid);
                                };
                            }
                        }, 0);

                    } else {
                        // Render Prioritize Button (Mobile Style)
                        priorityContainer.innerHTML = `
                            <button class="inline-flex items-center justify-center w-28 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all btn-prioritize-mobile" data-id="${complaint.complaintid}">
                                <i class="fas fa-sort-amount-up mr-1"></i> Prioritize
                            </button>
                        `;

                        // Attach prioritize listener
                        setTimeout(() => {
                            const prioritizeBtn = priorityContainer.querySelector('.btn-prioritize-mobile');
                            if (prioritizeBtn) {
                                prioritizeBtn.onclick = (e) => {
                                    e.stopPropagation();
                                    openPriorityModal(complaint.complaintid);
                                };
                            }
                        }, 0);
                    }
                }

                const desc = card.querySelector('.card-desc');
                desc.textContent = complaint.complaintdescription || 'No description provided.';
                desc.title = complaint.complaintdescription || '';

                setupActions(card);
                cardsFragment.appendChild(card);
            }
        }
    });

    if (tableBody) tableBody.appendChild(fragment);
    if (cardsView) cardsView.appendChild(cardsFragment);
}

// ------------------------
//  MODAL ELEMENTS
// ------------------------
const statusModal = document.getElementById('statusModal');
const deleteModal = document.getElementById('deleteModal');
const modalStatusSelect = document.getElementById('modalStatusSelect');
const modalStatusReason = document.getElementById('modalStatusReason');
const modalDeleteReason = document.getElementById('modalDeleteReason');

// Buttons
const confirmStatusBtn = document.getElementById('confirmStatusBtn');
const cancelStatusBtn = document.getElementById('cancelStatusBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

let currentComplaintId = null;

// ------------------------
//  MODAL LOGIC
// ------------------------
function openStatusModal(complaintId, currentStatus) {
    currentComplaintId = complaintId;
    modalStatusSelect.value = currentStatus;
    modalStatusReason.value = ''; // Reset reason
    statusModal.classList.remove('hidden');
}

function closeStatusModal() {
    statusModal.classList.add('hidden');
    currentComplaintId = null;
}

function openDeleteModal(complaintId) {
    currentComplaintId = complaintId;
    modalDeleteReason.value = ''; // Reset reason
    deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    currentComplaintId = null;
}

// Event Listeners for Modals
setupModalListeners();

function setupModalListeners() {
    // Status Modal
    cancelStatusBtn.addEventListener('click', closeStatusModal);
    confirmStatusBtn.addEventListener('click', async () => {
        const newStatus = modalStatusSelect.value;
        const reason = modalStatusReason.value.trim();

        if (!reason) {
            alert('Please provide a reason for the status change.');
            return;
        }

        await updateComplaintStatus(currentComplaintId, newStatus, reason);
        closeStatusModal();
    });

    // Delete Modal
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', async () => {
        const reason = modalDeleteReason.value.trim();

        if (!reason) {
            alert('Please provide a reason for deletion.');
            return;
        }

        await softDeleteComplaint(currentComplaintId, reason);
        closeDeleteModal();
    });
}

// ------------------------
//  CHANGE STATUS (LOGIC)
// ------------------------
// Called from HTML button
async function changeComplaintStatus(complaintId, currentStatus, row) {
    openStatusModal(complaintId, currentStatus);
}

async function updateComplaintStatus(complaintId, newStatus, reason) {
    try {
        // 1. Prepare Update Logic
        const updates = {
            complaintstatus: newStatus,
            admin_feedback: reason
        };

        // If resolving, set resolved metadata
        if (newStatus === 'Resolved') {
            updates.resolveddate = new Date().toISOString();
            updates.resolvedby = adminId;
        }

        const { error } = await supabase
            .from('complaint')
            .update(updates)
            .eq('complaintid', complaintId);

        if (error) throw error;

        // 2. Fetch Complainant ID (to know who to notify)
        const complaint = allComplaints.find(c => c.complaintid === complaintId);
        if (complaint && complaint.complainantid) {
            // 3. Insert Notification
            const message = `Your complaint "${complaint.complainttitle || 'Complaint'}" status has been updated to ${newStatus}. Reason: ${reason}`;
            await supabase.from('notifications').insert([{
                userid: complaint.complainantid,
                complaint_id: complaintId,
                type: newStatus,
                message: message,
                is_read: false
            }]);

            // 4. Send Email Notification
            await sendEmailNotification(
                complaint.complainantEmail,
                complaint.complainantName,
                complaint.complainttitle,
                newStatus,
                reason
            );
        }

        // Update local data
        allComplaints = allComplaints.map(c =>
            c.complaintid === complaintId
                ? { ...c, ...updates }
                : c
        );

        filterComplaints();
        alert(`Status updated to ${newStatus} and user notified!`);

    } catch (err) {
        console.error('Error updating status:', err);
        alert('Failed to update status.');
    }
}

// ------------------------
//  EMAIL NOTIFICATION HELPER
// ------------------------
async function sendEmailNotification(userEmail, userName, complaintTitle, newStatus, message) {
    if (!userEmail) {
        console.warn('No email found for user. Skipping email notification.');
        return;
    }

    const templateParams = {
        to_name: userName,
        to_email: userEmail,
        complaint_title: complaintTitle,
        new_status: newStatus,
        message: message
    };

    try {
        // Pass Public Key as 4th argument to ensure it works
        await emailjs.send('service_q77wg09', 'template_sb3k70p', templateParams, '08jWWt0PNjZJ4BcQw');
        console.log(`Email sent to ${userEmail}`);
    } catch (error) {
        console.error('EmailJS Error:', error);
        // Don't block UI; just log error
    }
}

// ------------------------
//  SOFT DELETE (LOGIC)
// ------------------------
// Called from HTML button
window.deleteComplaint = (id) => {
    openDeleteModal(id);
};

async function softDeleteComplaint(id, reason) {
    try {
        // 1. SOFT DELETE
        const { error } = await supabase
            .from('complaint')
            .update({
                complaintstatus: 'Deleted',
                admin_feedback: reason
            })
            .eq('complaintid', id);

        if (error) throw error;

        // 2. Fetch Complainant ID
        const complaint = allComplaints.find(c => c.complaintid === id);
        if (complaint && complaint.complainantid) {
            // 3. Insert Notification
            const message = `Your complaint "${complaint.complainttitle || 'Complaint'}" was marked as Deleted. Reason: ${reason}`;
            await supabase.from('notifications').insert([{
                userid: complaint.complainantid,
                complaint_id: id,
                type: 'Deleted',
                message: message,
                is_read: false
            }]);

            // 4. Send Email Notification
            await sendEmailNotification(
                complaint.complainantEmail,
                complaint.complainantName,
                complaint.complainttitle,
                'Deleted',
                reason
            );
        }

        // Update local data
        allComplaints = allComplaints.map(c =>
            c.complaintid === id
                ? { ...c, complaintstatus: 'Deleted', admin_feedback: reason }
                : c
        );

        filterComplaints();
        updateStats();
        alert('Complaint deleted and user notified.');

    } catch (err) {
        console.error('Error deleting complaint:', err);
        alert('Failed to delete complaint.');
    }
}

// ------------------------
//  FILTERS & SEARCH
// ------------------------
function filterComplaints() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const priorityFilter = filterPriority.value; // Get priority filter value

    filteredComplaints = allComplaints.filter(complaint => {
        const matchesSearch =
            (complaint.complainttitle && complaint.complainttitle.toLowerCase().includes(searchTerm)) ||
            (complaint.complaintdescription && complaint.complaintdescription.toLowerCase().includes(searchTerm)) ||
            (complaint.complaintid && complaint.complaintid.toString().includes(searchTerm)) ||
            (complaint.complainantName && complaint.complainantName.toLowerCase().includes(searchTerm));

        const matchesStatus = statusFilter === '' || complaint.complaintstatus === statusFilter;

        // Priority Filter
        let matchesPriority = true;
        if (priorityFilter !== '') {
            if (priorityFilter === 'Unprioritized') {
                matchesPriority = !complaint.priority;
            } else {
                matchesPriority = complaint.priority === priorityFilter;
            }
        }

        // Category Filter (only active if visible/Master Admin)
        const categoryFilter = filterCategory ? filterCategory.value : '';
        const matchesCategory = categoryFilter === '' || complaint.categoryName === categoryFilter; // Check Name

        // Date Range Filter
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;
        let matchesDate = true;

        if (dateFrom || dateTo) {
            const complaintDate = new Date(complaint.submitteddate);
            // Reset time part for accurate date-only comparison
            complaintDate.setHours(0, 0, 0, 0);

            if (dateFrom) {
                const innerFrom = new Date(dateFrom);
                innerFrom.setHours(0, 0, 0, 0);
                if (complaintDate < innerFrom) matchesDate = false;
            }

            if (dateTo && matchesDate) { // Only check if still matching
                const innerTo = new Date(dateTo);
                innerTo.setHours(0, 0, 0, 0);
                if (complaintDate > innerTo) matchesDate = false;
            }
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
    });

    currentPage = 1; // Reset to first page
    renderTable();
    renderPagination();
}

// ------------------------
//  PRIORITY HANDLING
// ------------------------
let currentComplaintIdForPriority = null;
let currentComplaintIdForRemovePriority = null;

function openPriorityModal(id) {
    currentComplaintIdForPriority = id;
    const modal = document.getElementById('priorityModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('modalPrioritySelect').value = 'High'; // Default
    }
}

function openRemovePriorityModal(id) {
    currentComplaintIdForRemovePriority = id;
    const modal = document.getElementById('removePriorityModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Setup Priority Modal Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Set Priority Modal
    const savePriorityBtn = document.getElementById('savePriorityBtn');
    const cancelPriorityBtn = document.getElementById('cancelPriorityBtn');
    const modal = document.getElementById('priorityModal');

    if (savePriorityBtn) {
        savePriorityBtn.addEventListener('click', async () => {
            const priority = document.getElementById('modalPrioritySelect').value;
            if (currentComplaintIdForPriority && priority) {
                await updatePriority(currentComplaintIdForPriority, priority);
                if (modal) modal.classList.add('hidden');
            }
        });
    }

    if (cancelPriorityBtn) {
        cancelPriorityBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
            currentComplaintIdForPriority = null;
        });
    }

    // Remove Priority Modal
    const confirmRemoveBtn = document.getElementById('confirmRemovePriorityBtn');
    const cancelRemoveBtn = document.getElementById('cancelRemovePriorityBtn');
    const removeModal = document.getElementById('removePriorityModal');

    if (confirmRemoveBtn) {
        confirmRemoveBtn.addEventListener('click', async () => {
            if (currentComplaintIdForRemovePriority) {
                await removePriority(currentComplaintIdForRemovePriority);
                if (removeModal) removeModal.classList.add('hidden');
                currentComplaintIdForRemovePriority = null;
            }
        });
    }

    if (cancelRemoveBtn) {
        cancelRemoveBtn.addEventListener('click', () => {
            if (removeModal) removeModal.classList.add('hidden');
            currentComplaintIdForRemovePriority = null;
        });
    }
});

async function updatePriority(id, priority) {
    try {
        const { error } = await supabase
            .from('complaint')
            .update({ priority: priority }) // Assuming column name is 'priority'
            .eq('complaintid', id);

        if (error) throw error;

        // Update local data
        allComplaints = allComplaints.map(c =>
            c.complaintid === id ? { ...c, priority: priority } : c
        );

        filterComplaints();
        // alert(`Priority set to ${priority}`); // Notification optional, removing for cleaner UI

    } catch (err) {
        console.error('Error updating priority:', err);
        alert('Failed to update priority.');
    }
}

async function removePriority(id) {
    try {
        const { error } = await supabase
            .from('complaint')
            .update({ priority: null })
            .eq('complaintid', id);

        if (error) throw error;

        // Update local data
        allComplaints = allComplaints.map(c =>
            c.complaintid === id ? { ...c, priority: null } : c
        );

        filterComplaints();

    } catch (err) {
        console.error('Error removing priority:', err);
        alert('Failed to remove priority.');
    }
}

// ------------------------
//  PAGINATION
// ------------------------
function renderPagination() {
    paginationNumbers.textContent = ''; // Clear existing buttons
    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Mobile View (< 1280px): Show "Page X of Y"
    if (window.innerWidth < 1280) {
        const info = document.createElement('span');
        info.className = 'px-4 py-1 text-sm font-medium text-gray-600 dark:text-gray-300';
        info.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationNumbers.appendChild(info);
        return;
    }

    // Desktop View: Smart Pagination (1 ... 4 5 6 ... 10)
    const maxVisibleButtons = 5;

    if (totalPages <= maxVisibleButtons + 2) {
        // Show all if few pages
        for (let i = 1; i <= totalPages; i++) {
            addPageButton(i);
        }
    } else {
        // Always show first
        addPageButton(1);

        if (currentPage > 3) {
            addEllipsis();
        }

        // Middle Range
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            addPageButton(i);
        }

        if (currentPage < totalPages - 2) {
            addEllipsis();
        }

        // Always show last
        addPageButton(totalPages);
    }
}

function addPageButton(page) {
    const btn = document.createElement('button');
    btn.textContent = page;
    btn.className = `px-3 py-1 border rounded transition ${currentPage === page
        ? 'bg-eco text-white border-eco'
        : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white'}`;

    btn.addEventListener('click', () => {
        currentPage = page;
        renderTable();
        renderPagination();
    });
    paginationNumbers.appendChild(btn);
}

function addEllipsis() {
    const span = document.createElement('span');
    span.textContent = '...';
    span.className = 'px-2 py-1 text-gray-500 dark:text-gray-400';
    paginationNumbers.appendChild(span);
}

// ------------------------
//  EVENT LISTENERS
// ------------------------
function setupEventListeners() {
    searchInput.addEventListener('input', filterComplaints);
    filterStatus.addEventListener('change', filterComplaints);
    if (filterPriority) filterPriority.addEventListener('change', filterComplaints); // Add listener for priority filter
    if (filterCategory) filterCategory.addEventListener('change', filterComplaints);

    // Date Inputs
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    if (dateFromInput) dateFromInput.addEventListener('change', filterComplaints);
    if (dateToInput) dateToInput.addEventListener('change', filterComplaints);

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    });



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
//  UTILITIES
// ------------------------
function updateStats() {
    if (totalCountSpan) totalCountSpan.textContent = allComplaints.length;
}
