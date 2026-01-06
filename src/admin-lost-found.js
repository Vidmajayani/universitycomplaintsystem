import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // Role Check (Optional: could restrict strict access if needed, but we allow all admins to see)
    // We already do a check in logic, but standard behavior:
    const { data: admin } = await supabase.from('admin').select('id, adminrole').eq('id', session.user.id).single();
    if (!admin) {
        window.location.href = 'Login.html';
        return;
    }

    const tableBody = document.getElementById('itemsTableBody');
    const cardsView = document.getElementById('itemsCardsView');
    const cardTemplate = document.getElementById('itemCardTemplate');
    const statusFilter = document.getElementById('statusFilter');

    const itemRowTemplate = document.getElementById('itemRowTemplate');
    const emptyTableStateTemplate = document.getElementById('emptyTableStateTemplate');
    const emptyCardStateTemplate = document.getElementById('emptyCardStateTemplate');
    const errorTableStateTemplate = document.getElementById('errorTableStateTemplate');

    let allItems = [];

    // Setup Header/Menu listeners
    setupMenuListeners();

    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');

    const searchInput = document.getElementById('searchInput');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationNumbers = document.getElementById('paginationNumbers');

    let currentPage = 1;
    const itemsPerPage = 10;

    // Add listeners
    dateFromInput.addEventListener('change', () => { currentPage = 1; renderItems(); });
    dateToInput.addEventListener('change', () => { currentPage = 1; renderItems(); });
    statusFilter.addEventListener('change', () => { currentPage = 1; renderItems(); });
    searchInput.addEventListener('input', () => { currentPage = 1; renderItems(); });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderItems(); }
    });
    nextPageBtn.addEventListener('click', () => {
        // Validation handled in render
        currentPage++; renderItems();
    });


    // Check URL params for filter
    const urlParams = new URLSearchParams(window.location.search);
    const paramStatus = urlParams.get('status');
    if (paramStatus) {
        // Ensure the value exists in the dropdown to avoid invalid selection
        const optionExists = Array.from(statusFilter.options).some(opt => opt.value === paramStatus);
        if (optionExists) {
            statusFilter.value = paramStatus;
        }
    }

    // Load Items
    await loadItems();

    async function loadItems() {
        // ... (existing loadItems code remains same) ...
        const { data, error } = await supabase
            .from('lost_and_found')
            .select('*')
            .neq('status', 'Deleted')
            .order('reported_date', { ascending: false });

        if (error) {
            console.error(error);
            tableBody.innerHTML = '';
            const errorTemplate = document.getElementById('errorTableStateTemplate');
            if (errorTemplate) {
                tableBody.appendChild(errorTemplate.content.cloneNode(true));
            } else {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-red-500">Error loading items</td></tr>';
            }
            return;
        }

        allItems = data;
        document.getElementById('totalItemsCount').innerText = allItems.length;
        renderItems();
    }





    function renderItems() {
        tableBody.innerHTML = '';
        cardsView.innerHTML = '';

        const filterVal = statusFilter.value;
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;
        const query = searchInput.value.toLowerCase();

        // 1. Filter matches
        let filtered = allItems.filter(item => {
            const matchesStatus = filterVal === 'all' || item.status === filterVal;
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const itemDate = new Date(item.reported_date);
                itemDate.setHours(0, 0, 0, 0);

                if (dateFrom) {
                    const innerFrom = new Date(dateFrom);
                    innerFrom.setHours(0, 0, 0, 0);
                    if (itemDate < innerFrom) matchesDate = false;
                }

                if (dateTo && matchesDate) {
                    const innerTo = new Date(dateTo);
                    innerTo.setHours(0, 0, 0, 0);
                    if (itemDate > innerTo) matchesDate = false;
                }
            }

            const matchesSearch =
                (item.item_name || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query) ||
                (item.item_id || '').toLowerCase().includes(query) ||
                (item.location_lost || '').toLowerCase().includes(query);

            return matchesStatus && matchesDate && matchesSearch;
        });

        // 2. Pagination Logic
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage > totalPages) currentPage = totalPages || 1;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const pageItems = filtered.slice(startIndex, endIndex);

        document.getElementById('startRange').textContent = totalItems === 0 ? 0 : startIndex + 1;
        document.getElementById('endRange').textContent = endIndex;
        document.getElementById('totalEntries').textContent = totalItems;

        renderPaginationControls(totalPages);

        // 3. Render Items
        if (filtered.length === 0) {
            renderEmptyState();
            return;
        }

        pageItems.forEach(item => {
            const dateLost = item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'N/A';
            const reportedDate = item.reported_date ? new Date(item.reported_date).toLocaleDateString() : 'N/A';
            const location = item.location_lost || 'Unknown';
            const brand = item.brand ? `Brand: ${item.brand}` : '';
            const color = item.primary_color ? `Color: ${item.primary_color}` : '';
            const attributes = [brand, color].filter(Boolean).join(', ') || '-';

            // Status Styling
            let statusClass = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            if (item.status === 'Lost') statusClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            if (item.status === 'Claim') statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            if (item.status === 'Found') statusClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            if (item.status === 'Deleted') statusClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

            // --- A. Render Table Row ---
            const rowClone = itemRowTemplate.content.cloneNode(true);
            rowClone.querySelector('.item-name').textContent = item.item_name;
            rowClone.querySelector('.item-type').textContent = item.item_type;
            rowClone.querySelector('.item-location').textContent = location;
            rowClone.querySelector('.item-date').textContent = reportedDate; // Fixed: Use reported_date
            rowClone.querySelector('.item-attributes').textContent = attributes;

            const statusSpan = rowClone.querySelector('.item-status');
            statusSpan.textContent = item.status;
            statusSpan.className = `item-status px-3 py-1 rounded-full text-xs font-bold ${statusClass}`;

            // Buttons
            rowClone.querySelector('.btn-edit').onclick = () => window.openStatusModal(item.item_id, item.status);
            rowClone.querySelector('.btn-preview').href = `AdminLostFoundDetails.html?id=${item.item_id}`;
            rowClone.querySelector('.btn-delete').onclick = () => window.openDeleteModal(item.item_id);

            tableBody.appendChild(rowClone);

            // --- B. Render Card (Mobile) ---
            const cardClone = cardTemplate.content.cloneNode(true);
            cardClone.querySelector('.card-type').textContent = item.item_type;
            cardClone.querySelector('.card-title').textContent = item.item_name;
            cardClone.querySelector('.card-location span').textContent = location;
            cardClone.querySelector('.card-date').textContent = reportedDate; // Fixed: Use reported_date

            const cardStatus = cardClone.querySelector('.card-status');
            cardStatus.textContent = item.status;
            cardStatus.className = `card-status px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusClass}`;

            cardClone.querySelector('.card-attr').textContent = attributes;

            // Buttons
            cardClone.querySelector('.btn-edit').onclick = () => window.openStatusModal(item.item_id, item.status);
            cardClone.querySelector('.Link-preview').href = `AdminLostFoundDetails.html?id=${item.item_id}`;
            cardClone.querySelector('.btn-delete').onclick = () => window.openDeleteModal(item.item_id);

            cardsView.appendChild(cardClone);
        });
    }


    function renderEmptyState() {
        if (emptyTableStateTemplate) {
            const clone = emptyTableStateTemplate.content.cloneNode(true);
            tableBody.appendChild(clone);
        }
        if (emptyCardStateTemplate) {
            const clone = emptyCardStateTemplate.content.cloneNode(true);
            cardsView.appendChild(clone);
        }
    }


    function renderPaginationControls(totalPages) {
        paginationNumbers.innerHTML = '';
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        // Simple Pagination Logic: 1 2 3 ... 
        // For simplicity, just showing all numbers if < 7, else simple range

        let pages = [];
        if (totalPages <= 7) {
            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            // Always show first, last, current, and surrounding
            if (currentPage <= 4) {
                pages = [1, 2, 3, 4, 5, '...', totalPages];
            } else if (currentPage >= totalPages - 3) {
                pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
            }
        }

        pages.forEach(p => {
            const btn = document.createElement('button');
            btn.className = `px-3 py-1 border rounded ${p === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white'}`;

            if (p === '...') {
                btn.textContent = '...';
                btn.disabled = true;
                btn.classList.add('cursor-default', 'border-none');
            } else {
                btn.textContent = p;
                btn.onclick = () => {
                    currentPage = p;
                    renderItems();
                };
            }
            paginationNumbers.appendChild(btn);
        });
    }

    // Modal Elements & Logic
    const statusModal = document.getElementById('statusModal');
    const deleteModal = document.getElementById('deleteModal');
    const modalStatusSelect = document.getElementById('modalStatusSelect');
    const modalStatusReason = document.getElementById('modalStatusReason');
    const modalDeleteReason = document.getElementById('modalDeleteReason');

    let currentItemId = null;

    // Expose functions to window
    window.openStatusModal = (id, status) => {
        currentItemId = id;
        modalStatusSelect.value = status;
        modalStatusReason.value = '';
        statusModal.classList.remove('hidden');
    };

    window.openDeleteModal = (id) => {
        currentItemId = id;
        modalDeleteReason.value = '';
        deleteModal.classList.remove('hidden');
    };

    // Close Modals
    document.getElementById('cancelStatusBtn').addEventListener('click', () => statusModal.classList.add('hidden'));
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => deleteModal.classList.add('hidden'));

    // Confirm Update Status
    document.getElementById('confirmStatusBtn').addEventListener('click', async () => {
        const newStatus = modalStatusSelect.value;
        const reason = modalStatusReason.value.trim();

        if (!reason) {
            alert('Please provide a feedback message/reason.');
            return;
        }

        try {
            // Update DB
            const { error } = await supabase
                .from('lost_and_found')
                .update({ status: newStatus, admin_feedback: reason })
                .eq('item_id', currentItemId);

            if (error) throw error;

            // Notify User (DB + Email)
            const item = allItems.find(i => i.item_id === currentItemId);
            if (item && item.user_id) {
                // 1. DB Notification
                await supabase.from('notifications').insert([{
                    userid: item.user_id,
                    type: 'LostItemUpdate',
                    message: `Status updated to ${newStatus}. ${reason}`,
                    is_read: false,
                    lost_item_id: currentItemId
                }]);

                // 2. Email Notification
                sendEmailNotification(item, newStatus, reason);
            }

            statusModal.classList.add('hidden');
            await loadItems(); // Refresh
            alert(`Status updated to ${newStatus}`);

        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    });

    // Confirm Delete
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const reason = modalDeleteReason.value.trim();

        if (!reason) {
            alert('Please provide a reason for deletion.');
            return;
        }

        try {
            const { error } = await supabase
                .from('lost_and_found')
                .update({ status: 'Deleted', admin_feedback: reason })
                .eq('item_id', currentItemId);

            if (error) throw error;

            // Notify User (DB + Email)
            const item = allItems.find(i => i.item_id === currentItemId);
            if (item && item.user_id) {
                // 1. DB Notification
                await supabase.from('notifications').insert([{
                    userid: item.user_id,
                    type: 'Deleted',
                    message: `Your report was deleted. Reason: ${reason}`,
                    is_read: false,
                    lost_item_id: currentItemId
                }]);

                // 2. Email Notification
                sendEmailNotification(item, 'Deleted', reason);
            }

            deleteModal.classList.add('hidden');
            await loadItems(); // Refresh
            alert('Item marked as deleted.');

        } catch (err) {
            console.error(err);
            alert('Failed to delete item');
        }
    });

    async function sendEmailNotification(item, status, message) {
        try {
            // Fetch User Email
            const { data: user, error } = await supabase
                .from('users')
                .select('email, first_name')
                .eq('id', item.user_id)
                .single();

            if (error || !user || !user.email) return;

            const templateParams = {
                to_name: user.first_name || "Student",
                to_email: user.email,
                complaint_title: `Lost Item: ${item.item_name}`,
                new_status: status,
                message: message
            };

            // Public Key: 08jWWt0PNjZJ4BcQw, Service: service_q77wg09, Template: template_sb3k70p
            await emailjs.send('service_q77wg09', 'template_sb3k70p', templateParams, '08jWWt0PNjZJ4BcQw');
            console.log('Email sent successfully');

        } catch (err) {
            console.error('Failed to send email:', err);
        }
    }


    function setupMenuListeners() {
        const mobileMenuBtn = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('overlay'); // Ensure overlay is selected

        if (mobileMenuBtn && mobileMenu) {
            // Clone for specific robustness
            const newMobileBtn = mobileMenuBtn.cloneNode(true);
            mobileMenuBtn.parentNode.replaceChild(newMobileBtn, mobileMenuBtn);

            newMobileBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('-translate-x-full');
                if (overlay) overlay.classList.toggle('hidden');
            });

            if (overlay) {
                overlay.addEventListener('click', () => {
                    mobileMenu.classList.add('-translate-x-full');
                    overlay.classList.add('hidden');
                });
            }
        }

        // Profile Menu
        const profileBtn = document.getElementById('profileButton');
        const profileMenu = document.getElementById('profileMenu');

        if (profileBtn && profileMenu) {
            // Remove old listener if any (standard practice for clean re-init)
            const newProfileBtn = profileBtn.cloneNode(true);
            profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);

            newProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Toggle Hidden
                if (profileMenu.classList.contains('hidden')) {
                    profileMenu.classList.remove('hidden');
                } else {
                    profileMenu.classList.add('hidden');
                }
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!newProfileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });
        }

        // Logout
        const logoutBtn = document.getElementById('headerLogoutBtn');
        const modal = document.getElementById('logoutModal');
        if (logoutBtn && modal) {
            // Remove old listeners
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

            newLogoutBtn.addEventListener('click', () => modal.classList.remove('hidden'));

            // Modal Buttons (Assuming they don't have dup listeners or it's fine)
            // Ideally we should handle them safely too, but usually they are static.
            const cancelBtn = document.getElementById('cancelLogoutBtn');
            const confirmBtn = document.getElementById('confirmLogoutBtn');

            if (cancelBtn) cancelBtn.onclick = () => modal.classList.add('hidden');
            if (confirmBtn) confirmBtn.onclick = async () => {
                await supabase.auth.signOut();
                window.location.href = 'Login.html';
            };
        }
    }
});
