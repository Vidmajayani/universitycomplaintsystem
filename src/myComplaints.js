import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("complaintList");
  const statusFilter = document.getElementById("statusFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const dateSort = document.getElementById("dateSort");

  let allComplaints = [];

  // CATEGORY COLORS
  const categoryColors = {
    "Facility": "#009688",
    "Academic": "#8e44ad",
    "Administrative": "#ff9800",
    "Student Disciplinary": "#e91e63",
    "Technical": "#007bff",
    "Other": "#607d8b"
  };

  // STATUS COLORS & ICONS
  const statusConfig = {
    "Pending": { color: "var(--color-pending)", icon: "⏳" },       // red
    "In-Progress": { color: "var(--color-progress)", icon: "🔧" }, // yellow
    "Resolved": { color: "var(--color-resolved)", icon: "✅" },     // green
    "Deleted": { color: "#dc3545", icon: "🗑️" }            // red/danger for deleted
  };

  // ============================
  // GET LOGGED-IN USER
  // ============================
  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      showNoResults("Unable to load user.");
      return null;
    }
    return data.user;
  }

  // ============================
  // LOAD COMPLAINTS
  // ============================
  async function loadComplaints() {
    list.replaceChildren();

    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("complaint")
      .select(`
        complaintid,
        complainttitle,
        complaintdescription,
        complaintstatus,
        submitteddate,
        complainantid,
        admin_feedback,
        category:categoryid (categoryname)
      `)
      .eq("complainantid", user.id)
      .order("submitteddate", { ascending: false });

    if (error) {
      showNoResults("Failed to load complaints.");
      return;
    }

    allComplaints = data;
    renderComplaints(allComplaints);
  }

  // ============================
  // RENDER COMPLAINT CARDS
  // ============================
  function renderComplaints(complaints) {
    list.replaceChildren();

    if (!complaints || complaints.length === 0) {
      showNoResults("No Complaints Found");
      return;
    }

    complaints.forEach((c) => {
      const card = document.createElement("div");
      card.className =
        "rounded-lg p-4 shadow transition-transform duration-200 hover:scale-[1.02] bg-white dark:bg-gray-800";

      // Card border color based on status
      const statusInfo = statusConfig[c.complaintstatus] || { color: "#999", icon: "⚪" };
      card.style.borderLeft = `6px solid ${statusInfo.color}`;
      card.style.border = `1px solid var(--color-border-light)`;
      card.classList.add("dark:border-gray-700");

      // --- TITLE ---
      const title = document.createElement("h2");
      title.className = "text-lg font-bold mb-1 text-gray-900 dark:text-white";
      title.textContent = c.complainttitle;

      // --- DESCRIPTION ---
      const desc = document.createElement("p");
      desc.className = "text-gray-700 dark:text-gray-300 mb-2";
      desc.textContent = c.complaintdescription;

      // --- CATEGORY TAG ---
      const categoryTag = document.createElement("span");
      categoryTag.className = "px-3 py-1 text-white rounded text-sm inline-block mb-2";
      categoryTag.style.background = categoryColors[c.category?.categoryname] || "#555";
      categoryTag.textContent = c.category?.categoryname || "Other";

      // --- STATUS ROW ---
      const statusRow = document.createElement("div");
      statusRow.className = "flex items-center gap-2 mt-1 mb-2";

      const statusIcon = document.createElement("span");
      statusIcon.textContent = statusInfo.icon;

      const statusText = document.createElement("span");
      statusText.textContent = c.complaintstatus;
      statusText.style.color = statusInfo.color;
      statusText.className = "font-semibold";

      statusRow.appendChild(statusIcon);
      statusRow.appendChild(statusText);

      // --- ADMIN FEEDBACK SECTION ---
      // If there is reasoning/feedback (especially for Deleted or Updated), show it
      let feedbackDiv = null;
      if (c.admin_feedback) {
        feedbackDiv = document.createElement("div");
        feedbackDiv.className = "mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded border-l-4 border-gray-400 dark:border-gray-500 text-sm";

        // Change feedback box color if deleted
        if (c.complaintstatus === "Deleted") {
          feedbackDiv.classList.replace("border-gray-400", "border-red-500");
          feedbackDiv.classList.replace("bg-gray-50", "bg-red-50");
          feedbackDiv.classList.add("dark:bg-red-900", "dark:text-white");
        }

        feedbackDiv.innerHTML = `
            <p class="font-bold text-gray-800 dark:text-gray-200 mb-1">
                <i class="fas fa-comment-dots mr-1"></i> Admin Message:
            </p>
            <p class="text-gray-700 dark:text-gray-300">${c.admin_feedback}</p>
        `;
      }

      // --- DATE ---
      const date = document.createElement("p");
      date.className = "text-sm text-gray-500 mt-2";
      date.textContent =
        "Submitted: " + new Date(c.submitteddate).toLocaleDateString();

      // --- ADD ALL TO CARD ---
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(categoryTag);
      card.appendChild(statusRow);
      if (feedbackDiv) card.appendChild(feedbackDiv); // Add feedback
      card.appendChild(date);

      list.appendChild(card);
    });
  }

  // ============================
  // NO RESULTS
  // ============================
  function showNoResults(message) {
    // Message
    list.replaceChildren();
    const msg = document.createElement("p");
    msg.className = "text-center text-gray-600 dark:text-gray-300 py-6";
    msg.textContent = message;
    list.appendChild(msg);
  }

  // ============================
  // FILTER + SORT
  // ============================
  function applyFilters() {
    let filtered = [...allComplaints];

    if (statusFilter.value !== "all") {
      filtered = filtered.filter((c) => c.complaintstatus === statusFilter.value);
    }

    if (categoryFilter.value !== "all") {
      filtered = filtered.filter((c) => c.category?.categoryname === categoryFilter.value);
    }

    filtered.sort((a, b) => {
      if (dateSort.value === "newest") {
        return new Date(b.submitteddate) - new Date(a.submitteddate);
      }
      return new Date(a.submitteddate) - new Date(b.submitteddate);
    });

    renderComplaints(filtered);
  }

  // ============================
  // EVENT LISTENERS
  // ============================
  statusFilter.addEventListener("change", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  dateSort.addEventListener("change", applyFilters);

  // ============================
  // INITIAL LOAD
  // ============================
  loadComplaints();
});
