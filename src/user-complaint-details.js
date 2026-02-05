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

    // 2. Get Complaint ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!id) {
        showError();
        return;
    }

    try {
        // 3. Fetch Complaint Data
        const { data: complaint, error } = await supabase
            .from("complaint")
            .select(`
                *,
                category:categoryid (categoryname),
                complaintattachment (*)
            `)
            .eq("complaintid", id)
            .eq("complainantid", session.user.id) // Security: Ensure it's THEIR complaint
            .single();

        if (error || !complaint) {
            console.error("Error fetching complaint:", error);
            showError();
            return;
        }

        // 4. Render Data
        renderDetails(complaint);

        // 5. Fetch Specific Details based on Category
        fetchSpecificDetails(id, complaint.category?.categoryname);
    } catch (err) {
        console.error("Unexpected error:", err);
        showError();
    }
});

async function fetchSpecificDetails(complaintId, categoryName) {
    const tableMapping = {
        "Academic": "academiccomplaint",
        "Facility": "facilitycomplaint",
        "Administrative": "administrativecomplaint",
        "Student Disciplinary": "studentbehaviorcomplaint",
        "Technical": "technicalcomplaint",
        "Other": "othercomplaint"
    };

    const tableName = tableMapping[categoryName];
    if (!tableName) return;

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .eq("complaintid", complaintId)
            .maybeSingle(); // Better than single() if entry doesn't exist

        if (error || !data) {
            console.log(`No specific details found for ${categoryName}`);
            return;
        }

        renderSpecificFields(categoryName, data);
    } catch (err) {
        console.error("Error fetching specific details:", err);
    }
}

function renderSpecificFields(category, data) {
    const container = document.getElementById("specificDetailsContainer");
    const section = document.getElementById("specificDetailsSection");
    container.innerHTML = "";

    const fieldLabels = {
        // Academic
        lecturername: "Lecturer Name",
        batchcode: "Batch Code",
        modulename: "Module Name",
        currentlevel: "Current Level",
        semester: "Semester",
        specificationofissue: "Specific Issue",
        phone: "Contact Phone",
        // Facility
        typeoffacility: "Facility Type",
        typeoffacilityissue: "Nature of Issue",
        facilityfloor: "Floor / Level",
        // Administrative
        complaintdepartment: "Department",
        staffinvolved: "Staff Involved",
        // Student Behavior
        accusedname: "Involved Student(s)",
        typeofbehavior: "Behavior Type",
        locationofincident: "Location",
        witnessdetail: "Witness Details",
        // Technical
        typeofissue: "Technical Problem",
        deviceaffected: "Device / Software",
        // Common / Other
        previousattempt: "Previous Attempts",
        desiredoutcome: "Desired Outcome",
        suggestedcategory: "Suggested Category"
    };

    let hasFields = false;
    for (const [key, value] of Object.entries(data)) {
        if (key === "complaintid" || key === "id" || !value || value === "null") continue;

        const label = fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        const div = document.createElement("div");
        div.className = "flex flex-col sm:flex-row sm:items-start border-b border-gray-100 dark:border-gray-700 pb-2";
        div.innerHTML = `
            <span class="w-40 flex-shrink-0 font-semibold text-gray-500 dark:text-gray-400 capitalize">${label}:</span>
            <span class="text-gray-900 dark:text-gray-200">${value}</span>
        `;
        container.appendChild(div);
        hasFields = true;
    }

    if (hasFields) {
        section.classList.remove("hidden");
    }
}

function renderDetails(c) {
    const loadingState = document.getElementById("loadingState");
    const contentState = document.getElementById("contentState");

    // Basic Info
    document.getElementById("complaintTitle").textContent = c.complainttitle;
    document.getElementById("complaintDesc").textContent = c.complaintdescription;
    document.getElementById("complaintId").textContent = c.complaintid;

    const subDate = new Date(c.submitteddate);
    document.getElementById("submittedDate").textContent = subDate.toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Incident Date (from main table)
    if (c.dateofincident) {
        const incDate = new Date(c.dateofincident);
        const incEl = document.createElement("p");
        incEl.className = "text-gray-500 dark:text-gray-400 text-sm mt-1";
        incEl.innerHTML = `<i class="fas fa-exclamation-circle mr-1 text-amber-500"></i> Date of Incident: <span>${incDate.toLocaleDateString()}</span>`;
        document.getElementById("complaintTitle").parentElement.appendChild(incEl);
    }

    // Category
    const catBadge = document.getElementById("categoryBadge");
    catBadge.textContent = c.category?.categoryname || "Other";
    const categoryColors = {
        "Facility": "#009688", // Teal
        "Academic": "#6366f1", // Indigo
        "Administrative": "#ec4899", // Pink
        "Student Disciplinary": "#ef4444", // Red
        "Technical": "#14b8a6", // Teal
        "Other": "#64748b"  // Slate
    };
    const accentColor = categoryColors[c.category?.categoryname] || '#64748b';
    catBadge.style.background = accentColor;

    // Apply color to icons
    const iconsToColor = [
        document.querySelector("#specificDetailsSection h3 i"),
        document.querySelector("section h3 i.fa-align-left"),
        document.querySelector("#attachmentsSection h3 i")
    ];
    iconsToColor.forEach(icon => {
        if (icon) {
            icon.style.color = accentColor;
            icon.classList.remove("text-blue-500");
        }
    });

    // Status
    const statusConfig = {
        "Pending": { color: "var(--color-pending)", icon: "fas fa-clock", bg: "rgba(231, 76, 60, 0.1)" },
        "In-Progress": { color: "var(--color-progress)", icon: "fas fa-spinner fa-spin", bg: "rgba(241, 196, 15, 0.1)" },
        "Resolved": { color: "var(--color-resolved)", icon: "fas fa-check-circle", bg: "rgba(46, 204, 113, 0.1)" },
        "Deleted": { color: "#dc3545", icon: "fas fa-trash-alt", bg: "rgba(220, 53, 69, 0.1)" }
    };
    const s = statusConfig[c.complaintstatus] || { color: "#999", icon: "fas fa-question-circle", bg: "#f0f0f0" };

    const statusBadge = document.getElementById("statusBadge");
    statusBadge.style.color = s.color;
    statusBadge.style.backgroundColor = s.bg;
    document.getElementById("statusIcon").className = s.icon;
    document.getElementById("statusText").textContent = c.complaintstatus;

    // Admin Feedback
    if (c.admin_feedback) {
        document.getElementById("adminFeedbackSection").classList.remove("hidden");
        document.getElementById("adminFeedback").textContent = c.admin_feedback;
    }

    // Attachments
    const attachments = c.complaintattachment || [];
    if (attachments.length > 0) {
        document.getElementById("attachmentsSection").classList.remove("hidden");
        const container = document.getElementById("attachmentsContainer");
        container.innerHTML = "";

        attachments.forEach(att => {
            const isImage = att.fileurl.match(/\.(jpeg|jpg|gif|png|webp)/i);
            const card = document.createElement("a");
            card.href = att.fileurl;
            card.target = "_blank";

            if (isImage) {
                // Large Image Card
                card.className = "block bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group";
                card.innerHTML = `
                    <div class="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img src="${att.fileurl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    </div>
                    <div class="p-4 flex justify-between items-center">
                        <div class="truncate">
                            <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${att.filename || 'Evidence Photo'}</p>
                            <p class="text-xs text-gray-500 truncate">${att.description || 'View full image'}</p>
                        </div>
                        <i class="fas fa-expand-alt text-gray-300 group-hover:text-blue-500"></i>
                    </div>
                `;
            } else {
                // File Card
                card.className = "flex items-center p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-sm group";
                card.innerHTML = `
                    <div class="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center mr-4">
                        <i class="fas fa-file-pdf text-red-500 text-2xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition">${att.filename || 'Document'}</p>
                        <p class="text-xs text-gray-500 truncate">${att.description || 'Open attachment'}</p>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-300 group-hover:text-blue-500 transition ml-2"></i>
                `;
            }
            container.appendChild(card);
        });
    }

    // Toggle Visibility
    loadingState.classList.add("hidden");
    contentState.classList.remove("hidden");
}

function showError() {
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
}
