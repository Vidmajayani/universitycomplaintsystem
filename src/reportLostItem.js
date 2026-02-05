import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        window.location.href = "Login.html";
        return;
    }

    const form = document.getElementById("lostItemForm");
    const userId = session.user.id;

    // ----------------------------------------------------
    // UI Event Listeners (Initialize Immediately)
    // ----------------------------------------------------

    // Note: Mobile Menu and Profile logic is handled by darkMode.js globally.
    // We do NOT need to duplicate it here.

    // ----------------------------------------------------
    // IMAGE PREVIEW
    // ----------------------------------------------------
    const itemImageInput = document.getElementById("itemImage");
    const imagePreview = document.getElementById("imagePreview");

    itemImageInput.addEventListener("change", () => {
        imagePreview.innerHTML = "";
        if (itemImageInput.files) {
            Array.from(itemImageInput.files).forEach(file => {
                if (file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const container = document.createElement("div");
                        container.classList.add("relative", "w-24", "h-24");

                        const img = document.createElement("img");
                        img.src = e.target.result;
                        img.classList.add("w-full", "h-full", "object-cover", "rounded-lg", "border", "border-gray-200", "shadow-sm");

                        const deleteBtn = document.createElement("button");
                        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                        deleteBtn.classList.add("absolute", "-top-2", "-right-2", "bg-red-500", "text-white", "rounded-full", "w-6", "h-6", "flex", "items-center", "justify-center", "text-xs", "hover:bg-red-600", "shadow-md");
                        deleteBtn.onclick = (event) => {
                            event.preventDefault();
                            itemImageInput.value = "";
                            imagePreview.innerHTML = "";
                        };

                        container.appendChild(img);
                        container.appendChild(deleteBtn);
                        imagePreview.appendChild(container);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });

    // ----------------------------------------------------
    // Session Check & Data Loading
    // ----------------------------------------------------



    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Collect Data
        const itemName = document.getElementById("itemName").value.trim();
        const itemType = document.getElementById("itemType").value;
        const brand = document.getElementById("brand").value.trim();
        const model = document.getElementById("model").value.trim();
        const primaryColor = document.getElementById("primaryColor").value.trim();
        const secondaryColor = document.getElementById("secondaryColor").value.trim();
        const serialNumber = document.getElementById("serialNumber").value.trim();
        const locationLost = document.getElementById("locationLost").value.trim();
        const dateLost = document.getElementById("dateLost").value;
        const timeLost = document.getElementById("timeLost").value;
        const distinguishingFeatures = document.getElementById("distinguishingFeatures").value.trim();
        const description = document.getElementById("description").value.trim();
        const fileInput = document.getElementById("itemImage");

        if (!itemName || !itemType || !dateLost) {
            alert("Please fill in all required fields.");
            return;
        }

        // Validate File Type
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert("Invalid file attachment. Please upload an image.");
                return;
            }
        }

        try {
            const { data: adminData, error: adminError } = await supabase
                .from('admin')
                .select('id')
                .eq('adminrole', 'LostAndFound Admin')
                .single();

            if (adminError || !adminData) {
                console.error('Error fetching Lost & Found admin:', adminError);
                alert('Unable to assign admin. Please contact support.');
                return;
            }

            const lostFoundAdminId = adminData.id;

            // 2. Insert into lost_and_found table with admin_id
            const { data: itemData, error: itemError } = await supabase
                .from('lost_and_found')
                .insert([{
                    user_id: userId,
                    admin_id: lostFoundAdminId,  // Auto-assign Lost & Found admin
                    item_name: itemName,
                    item_type: itemType,
                    brand: brand || null,
                    model: model || null,
                    primary_color: primaryColor || null,
                    secondary_color: secondaryColor || null,
                    serial_number: serialNumber || null,
                    location_lost: locationLost,
                    date_lost: dateLost,
                    time_lost: timeLost || null,
                    distinguishing_features: distinguishingFeatures || null,
                    description: description || null,
                    status: 'Lost'
                }])
                .select()
                .single();

            if (itemError) {
                console.error('Error submitting report:', itemError);
                alert('Failed to submit report. Please try again.');
                return;
            }

            const itemId = itemData.item_id;

            // 2. Handle Image Upload if present
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `lost_${userId}_${Date.now()}.${fileExt}`;

                // Upload to 'lost_found_images' bucket
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('lost_found_images')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    // We don't stop the process, but we alert the user
                    alert('Report submitted, but image upload failed.');
                } else {
                    // Get Public URL
                    const { data: urlData } = supabase.storage
                        .from('lost_found_images')
                        .getPublicUrl(uploadData.path);

                    const publicUrl = urlData.publicUrl;

                    // Insert into lost_found_attachments
                    const { error: attachError } = await supabase
                        .from('lost_found_attachments')
                        .insert([{
                            lost_item_id: itemId,
                            file_url: publicUrl,
                            file_type: 'image',
                            uploaded_at: new Date().toISOString()
                        }]);

                    if (attachError) console.error('Error saving attachment link:', attachError);
                }
            }

            alert('Lost item reported successfully!');
            window.location.href = 'Mycomplaint.html?tab=lostfound';

        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred.');
        }
    });

});
