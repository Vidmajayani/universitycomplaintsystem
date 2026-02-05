import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // Role Check & Profile Pic Load
    const { data: admin, error: adminError } = await supabase
        .from('admin')
        .select('id, adminrole, profile_pic')
        .eq('id', session.user.id)
        .single();

    if (adminError || !admin) {
        window.location.href = 'Login.html';
        return;
    }

    // Update Profile Picture in Header
    const profileBtn = document.getElementById('profileButton');
    if (profileBtn && admin.profile_pic) {
        profileBtn.innerHTML = `
            <img src="${admin.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover pointer-events-none">
        `;
    }

    // Elements
    const uploadFoundItemForm = document.getElementById('uploadFoundItemForm');
    const foundItemImageInput = document.getElementById('foundItemImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const confirmUploadFoundBtn = document.getElementById('confirmUploadFoundBtn');

    // Setup Header/Menu listeners
    setupMenuListeners();

    // Prevent future dates in the calendar picker
    const todayLocal = new Date().toLocaleDateString('en-CA');
    document.getElementById('foundDateFound').setAttribute('max', todayLocal);

    // Image preview logic
    foundItemImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                imagePreview.classList.remove('hidden');
                uploadPlaceholder.classList.add('hidden');

                // Add red delete button if not exists
                let deleteBtn = imagePreview.querySelector('.delete-preview-btn');
                if (!deleteBtn) {
                    deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                    deleteBtn.classList.add('delete-preview-btn', "absolute", "-top-2", "-right-2", "bg-red-500", "text-white", "rounded-full", "w-6", "h-6", "flex", "items-center", "justify-center", "text-xs", "hover:bg-red-600", "shadow-md", "z-10");
                    deleteBtn.onclick = (event) => {
                        event.preventDefault();
                        foundItemImageInput.value = "";
                        imagePreview.classList.add('hidden');
                        uploadPlaceholder.classList.remove('hidden');
                    };
                    imagePreview.classList.add('relative');
                    imagePreview.appendChild(deleteBtn);
                }
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.classList.add('hidden');
            uploadPlaceholder.classList.remove('hidden');
        }
    });

    // Upload found item logic
    confirmUploadFoundBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleUploadFoundItem();
    });

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

        // Validate date is not in the future
        if (dateFound > todayLocal) {
            alert('The found date cannot be in the future.');
            return;
        }

        // Validate image size (5MB max)
        if (imageFile.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB.');
            return;
        }

        // Update Button State
        confirmUploadFoundBtn.disabled = true;
        confirmUploadFoundBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';

        let insertedItemId = null; // Track for rollback
        let uploadedFilePath = null;

        try {
            // 1. Upload image to Supabase Storage
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `found_items/${fileName}`;
            uploadedFilePath = filePath;

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
                throw new Error(`Database insert failed: ${insertError.message}`);
            }

            insertedItemId = insertedItem.found_item_id;

            // 3. Insert attachment record
            const { error: attachmentError } = await supabase
                .from('lost_found_attachments')
                .insert([{
                    found_item_id: insertedItem.found_item_id,
                    file_url: publicUrl,
                    file_type: 'image'
                }]);

            if (attachmentError) {
                throw new Error(`Attachment insert failed: ${attachmentError.message}`);
            }

            // Success!
            alert('Found item uploaded successfully!');
            window.location.href = 'AdminLostFound.html?tab=found';

        } catch (error) {
            console.error('Error uploading found item:', error);
            alert(`Failed to upload found item: ${error.message}`);

            // ROLLBACKS
            if (insertedItemId) {
                await supabase.from('found_items').delete().eq('found_item_id', insertedItemId);
            }
            if (uploadedFilePath) {
                await supabase.storage.from('lost_found_images').remove([uploadedFilePath]);
            }

            // Reset Button
            confirmUploadFoundBtn.disabled = false;
            confirmUploadFoundBtn.innerHTML = '<i class="fas fa-check-circle"></i>Confirm & Upload Item';
        }
    }

    function setupMenuListeners() {
        const profileBtn = document.getElementById('profileButton');
        const profileMenu = document.getElementById('profileMenu');
        const logoutModal = document.getElementById('logoutModal');
        const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
        const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
        const headerLogoutBtn = document.getElementById('headerLogoutBtn');
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('overlay');

        if (profileBtn && profileMenu) {
            // CRITICAL: Clone the button to remove all existing listeners (especially from darkMode.js)
            // This prevents the "double-toggle" issue where the menu opens and closes instantly.
            const newProfileBtn = profileBtn.cloneNode(true);
            profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);

            newProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                profileMenu.classList.toggle('hidden');
            });

            // Global click to close
            document.addEventListener('click', (e) => {
                if (!newProfileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });
        }

        // Logout Logic
        const showLogout = (e) => {
            if (e) e.preventDefault();
            if (profileMenu) profileMenu.classList.add('hidden');
            if (logoutModal) logoutModal.classList.remove('hidden');
        };

        if (headerLogoutBtn) {
            const newLogoutBtn = headerLogoutBtn.cloneNode(true);
            headerLogoutBtn.parentNode.replaceChild(newLogoutBtn, headerLogoutBtn);
            newLogoutBtn.addEventListener('click', showLogout);
        }

        if (cancelLogoutBtn) cancelLogoutBtn.onclick = () => logoutModal.classList.add('hidden');
        if (confirmLogoutBtn) {
            confirmLogoutBtn.onclick = async () => {
                await supabase.auth.signOut();
                window.location.href = 'Login.html';
            };
        }

        // Mobile Menu logic
        if (mobileMenuButton && mobileMenu && overlay) {
            const newMobileBtn = mobileMenuButton.cloneNode(true);
            mobileMenuButton.parentNode.replaceChild(newMobileBtn, mobileMenuButton);

            newMobileBtn.onclick = () => {
                mobileMenu.classList.toggle('-translate-x-full');
                overlay.classList.toggle('hidden');
            };

            overlay.onclick = () => {
                mobileMenu.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            };
        }
    }
});
