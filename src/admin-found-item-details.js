import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // Get found item ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const foundItemId = urlParams.get('id');

    if (!foundItemId) {
        alert('No found item ID provided');
        window.location.href = 'AdminLostFound.html';
        return;
    }

    // Load found item details
    await loadFoundItemDetails(foundItemId);

    // Setup menu listeners
    setupMenuListeners();

    async function loadFoundItemDetails(id) {
        try {
            // Fetch found item
            const { data: foundItem, error: itemError } = await supabase
                .from('found_items')
                .select('*')
                .eq('found_item_id', id)
                .single();

            if (itemError) throw itemError;

            console.log('Found item loaded:', foundItem);

            // Fetch admin details (non-blocking)
            let admin = null;
            try {
                const { data: adminData, error: adminError } = await supabase
                    .from('admin')
                    .select('adminfirstname, adminlastname, adminrole, profile_pic')
                    .eq('id', foundItem.admin_id)
                    .single();

                if (adminError) {
                    console.error('Admin fetch error:', adminError);
                } else {
                    admin = adminData;
                }
            } catch (err) {
                console.error('Admin fetch failed:', err);
            }

            // Fetch attachments
            const { data: attachments, error: attachError } = await supabase
                .from('lost_found_attachments')
                .select('*')
                .eq('found_item_id', id);

            if (attachError) {
                console.error('Attachments error:', attachError);
            }

            // Populate UI
            document.getElementById('itemName').textContent = foundItem.item_name || 'N/A';
            document.getElementById('itemTypeDisplay').textContent = foundItem.item_type || 'N/A';

            // Status badge
            const statusBadge = document.getElementById('statusBadge');
            statusBadge.textContent = foundItem.status;
            if (foundItem.status === 'Unclaimed') {
                statusBadge.className = 'px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 shadow-md';
            } else if (foundItem.status === 'Claimed') {
                statusBadge.className = 'px-4 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-800 shadow-md';
            }

            // Dates - use created_at as uploaded date
            document.getElementById('uploadedDate').textContent = foundItem.created_at
                ? new Date(foundItem.created_at).toLocaleDateString()
                : 'N/A';
            document.getElementById('dateFound').textContent = foundItem.date_found
                ? new Date(foundItem.date_found).toLocaleDateString()
                : 'N/A';
            document.getElementById('timeFound').textContent = foundItem.time_found || 'N/A';
            document.getElementById('locationFound').textContent = foundItem.location_found || 'N/A';

            // Specifications
            document.getElementById('brand').textContent = foundItem.brand || '--';
            document.getElementById('model').textContent = foundItem.model || '--';
            document.getElementById('serialNumber').textContent = foundItem.serial_number || '--';
            document.getElementById('primaryColor').textContent = foundItem.primary_color || '--';
            document.getElementById('secondaryColor').textContent = foundItem.secondary_color || '--';

            // Description
            document.getElementById('distFeatures').textContent = foundItem.distinguishing_features || 'None specified';
            document.getElementById('description').textContent = foundItem.description || 'No description provided';

            // Admin info
            if (admin) {
                const adminFullName = `${admin.adminfirstname || ''} ${admin.adminlastname || ''}`.trim() || 'Unknown Admin';
                document.getElementById('adminName').textContent = `${adminFullName} (${admin.adminrole || 'Admin'})`;
                const initials = `${admin.adminfirstname?.[0] || ''}${admin.adminlastname?.[0] || ''}`.toUpperCase() || 'A';
                document.getElementById('adminInitials').textContent = initials;
            } else {
                document.getElementById('adminName').textContent = 'Admin Info Unavailable';
                document.getElementById('adminInitials').textContent = 'A';
            }

            // Images
            if (attachments && attachments.length > 0) {
                const imageContainer = document.getElementById('imageContainer');
                imageContainer.innerHTML = '';
                attachments.forEach(att => {
                    const img = document.createElement('img');
                    img.src = att.file_url;
                    img.alt = 'Found Item Image';
                    img.className = 'h-48 w-auto rounded-lg border-2 border-gray-200 dark:border-gray-700 object-cover cursor-pointer hover:scale-105 transition-transform';
                    img.onclick = () => window.open(att.file_url, '_blank');
                    imageContainer.appendChild(img);
                });
            }

        } catch (error) {
            console.error('Error loading found item:', error);
            alert('Failed to load found item details');
            window.location.href = 'AdminLostFound.html';
        }
    }

    function setupMenuListeners() {
        const mobileMenuBtn = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('-translate-x-full');
            });
        }

        // Profile Menu
        const profileBtn = document.getElementById('profileButton');
        const profileMenu = document.getElementById('profileMenu');

        if (profileBtn && profileMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });
        }

        // Logout
        const logoutBtn = document.getElementById('headerLogoutBtn');
        const modal = document.getElementById('logoutModal');
        if (logoutBtn && modal) {
            logoutBtn.addEventListener('click', () => modal.classList.remove('hidden'));

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
