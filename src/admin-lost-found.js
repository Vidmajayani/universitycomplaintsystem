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
    let allFoundItems = []; // Store found items separately
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentTab = 'all'; // 'all', 'lost', 'found'

    // Advanced Filter State
    let activeFilters = {
        source: 'all', // 'all', 'lost', 'found'
        categories: [], // ['Electronics', 'Documents', etc.]
        statuses: [], // ['Lost', 'Claim', 'Found', 'Unclaimed', 'Claimed']
        dateFrom: null,
        dateTo: null
    };

    // Setup Header/Menu listeners
    setupMenuListeners();

    // Tab Switching
    const tabAllRequests = document.getElementById('tabAllRequests');
    const tabLostItems = document.getElementById('tabLostItems');
    const tabFoundItems = document.getElementById('tabFoundItems');
    const uploadFoundItemBtn = document.getElementById('uploadFoundItemBtn');

    tabAllRequests.addEventListener('click', () => switchTab('all'));
    tabLostItems.addEventListener('click', () => switchTab('lost'));
    tabFoundItems.addEventListener('click', () => switchTab('found'));

    function switchTab(tab) {
        currentTab = tab;
        currentPage = 1;

        // Update active tab styling
        [tabAllRequests, tabLostItems, tabFoundItems].forEach(t => t.classList.remove('active'));
        if (tab === 'all') tabAllRequests.classList.add('active');
        if (tab === 'lost') tabLostItems.classList.add('active');
        if (tab === 'found') tabFoundItems.classList.add('active');

        // Sync Item Source filter with current tab
        activeFilters.source = tab;

        // Update Item Source toggle buttons in modal
        document.querySelectorAll('.filter-source-btn').forEach(btn => {
            btn.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
            btn.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
        });
        const activeSourceBtn = document.querySelector(`.filter-source-btn[data-source="${tab}"]`);
        if (activeSourceBtn) {
            activeSourceBtn.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            activeSourceBtn.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
        }

        // Show/hide upload button - visible on 'all' and 'found' tabs
        if (tab === 'all' || tab === 'found') {
            uploadFoundItemBtn.classList.remove('hidden');
        } else {
            uploadFoundItemBtn.classList.add('hidden');
        }

        renderItems();
    }

    // Initial button visibility - visible on 'all' tab by default
    if (currentTab === 'all' || currentTab === 'found') {
        uploadFoundItemBtn.classList.remove('hidden');
    }

    // Upload Found Item Modal
    const uploadFoundModal = document.getElementById('uploadFoundModal');
    const uploadFoundItemForm = document.getElementById('uploadFoundItemForm');
    const foundItemImageInput = document.getElementById('foundItemImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    uploadFoundItemBtn.addEventListener('click', () => {
        uploadFoundModal.classList.remove('hidden');
    });

    document.getElementById('cancelUploadFoundBtn').addEventListener('click', () => {
        uploadFoundModal.classList.add('hidden');
        uploadFoundItemForm.reset();
        imagePreview.classList.add('hidden');
    });

    // Image preview
    foundItemImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Upload found item
    document.getElementById('confirmUploadFoundBtn').addEventListener('click', async () => {
        await handleUploadFoundItem();
    });

    // Filter Modal Elements
    const filterModal = document.getElementById('filterModal');
    const filterDrawer = document.getElementById('filterDrawer');
    const openFiltersBtn = document.getElementById('openFiltersBtn');
    const closeFiltersBtn = document.getElementById('closeFiltersBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const filterBadge = document.getElementById('filterBadge');

    const searchInput = document.getElementById('searchInput');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationNumbers = document.getElementById('paginationNumbers');

    // Filter Modal Event Listeners
    openFiltersBtn.addEventListener('click', () => {
        filterModal.classList.remove('hidden');
        setTimeout(() => {
            filterDrawer.classList.remove('scale-95', 'opacity-0');
            filterDrawer.classList.add('scale-100', 'opacity-100');
        }, 10);
    });

    closeFiltersBtn.addEventListener('click', closeFilterModal);
    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) closeFilterModal();
    });

    function closeFilterModal() {
        filterDrawer.classList.remove('scale-100', 'opacity-100');
        filterDrawer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            filterModal.classList.add('hidden');
        }, 300);
    }

    // Source Toggle Buttons
    document.querySelectorAll('.filter-source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.source;

            // Update button styling only
            document.querySelectorAll('.filter-source-btn').forEach(b => {
                b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
                b.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            });
            btn.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            btn.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');

            // Store in filter state but don't switch tabs yet
            activeFilters.source = source;
        });
    });

    // Initialize source toggle
    document.querySelector('.filter-source-btn[data-source="all"]').click();

    // Category Chips
    document.querySelectorAll('.filter-category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const category = chip.dataset.category;
            const index = activeFilters.categories.indexOf(category);

            if (index > -1) {
                activeFilters.categories.splice(index, 1);
                chip.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
                chip.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            } else {
                activeFilters.categories.push(category);
                chip.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
                chip.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
            }
        });
        // Initialize
        chip.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
    });

    // Status Chips
    document.querySelectorAll('.filter-status-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const status = chip.dataset.status;
            const index = activeFilters.statuses.indexOf(status);

            if (index > -1) {
                activeFilters.statuses.splice(index, 1);
                chip.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
                chip.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            } else {
                activeFilters.statuses.push(status);
                chip.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
                chip.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
            }
        });
        // Initialize
        chip.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
    });

    // Date Preset Buttons
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const today = new Date();
            let fromDate, toDate;

            switch (preset) {
                case 'today':
                    fromDate = toDate = today;
                    break;
                case 'last7days':
                    toDate = today;
                    fromDate = new Date(today);
                    fromDate.setDate(today.getDate() - 7);
                    break;
                case 'last30days':
                    toDate = today;
                    fromDate = new Date(today);
                    fromDate.setDate(today.getDate() - 30);
                    break;
                case 'thismonth':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    toDate = today;
                    break;
            }

            // Format dates as YYYY-MM-DD for input fields
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            document.getElementById('filterModalDateFrom').value = formatDate(fromDate);
            document.getElementById('filterModalDateTo').value = formatDate(toDate);

            // Update active state styling
            document.querySelectorAll('.date-preset-btn').forEach(b => {
                b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
                b.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            });
            btn.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
            btn.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
        });
    });

    // Apply Filters
    applyFiltersBtn.addEventListener('click', () => {
        activeFilters.dateFrom = document.getElementById('filterModalDateFrom').value;
        activeFilters.dateTo = document.getElementById('filterModalDateTo').value;
        updateFilterBadge();

        // Sync currentTab with activeFilters.source on Apply
        switchTab(activeFilters.source);

        closeFilterModal();
    });

    // Clear Filters
    clearFiltersBtn.addEventListener('click', () => {
        activeFilters = {
            source: 'all',
            categories: [],
            statuses: [],
            dateFrom: null,
            dateTo: null
        };

        // Reset UI
        document.querySelectorAll('.filter-category-chip, .filter-status-chip, .date-preset-btn').forEach(chip => {
            chip.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/30', 'dark:text-blue-300');
            chip.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
        });
        document.querySelector('.filter-source-btn[data-source="all"]').click();
        document.getElementById('filterModalDateFrom').value = '';
        document.getElementById('filterModalDateTo').value = '';

        updateFilterBadge();
        currentPage = 1;
        renderItems();
    });

    function updateFilterBadge() {
        let count = 0;
        if (activeFilters.source !== 'all') count++;
        count += activeFilters.categories.length;
        count += activeFilters.statuses.length;
        if (activeFilters.dateFrom || activeFilters.dateTo) count++;

        if (count > 0) {
            filterBadge.textContent = count;
            filterBadge.classList.remove('hidden');
        } else {
            filterBadge.classList.add('hidden');
        }
    }

    // Search Input
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
    await loadFoundItems();

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
        if (allFoundItems.length > 0) renderItems(); // Only render if we have both or found is loaded
    }

    async function loadFoundItems() {
        const { data, error } = await supabase
            .from('found_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading found items:', error);
            return;
        }

        allFoundItems = data || [];
        renderItems(); // Ensure found items are rendered after loading
    }

    function updateTotalCount(filteredCount = null) {
        const totalItemsCountEl = document.getElementById('totalItemsCount');
        const countLabel = totalItemsCountEl.parentElement.childNodes[0]; // "Total Items: " text

        let displayCount = 0;
        const isFiltered = activeFilters.categories.length > 0 ||
            activeFilters.statuses.length > 0 ||
            activeFilters.dateFrom ||
            activeFilters.dateTo ||
            searchInput.value.trim() !== '';

        if (filteredCount !== null) {
            displayCount = filteredCount;
            if (isFiltered) {
                countLabel.textContent = 'Results Found: ';
            } else {
                countLabel.textContent = 'Total Items: ';
            }
        } else {
            // Absolute totals for the current tab
            if (currentTab === 'all') {
                displayCount = allItems.length + allFoundItems.length;
            } else if (currentTab === 'lost') {
                displayCount = allItems.length;
            } else if (currentTab === 'found') {
                displayCount = allFoundItems.length;
            }
            countLabel.textContent = 'Total Items: ';
        }

        totalItemsCountEl.innerText = displayCount;
    }





    function renderItems() {
        tableBody.innerHTML = '';
        cardsView.innerHTML = '';

        const query = searchInput.value.toLowerCase();

        // Determine which items to display based on currentTab (synced with activeFilters.source)
        let itemsToRender = [];

        if (currentTab === 'all') {
            // Combine lost and found items
            itemsToRender = [
                ...allItems.map(item => ({ ...item, itemSource: 'lost' })),
                ...allFoundItems.map(item => ({ ...item, itemSource: 'found' }))
            ];
        } else if (currentTab === 'lost') {
            itemsToRender = allItems.map(item => ({ ...item, itemSource: 'lost' }));
        } else if (currentTab === 'found') {
            itemsToRender = allFoundItems.map(item => ({ ...item, itemSource: 'found' }));
        }

        // Apply all filters
        let filtered = itemsToRender.filter(item => {
            // Category filter
            const matchesCategory = activeFilters.categories.length === 0 ||
                activeFilters.categories.includes(item.item_type);

            // Status filter
            const matchesStatus = activeFilters.statuses.length === 0 ||
                activeFilters.statuses.includes(item.status);

            // Date filter
            let matchesDate = true;
            if (activeFilters.dateFrom || activeFilters.dateTo) {
                const itemDate = new Date(item.itemSource === 'lost' ? item.reported_date : item.created_at);
                itemDate.setHours(0, 0, 0, 0);

                if (activeFilters.dateFrom) {
                    const innerFrom = new Date(activeFilters.dateFrom);
                    innerFrom.setHours(0, 0, 0, 0);
                    if (itemDate < innerFrom) matchesDate = false;
                }

                if (activeFilters.dateTo && matchesDate) {
                    const innerTo = new Date(activeFilters.dateTo);
                    innerTo.setHours(0, 0, 0, 0);
                    if (itemDate > innerTo) matchesDate = false;
                }
            }

            // Enhanced search filter - searches across multiple fields
            const location = item.itemSource === 'lost' ? (item.location_lost || '') : (item.location_found || '');
            const matchesSearch =
                (item.item_name || '').toLowerCase().includes(query) ||
                (item.item_type || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query) ||
                (item.distinguishing_features || '').toLowerCase().includes(query) ||
                (item.brand || '').toLowerCase().includes(query) ||
                (item.model || '').toLowerCase().includes(query) ||
                (item.serial_number || '').toLowerCase().includes(query) ||
                (item.primary_color || '').toLowerCase().includes(query) ||
                (item.secondary_color || '').toLowerCase().includes(query) ||
                location.toLowerCase().includes(query);

            return matchesCategory && matchesStatus && matchesDate && matchesSearch;
        });

        // 2. Pagination Logic
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        updateTotalCount(totalItems); // Update header count with filtered total

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
            // Handle different date/location fields for lost vs found items
            const isFoundItem = item.itemSource === 'found';

            const dateLost = item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'N/A';
            const reportedDate = isFoundItem
                ? (item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A')
                : (item.reported_date ? new Date(item.reported_date).toLocaleDateString() : 'N/A');

            const location = isFoundItem ? (item.location_found || 'Unknown') : (item.location_lost || 'Unknown');
            const brand = item.brand ? `Brand: ${item.brand}` : '';
            const color = item.primary_color ? `Color: ${item.primary_color}` : '';
            const attributes = [brand, color].filter(Boolean).join(', ') || '-';

            // Status Styling
            let statusClass = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            let statusText = item.status || 'N/A';

            if (isFoundItem) {
                // Found item statuses (Read-only display)
                if (item.status === 'Unclaimed') statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                if (item.status === 'Claimed') statusClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            } else {
                // Lost item statuses
                if (item.status === 'Lost') statusClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
                if (item.status === 'Claim') statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
                if (item.status === 'Found') statusClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                if (item.status === 'Deleted') statusClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            }

            const itemId = isFoundItem ? item.found_item_id : item.item_id;

            // --- A. Render Table Row ---
            const rowClone = itemRowTemplate.content.cloneNode(true);
            rowClone.querySelector('.item-name').textContent = item.item_name;

            // Source badge
            const sourceSpan = rowClone.querySelector('.item-source');
            if (isFoundItem) {
                sourceSpan.textContent = 'Found Item';
                sourceSpan.className = 'item-source px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            } else {
                sourceSpan.textContent = 'Lost Item';
                sourceSpan.className = 'item-source px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            }

            rowClone.querySelector('.item-type').textContent = item.item_type;
            rowClone.querySelector('.item-location').textContent = location;
            rowClone.querySelector('.item-date').textContent = reportedDate; // Fixed: Use reported_date
            rowClone.querySelector('.item-attributes').textContent = attributes;

            const statusSpan = rowClone.querySelector('.item-status');
            statusSpan.textContent = statusText;
            statusSpan.className = `item-status px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusClass}`;

            // Buttons
            if (isFoundItem) {
                // Found items: only preview (manual status/delete disabled as it's automatic)
                rowClone.querySelector('.btn-edit').style.display = 'none';
                rowClone.querySelector('.btn-delete').style.display = 'none';
            } else {
                // Lost items: full manual control
                rowClone.querySelector('.btn-edit').onclick = () => window.openStatusModal(itemId, item.status, item.itemSource);
                rowClone.querySelector('.btn-delete').onclick = () => window.openDeleteModal(itemId, item.itemSource);
            }
            rowClone.querySelector('.btn-preview').href = isFoundItem
                ? `AdminFoundItemDetails.html?id=${itemId}`
                : `AdminLostFoundDetails.html?id=${itemId}`;

            tableBody.appendChild(rowClone);

            // --- B. Render Card (Mobile) ---
            const cardClone = cardTemplate.content.cloneNode(true);
            cardClone.querySelector('.card-type').textContent = item.item_type;
            cardClone.querySelector('.card-title').textContent = item.item_name;
            cardClone.querySelector('.card-location span').textContent = location;
            cardClone.querySelector('.card-date').textContent = reportedDate; // Fixed: Use reported_date

            const cardStatus = cardClone.querySelector('.card-status');
            cardStatus.textContent = statusText;
            cardStatus.className = `card-status px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusClass}`;

            cardClone.querySelector('.card-attr').textContent = attributes;

            // Buttons
            if (isFoundItem) {
                // Found items: only preview
                cardClone.querySelector('.btn-edit').style.display = 'none';
                cardClone.querySelector('.btn-delete').style.display = 'none';
            } else {
                // Lost items: full manual control
                cardClone.querySelector('.btn-edit').onclick = () => window.openStatusModal(itemId, item.status, item.itemSource);
                cardClone.querySelector('.btn-delete').onclick = () => window.openDeleteModal(itemId, item.itemSource);
            }
            cardClone.querySelector('.Link-preview').href = isFoundItem
                ? `AdminFoundItemDetails.html?id=${itemId}`
                : `AdminLostFoundDetails.html?id=${itemId}`;

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
    let currentItemSource = null;

    // Expose functions to window
    window.openStatusModal = (id, status, source) => {
        currentItemId = id;
        currentItemSource = source;

        // Populate status dropdown based on source
        modalStatusSelect.innerHTML = '';
        if (source === 'found') {
            modalStatusSelect.innerHTML = `
                <option value="Unclaimed">Unclaimed</option>
                <option value="Claimed">Claimed</option>
            `;
        } else {
            modalStatusSelect.innerHTML = `
                <option value="Lost">Lost</option>
                <option value="Claim">Claim (Match)</option>
                <option value="Found">Found (Returned)</option>
            `;
        }

        modalStatusSelect.value = status;
        modalStatusReason.value = '';

        // Show/hide Found Item ID field based on status
        const foundItemIdContainer = document.getElementById('foundItemIdContainer');
        const foundItemIdInput = document.getElementById('modalFoundItemId');
        const foundItemIdError = document.getElementById('foundItemIdError');

        // Add change listener to status select
        modalStatusSelect.addEventListener('change', function () {
            if (this.value === 'Found' && currentItemSource !== 'found') {
                foundItemIdContainer.classList.remove('hidden');
            } else {
                foundItemIdContainer.classList.add('hidden');
                foundItemIdInput.value = '';
                foundItemIdError.classList.add('hidden');
            }
        });

        // Trigger initial state
        if (status === 'Found' && currentItemSource !== 'found') {
            foundItemIdContainer.classList.remove('hidden');
        } else {
            foundItemIdContainer.classList.add('hidden');
            foundItemIdInput.value = '';
            foundItemIdError.classList.add('hidden');
        }

        statusModal.classList.remove('hidden');
    };

    window.openDeleteModal = (id, source) => {
        currentItemId = id;
        currentItemSource = source;
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
        const foundItemId = document.getElementById('modalFoundItemId').value.trim();
        const foundItemIdError = document.getElementById('foundItemIdError');

        // Clear previous error
        foundItemIdError.classList.add('hidden');
        foundItemIdError.textContent = '';

        if (!reason) {
            alert('Please provide a feedback message/reason.');
            return;
        }

        // Validate Found Item ID if status is 'Found' and source is 'lost'
        if (newStatus === 'Found' && currentItemSource !== 'found') {
            if (!foundItemId) {
                foundItemIdError.textContent = 'Found Item ID is required when marking as Found.';
                foundItemIdError.classList.remove('hidden');
                return;
            }

            // Validate Found Item ID exists and is unclaimed
            try {
                const { data: foundItem, error: validationError } = await supabase
                    .from('found_items')
                    .select('found_item_id, status')
                    .eq('found_item_id', foundItemId)
                    .single();

                if (validationError || !foundItem) {
                    foundItemIdError.textContent = 'Found Item ID does not exist in the system.';
                    foundItemIdError.classList.remove('hidden');
                    return;
                }

                if (foundItem.status !== 'Unclaimed') {
                    foundItemIdError.textContent = `This Found Item is already ${foundItem.status}. Please use an Unclaimed item.`;
                    foundItemIdError.classList.remove('hidden');
                    return;
                }
            } catch (err) {
                console.error('Validation error:', err);
                foundItemIdError.textContent = 'Error validating Found Item ID. Please try again.';
                foundItemIdError.classList.remove('hidden');
                return;
            }
        }

        // Block Found Item ID for Claim status
        if (newStatus === 'Claim' && foundItemId) {
            foundItemIdError.textContent = 'Cannot link Found Item ID when status is Claim. Only use Found Item ID for Found status.';
            foundItemIdError.classList.remove('hidden');
            return;
        }

        try {
            // Update DB
            const targetTable = currentItemSource === 'found' ? 'found_items' : 'lost_and_found';
            const idField = currentItemSource === 'found' ? 'found_item_id' : 'item_id';

            const updateData = { status: newStatus, admin_feedback: reason };

            // If Found status with Found Item ID, store the match
            if (newStatus === 'Found' && foundItemId && currentItemSource !== 'found') {
                updateData.matched_found_item_id = foundItemId;
            }

            const { error } = await supabase
                .from(targetTable)
                .update(updateData)
                .eq(idField, currentItemId);

            if (error) throw error;

            // If Found status with Found Item ID, update the found item
            if (newStatus === 'Found' && foundItemId && currentItemSource !== 'found') {
                const { error: foundUpdateError } = await supabase
                    .from('found_items')
                    .update({
                        status: 'Claimed',
                        matched_lost_item_id: currentItemId
                    })
                    .eq('found_item_id', foundItemId);

                if (foundUpdateError) {
                    console.error('Error updating found item:', foundUpdateError);
                    alert('Lost item updated, but failed to update found item status. Please check manually.');
                }
            }

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
            await loadItems();
            await loadFoundItems(); // Refresh both
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
            const targetTable = currentItemSource === 'found' ? 'found_items' : 'lost_and_found';
            const idField = currentItemSource === 'found' ? 'found_item_id' : 'item_id';

            // Special case for found_items: check if it supports 'Deleted' status 
            // (schema says only Unclaimed/Claimed, so we might need to physically delete or check status)
            // For now, let's try updating status. If it fails due to constraint, we can handle it.
            const { error } = await supabase
                .from(targetTable)
                .update({ status: 'Deleted', admin_feedback: reason })
                .eq(idField, currentItemId);

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
            await loadItems();
            await loadFoundItems(); // Refresh both
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

    async function handleUploadFoundItem() {
        // Validate form
        const imageFile = foundItemImageInput.files[0];
        if (!imageFile) {
            alert('Please upload an image. Image is required for found items.');
            return;
        }

        const itemName = document.getElementById('foundItemName').value.trim();
        const itemType = document.getElementById('foundItemType').value;
        const locationFound = document.getElementById('foundLocationFound').value.trim();
        const dateFound = document.getElementById('foundDateFound').value;

        if (!itemName || !itemType || !locationFound || !dateFound) {
            alert('Please fill in all required fields (Item Name, Type, Location Found, Date Found).');
            return;
        }

        // Validate image size (5MB max)
        if (imageFile.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB.');
            return;
        }

        let insertedItemId = null; // Track for rollback

        try {
            // Get current admin
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Session expired. Please login again.');
                return;
            }

            // 1. Upload image to Supabase Storage FIRST
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `found_items/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('lost_found_images')
                .upload(filePath, imageFile);

            if (uploadError) {
                throw new Error(`Image upload failed: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('lost_found_images')
                .getPublicUrl(filePath);

            // 2. Insert found item into database
            const foundItemData = {
                admin_id: session.user.id,
                item_name: itemName,
                item_type: itemType,
                brand: document.getElementById('foundBrand').value.trim() || null,
                model: document.getElementById('foundModel').value.trim() || null,
                primary_color: document.getElementById('foundPrimaryColor').value.trim() || null,
                secondary_color: document.getElementById('foundSecondaryColor').value.trim() || null,
                serial_number: document.getElementById('foundSerialNumber').value.trim() || null,
                distinguishing_features: document.getElementById('foundDistinguishingFeatures').value.trim() || null,
                description: document.getElementById('foundDescription').value.trim() || null,
                location_found: locationFound,
                date_found: dateFound,
                time_found: document.getElementById('foundTimeFound').value || null,
                status: 'Unclaimed'
            };

            const { data: insertedItem, error: insertError } = await supabase
                .from('found_items')
                .insert([foundItemData])
                .select()
                .single();

            if (insertError) {
                // Rollback: Delete uploaded image
                await supabase.storage.from('lost_found_images').remove([filePath]);
                throw new Error(`Database insert failed: ${insertError.message}`);
            }

            insertedItemId = insertedItem.found_item_id; // Save for potential rollback

            // 3. Insert attachment record
            const { error: attachmentError } = await supabase
                .from('lost_found_attachments')
                .insert([{
                    found_item_id: insertedItem.found_item_id,
                    file_url: publicUrl,
                    file_type: 'image'
                }]);

            if (attachmentError) {
                // ROLLBACK: Delete the found item we just created
                await supabase.from('found_items').delete().eq('found_item_id', insertedItemId);
                // Also delete the uploaded image
                await supabase.storage.from('lost_found_images').remove([filePath]);
                throw new Error(`Attachment insert failed: ${attachmentError.message}`);
            }

            // Success!
            alert('Found item uploaded successfully!');
            uploadFoundModal.classList.add('hidden');
            uploadFoundItemForm.reset();
            imagePreview.classList.add('hidden');

            // Reload found items
            await loadFoundItems();
            renderItems();

        } catch (error) {
            console.error('Error uploading found item:', error);
            alert(`Failed to upload found item: ${error.message}`);
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
