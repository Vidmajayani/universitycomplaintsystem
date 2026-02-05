import { supabase } from './supabaseClient.js';

// Global State
let currentItem = null;
let currentUploader = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        alert("No Item ID provided.");
        window.location.href = 'AdminLostFound.html';
        return;
    }

    // Header Setup
    setupMenuListeners();

    // Load Data
    await loadItemDetails(itemId);

    // Expose functions to window for HTML onClick
    window.updateStatus = (newStatus) => handleStatusUpdate(newStatus);
    window.deleteItem = () => handleDelete();
    window.openStatusModal = openStatusModal;
    window.closeStatusModal = closeStatusModal;
    window.confirmStatusUpdate = confirmStatusUpdate;
    window.openDeleteModal = openDeleteModal;
    window.closeDeleteModal = closeDeleteModal;
    window.confirmDelete = confirmDelete;
});

async function loadItemDetails(id) {
    // 1. Fetch Item
    const { data: item, error } = await supabase
        .from('lost_and_found')
        .select('*')
        .eq('item_id', id)
        .single();

    if (error || !item) {
        console.error("Error fetching item:", error);
        alert("Item not found.");
        return;
    }

    currentItem = item;

    // 2. Fetch User (Uploader)
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', item.user_id)
        .single();

    currentUploader = user;

    // 3. Fetch Currently Logged-In Admin
    let adminData = null;
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
        const { data: ad } = await supabase
            .from('admin')
            .select('*')
            .eq('id', authUser.id)
            .single();
        if (ad) {
            adminData = ad;

            // Update Profile Picture in Header if exists
            const profileBtn = document.getElementById('profileButton');
            if (profileBtn && ad.profile_pic) {
                profileBtn.innerHTML = `
                    <img src="${ad.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover">
                `;
            }
        }
    }

    // 4. Fetch Attachments
    const { data: attachments } = await supabase
        .from('lost_found_attachments')
        .select('*')
        .eq('lost_item_id', id);

    // Render All
    renderDetails(item, user, adminData, attachments);
}

// Modal Functions
function openStatusModal() {
    const modal = document.getElementById('statusModal');
    const select = document.getElementById('modalStatusSelect');
    const textarea = document.getElementById('modalStatusReason');

    if (currentItem) {
        select.value = currentItem.status;
        textarea.value = '';
    }

    // Add change listener for status select to show/hide Found Item ID field
    const foundItemIdContainer = document.getElementById('foundItemIdContainer');
    const foundItemIdInput = document.getElementById('modalFoundItemId');
    const errorMsg = document.getElementById('foundItemIdError');

    // Remove old listener if exists
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);

    newSelect.addEventListener('change', function () {
        if (this.value === 'Found') {
            foundItemIdContainer.classList.remove('hidden');
        } else {
            foundItemIdContainer.classList.add('hidden');
            foundItemIdInput.value = '';
            errorMsg.classList.add('hidden');
        }
    });

    // Trigger change event to set initial state
    newSelect.dispatchEvent(new Event('change'));

    modal.classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('statusModal').classList.add('hidden');
}

async function confirmStatusUpdate() {
    const newStatus = document.getElementById('modalStatusSelect').value;
    const message = document.getElementById('modalStatusReason').value.trim();
    const foundItemId = document.getElementById('modalFoundItemId').value.trim();
    const errorMsg = document.getElementById('foundItemIdError');

    // Clear previous error
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';

    // Validation
    if (!message && newStatus !== 'Lost') {
        alert('Please enter a message for the user.');
        return;
    }

    // If status is 'Found', Found Item ID is required
    if (newStatus === 'Found') {
        if (!foundItemId) {
            errorMsg.textContent = 'Found Item ID is required when marking as Found.';
            errorMsg.classList.remove('hidden');
            return;
        }

        // Validate Found Item ID
        try {
            const { data: foundItem, error } = await supabase
                .from('found_items')
                .select('found_item_id, status, item_name')
                .eq('found_item_id', foundItemId)
                .single();

            if (error || !foundItem) {
                errorMsg.textContent = 'Found Item ID does not exist in the system.';
                errorMsg.classList.remove('hidden');
                return;
            }

            if (foundItem.status !== 'Unclaimed') {
                errorMsg.textContent = `This Found Item is already ${foundItem.status}. Please use an Unclaimed item.`;
                errorMsg.classList.remove('hidden');
                return;
            }

            // Validation passed
        } catch (err) {
            console.error('Validation error:', err);
            errorMsg.textContent = 'Error validating Found Item ID. Please try again.';
            errorMsg.classList.remove('hidden');
            return;
        }
    }

    // If status is 'Claim' and Found Item ID is provided, block it
    if (newStatus === 'Claim' && foundItemId) {
        errorMsg.textContent = 'Cannot link Found Item ID when status is Claim. Only use Found Item ID for Found status.';
        errorMsg.classList.remove('hidden');
        return;
    }

    closeStatusModal();
    await handleStatusUpdate(newStatus, message, foundItemId);
}

function openDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const textarea = document.getElementById('modalDeleteReason');
    textarea.value = '';
    modal.classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
    const reason = document.getElementById('modalDeleteReason').value.trim();

    if (!reason) {
        alert('Please enter a reason for deletion.');
        return;
    }

    closeDeleteModal();
    await handleDelete(reason);
}

function renderDetails(item, user, admin, attachments) {
    // Display Database ID
    document.getElementById('databaseId').textContent = item.item_id;

    // Header Info
    document.getElementById('itemName').textContent = item.item_name;
    document.getElementById('itemTypeDisplay').textContent = item.item_type;

    // Status Badge & Color
    const badge = document.getElementById('statusBadge');
    const headerBorder = document.getElementById('statusHeaderBorder');
    badge.textContent = item.status;

    let colorClass, borderColor;
    if (item.status === 'Lost') { colorClass = 'bg-orange-100 text-orange-800'; borderColor = 'border-orange-400'; }
    else if (item.status === 'Claim') { colorClass = 'bg-blue-100 text-blue-800'; borderColor = 'border-blue-400'; }
    else if (item.status === 'Found') { colorClass = 'bg-green-100 text-green-800'; borderColor = 'border-green-400'; }
    else if (item.status === 'Deleted') { colorClass = 'bg-red-100 text-red-800'; borderColor = 'border-red-400'; }

    badge.className = `px-4 py-1.5 rounded-full text-sm font-bold ${colorClass}`;
    headerBorder.className = `bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-t-8 ${borderColor}`;

    // Basic Info
    document.getElementById('reportedDate').textContent = new Date(item.reported_date).toLocaleDateString();
    document.getElementById('locationLost').textContent = item.location_lost || 'N/A';
    document.getElementById('dateLost').textContent = item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'N/A';
    document.getElementById('timeLost').textContent = item.time_lost || 'N/A';

    // Attributes
    document.getElementById('brand').textContent = item.brand || '--';
    document.getElementById('model').textContent = item.model || '--';
    document.getElementById('serialNumber').textContent = item.serial_number || '--';
    document.getElementById('primaryColor').textContent = item.primary_color || '--';
    document.getElementById('secondaryColor').textContent = item.secondary_color || '--';

    // Descriptions
    document.getElementById('distFeatures').textContent = item.distinguishing_features || 'None reported.';
    document.getElementById('description').textContent = item.description || 'No description provided.';
    document.getElementById('adminFeedbackDisplay').textContent = item.admin_feedback || 'No notices sent.';

    // User Info
    if (user) {
        document.getElementById('userName').textContent = `${user.first_name || ''} ${user.last_name || ''}`;
        document.getElementById('userEmail').textContent = user.email || 'N/A';
        document.getElementById('userId').textContent = user.id || 'N/A';

        // Profile Pic Logic
        const userImg = document.getElementById('userProfilePic');
        const userInitials = document.getElementById('userInitials');

        if (user.profile_image_url) {
            userImg.src = user.profile_image_url;
            userImg.classList.remove('hidden');
            userInitials.classList.add('hidden');
        } else {
            userInitials.textContent = (user.first_name?.[0] || 'U') + (user.last_name?.[0] || '');
            userInitials.classList.remove('hidden');
            userImg.classList.add('hidden');
        }
    } else {
        document.getElementById('userName').textContent = "Unknown User";
        document.getElementById('userEmail').textContent = "N/A";
        document.getElementById('userId').textContent = "N/A";
    }

    // Admin Info
    const adminNameEl = document.getElementById('adminName');
    const adminInitialsEl = document.getElementById('adminInitials');
    const adminImgEl = document.getElementById('adminProfilePic');

    if (admin) {
        // Use correct column names: adminfirstname, adminlastname
        const aName = `${admin.adminfirstname || ''} ${admin.adminlastname || ''}`.trim();
        adminNameEl.textContent = `${aName} (${admin.adminrole || 'Admin'})`;

        if (admin.profile_pic) {
            adminImgEl.src = admin.profile_pic;
            adminImgEl.classList.remove('hidden');
            adminInitialsEl.classList.add('hidden');
        } else {
            const f = admin.adminfirstname ? admin.adminfirstname[0] : 'A';
            const l = admin.adminlastname ? admin.adminlastname[0] : '';
            adminInitialsEl.textContent = (f + l).toUpperCase();
            adminInitialsEl.classList.remove('hidden');
            adminImgEl.classList.add('hidden');
        }
    } else {
        adminNameEl.textContent = "Unassigned / Pending Review";
        adminInitialsEl.textContent = "?";
        adminInitialsEl.classList.remove('hidden');
        adminImgEl.classList.add('hidden');
    }

    // Attachments
    const imgContainer = document.getElementById('imageContainer');
    imgContainer.innerHTML = '';
    if (attachments && attachments.length > 0) {
        attachments.forEach(att => {
            const img = document.createElement('img');
            img.src = att.file_url;
            img.className = "h-40 rounded shadow border hover:scale-105 transition cursor-pointer object-cover";
            img.onclick = () => window.open(att.file_url, '_blank');
            imgContainer.appendChild(img);
        });
    } else {
        imgContainer.innerHTML = '<span class="text-gray-400 text-sm italic">No images attached.</span>';
    }

    // Load matched found item if status is 'Found'
    if (item.status === 'Found' && item.matched_found_item_id) {
        loadMatchedFoundItem(item.matched_found_item_id);
    }
}

async function loadMatchedFoundItem(foundItemId) {
    try {
        const { data: foundItem, error } = await supabase
            .from('found_items')
            .select('found_item_id, item_name, item_type, location_found, date_found')
            .eq('found_item_id', foundItemId)
            .single();

        if (error || !foundItem) {
            console.error('Error loading matched found item:', error);
            return;
        }

        // Show the card
        document.getElementById('matchedFoundItemCard').classList.remove('hidden');

        // Populate data
        document.getElementById('matchedFoundId').textContent = foundItem.found_item_id;
        document.getElementById('matchedFoundItemName').textContent = foundItem.item_name || 'N/A';
        document.getElementById('matchedFoundItemType').textContent = foundItem.item_type || 'N/A';
        document.getElementById('matchedFoundLocation').textContent = foundItem.location_found || 'N/A';

    } catch (err) {
        console.error('Error fetching matched found item:', err);
    }
}

async function handleStatusUpdate(newStatus, message = '', foundItemId = '') {
    // If called from old method, prompt for message
    if (!message && newStatus === 'Claim') {
        message = prompt("Please enter a message for the user (e.g., 'A matching item was found at the Security Office. Please visit to verify.'):");
        if (message === null) return; // Cancelled
        if (!message) message = "A potential match has been found. Please visit the admin office.";
    } else if (!message && newStatus === 'Found') {
        const confirmFound = confirm("Mark this item as Returned/Found? This indicates the owner has retrieved the item.");
        if (!confirmFound) return;
        message = "Item has been successfully returned to the owner.";
    } else if (!message) {
        message = "Status updated by administrator.";
    }

    try {
        const adminId = (await supabase.auth.getUser()).data.user.id;

        // 1. Update lost_and_found table
        const updateData = {
            status: newStatus,
            admin_feedback: message,
            admin_id: adminId
        };

        // If Found status and Found Item ID provided, store the match
        if (newStatus === 'Found' && foundItemId) {
            updateData.matched_found_item_id = foundItemId;
        }

        const { error: updateError } = await supabase
            .from('lost_and_found')
            .update(updateData)
            .eq('item_id', currentItem.item_id);

        if (updateError) throw updateError;

        // 2. If Found status with Found Item ID, update the found item
        if (newStatus === 'Found' && foundItemId) {
            const { error: foundUpdateError } = await supabase
                .from('found_items')
                .update({
                    status: 'Claimed',
                    matched_lost_item_id: currentItem.item_id
                })
                .eq('found_item_id', foundItemId);

            if (foundUpdateError) {
                console.error('Error updating found item:', foundUpdateError);

                // ROLLBACK: Revert the lost item update
                console.log('Rolling back lost item update...');
                const { error: rollbackError } = await supabase
                    .from('lost_and_found')
                    .update({
                        status: currentItem.status, // Restore original status
                        admin_feedback: currentItem.admin_feedback, // Restore original feedback
                        matched_found_item_id: null // Remove the match
                    })
                    .eq('item_id', currentItem.item_id);

                if (rollbackError) {
                    console.error('Rollback failed:', rollbackError);
                    alert('CRITICAL ERROR: Update failed and rollback also failed. Please contact system administrator immediately.');
                    throw new Error('Transaction failed with rollback error');
                }

                // Rollback successful
                alert('Update failed: Could not update found item status. All changes have been rolled back. Please try again or contact support if the issue persists.');
                throw new Error('Found item update failed, transaction rolled back');
            }
        }

        // 2. Insert Notification manually
        const { error: notifError } = await supabase
            .from('notifications')
            .insert([{
                userid: currentItem.user_id,
                type: newStatus, // Use the status directly (Claim, Found) for better tracking
                message: `Your lost item report '${currentItem.item_name}' status updated to ${newStatus}. Details: ${message}`,
                is_read: false,
                lost_item_id: currentItem.item_id
            }]);

        if (notifError) console.error("Notification failed:", notifError);

        // 3. Email Notification
        if (currentUploader && currentUploader.email) {
            const templateParams = {
                to_name: currentUploader.first_name || "Student",
                to_email: currentUploader.email,
                complaint_title: `Lost Item: ${currentItem.item_name}`,
                new_status: newStatus,
                message: message
            };
            await emailjs.send('service_q77wg09', 'template_sb3k70p', templateParams, '08jWWt0PNjZJ4BcQw');
        }

        alert(`Status updated to ${newStatus} successfully.`);
        location.reload();

    } catch (err) {
        console.error("Error updating status:", err);
        alert("Failed to update status.");
    }
}

async function handleDelete(reason = '') {
    // If called from old method, prompt for reason
    if (!reason) {
        reason = prompt("Reason for deletion?");
        if (reason === null) return;
    }

    try {
        const { error } = await supabase
            .from('lost_and_found')
            .update({
                status: 'Deleted',
                admin_feedback: reason || "Deleted by Admin"
            })
            .eq('item_id', currentItem.item_id);

        if (error) throw error;

        // Notify User
        await supabase
            .from('notifications')
            .insert([{
                userid: currentItem.user_id,
                type: 'Deleted',
                message: `Your lost item report '${currentItem.item_name}' was deleted. Reason: ${reason || 'N/A'}`,
                is_read: false,
                lost_item_id: currentItem.item_id
            }]);

        // Email Notification
        if (currentUploader && currentUploader.email) {
            const templateParams = {
                to_name: currentUploader.first_name || "Student",
                to_email: currentUploader.email,
                complaint_title: `Lost Item: ${currentItem.item_name}`,
                new_status: 'Deleted',
                message: reason || 'N/A'
            };
            await emailjs.send('service_q77wg09', 'template_sb3k70p', templateParams, '08jWWt0PNjZJ4BcQw');
        }

        alert("Item deleted.");
        window.location.href = "AdminLostFound.html";

    } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete item.");
    }
}

function setupMenuListeners() {
    const mobileMenuBtn = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');

    if (mobileMenuBtn && mobileMenu && overlay) {
        // Clone to clear listeners
        const newMobileBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.parentNode.replaceChild(newMobileBtn, mobileMenuBtn);

        newMobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });

        overlay.addEventListener('click', () => {
            mobileMenu.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }

    const profileBtn = document.getElementById('profileButton');
    const profileMenu = document.getElementById('profileMenu');
    if (profileBtn && profileMenu) {
        // Clone to clear listeners
        const newProfileBtn = profileBtn.cloneNode(true);
        profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);

        newProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Simple Toggle
            if (profileMenu.classList.contains('hidden')) {
                profileMenu.classList.remove('hidden');
            } else {
                profileMenu.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!newProfileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.classList.add('hidden');
            }
        });
    }

    const logoutBtn = document.getElementById('headerLogoutBtn');
    const modal = document.getElementById('logoutModal');
    if (logoutBtn && modal) {
        logoutBtn.addEventListener('click', () => modal.classList.remove('hidden'));
        document.getElementById('cancelLogoutBtn').addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('confirmLogoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'Login.html';
        });
    }
}
