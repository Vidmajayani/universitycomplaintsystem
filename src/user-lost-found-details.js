import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    const loadingState = document.getElementById("loadingState");
    const errorState = document.getElementById("errorState");
    const contentState = document.getElementById("contentState");

    // 1. Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "Login.html";
        return;
    }

    // 2. Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!id) {
        showError();
        return;
    }

    try {
        // 3. Fetch Data
        const { data: item, error } = await supabase
            .from("lost_and_found")
            .select(`
                *,
                lost_found_attachments (*)
            `)
            .eq("item_id", id)
            .eq("user_id", session.user.id)
            .single();

        if (error || !item) {
            console.error("Error fetching report:", error);
            showError();
            return;
        }

        // 4. Render
        renderDetails(item);
    } catch (err) {
        console.error("Unexpected error:", err);
        showError();
    }
});

function renderDetails(item) {
    const loadingState = document.getElementById("loadingState");
    const contentState = document.getElementById("contentState");

    // Basic Header
    document.getElementById("itemName").textContent = item.item_name;
    document.getElementById("itemTypeBadge").textContent = item.item_type;
    document.getElementById("reportedDate").textContent = new Date(item.reported_date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById("itemId").textContent = item.item_id;

    // Accent Color based on Status
    const accentColor = item.status === 'Found' ? '#10b981' : (item.status === 'Claim' ? '#3b82f6' : '#f59e0b');

    // Apply accent to icons
    const sectionIcons = [
        document.querySelector("section:has(#locationLost) h3 i"),
        document.querySelector("section:has(#brand) h3 i"),
        document.querySelector("#descriptionSection h3 i"),
        document.querySelector("#attachmentsSection h3 i")
    ];
    sectionIcons.forEach(icon => {
        if (icon) {
            icon.style.color = accentColor;
            icon.classList.remove("text-blue-500");
        }
    });

    // Status
    const lostStatusConfig = {
        "Lost": { color: "#ff9800", icon: "fas fa-question-circle", bg: "rgba(255, 152, 0, 0.1)", text: "Lost" },
        "Claim": { color: "#2196f3", icon: "fas fa-eye", bg: "rgba(33, 150, 243, 0.1)", text: "Match Found" },
        "Found": { color: "#4caf50", icon: "fas fa-check-circle", bg: "rgba(76, 175, 80, 0.1)", text: "Returned / Found" },
        "Deleted": { color: "#f44336", icon: "fas fa-trash-alt", bg: "rgba(244, 67, 54, 0.1)", text: "Deleted" }
    };
    const s = lostStatusConfig[item.status] || lostStatusConfig['Lost'];

    const statusBadge = document.getElementById("statusBadge");
    statusBadge.style.color = s.color;
    statusBadge.style.backgroundColor = s.bg;
    document.getElementById("statusIcon").className = s.icon;
    document.getElementById("statusText").textContent = s.text;

    // Grid details
    document.getElementById("locationLost").textContent = item.location_lost || "Not specified";
    document.getElementById("dateLost").textContent = item.date_lost ? new Date(item.date_lost).toLocaleDateString() : "Not specified";
    document.getElementById("timeLost").textContent = item.time_lost || "Not specified";

    document.getElementById("brand").textContent = item.brand || "Not specified";
    document.getElementById("model").textContent = item.model || "Not specified";

    const colors = [];
    if (item.primary_color) colors.push(item.primary_color);
    if (item.secondary_color) colors.push(item.secondary_color);
    document.getElementById("itemColors").textContent = colors.join(" / ") || "Not specified";
    document.getElementById("serialNumber").textContent = item.serial_number || "Not specified";

    // Sections
    if (item.distinguishing_features) {
        document.getElementById("featuresSection").classList.remove("hidden");
        document.getElementById("distinguishingFeatures").textContent = item.distinguishing_features;
    }
    if (item.description) {
        document.getElementById("descriptionSection").classList.remove("hidden");
        document.getElementById("itemDescription").textContent = item.description;
    }
    if (item.admin_feedback) {
        document.getElementById("adminFeedbackSection").classList.remove("hidden");
        document.getElementById("adminFeedback").textContent = item.admin_feedback;
    }

    // Attachments
    const attachments = item.lost_found_attachments || [];
    if (attachments.length > 0) {
        document.getElementById("attachmentsSection").classList.remove("hidden");
        const container = document.getElementById("attachmentsContainer");
        container.innerHTML = "";
        attachments.forEach(att => {
            const card = document.createElement("a");
            card.href = att.file_url;
            card.target = "_blank";
            card.className = "block bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group max-w-sm";
            card.innerHTML = `
                <div class="aspect-square w-full sm:w-64 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src="${att.file_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Item Photo</span>
                    <i class="fas fa-search-plus text-gray-400 group-hover:text-amber-500"></i>
                </div>
            `;
            container.appendChild(card);
        });
    }

    loadingState.classList.add("hidden");
    contentState.classList.remove("hidden");
}

function showError() {
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
}
