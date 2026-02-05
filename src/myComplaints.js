import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Session Check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "Login.html";
    return;
  }
  const user = session.user;

  // Tabs
  const tabComplaints = document.getElementById("tabComplaints");
  const tabLostFound = document.getElementById("tabLostFound");
  const sectionComplaints = document.getElementById("sectionComplaints");
  const sectionLostFound = document.getElementById("sectionLostFound");

  // Complaint Filters
  const list = document.getElementById("complaintList");
  const statusFilter = document.getElementById("statusFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const dateSort = document.getElementById("dateSort");

  // Lost Item Filters
  const lostList = document.getElementById("lostItemsList");
  const lostStatusFilter = document.getElementById("lostStatusFilter");

  let allComplaints = [];
  let allLostItems = [];

  // Configs
  const categoryColors = {
    "Facility": "#009688",
    "Academic": "#8e44ad",
    "Administrative": "#ff9800",
    "Student Disciplinary": "#e91e63",
    "Technical": "#007bff",
    "Other": "#607d8b"
  };

  const statusConfig = {
    "Pending": { color: "var(--color-pending)", icon: "⏳" },
    "In-Progress": { color: "var(--color-progress)", icon: "🔧" },
    "Resolved": { color: "var(--color-resolved)", icon: "✅" },
    "Deleted": { color: "#dc3545", icon: "🗑️" }
  };

  const lostStatusConfig = {
    "Lost": { color: "#ff9800", icon: "❓", text: "Lost" }, // Orange
    "Claim": { color: "#2196f3", icon: "👀", text: "Match Found (Visit Admin)" }, // Blue
    "Found": { color: "#4caf50", icon: "✅", text: "Returned / Found" }, // Green
    "Deleted": { color: "#f44336", icon: "🗑️", text: "Deleted" }
  };

  // ============================
  // TABS LOGIC
  // ============================
  function switchTab(tab) {
    if (tab === 'lostfound') {
      // Active Styles for Lost & Found
      tabLostFound.classList.add("border-[var(--color-eco)]", "text-eco-dark", "dark:text-blue-400", "font-semibold");
      tabLostFound.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400", "font-medium", "hover:text-gray-700", "dark:hover:text-gray-300");

      // Inactive Styles for Complaints
      tabComplaints.classList.remove("border-[var(--color-eco)]", "text-eco-dark", "dark:text-blue-400", "font-semibold");
      tabComplaints.classList.add("border-transparent", "text-gray-500", "dark:text-gray-400", "font-medium", "hover:text-gray-700", "dark:hover:text-gray-300");

      // Show/Hide Sections
      sectionLostFound.classList.remove("hidden");
      sectionComplaints.classList.add("hidden");

      loadLostItems();
    } else {
      // Active Styles for Complaints
      tabComplaints.classList.add("border-[var(--color-eco)]", "text-eco-dark", "dark:text-blue-400", "font-semibold");
      tabComplaints.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400", "font-medium", "hover:text-gray-700", "dark:hover:text-gray-300");

      // Inactive Styles for Lost & Found
      tabLostFound.classList.remove("border-[var(--color-eco)]", "text-eco-dark", "dark:text-blue-400", "font-semibold");
      tabLostFound.classList.add("border-transparent", "text-gray-500", "dark:text-gray-400", "font-medium", "hover:text-gray-700", "dark:hover:text-gray-300");

      sectionComplaints.classList.remove("hidden");
      sectionLostFound.classList.add("hidden");

      loadComplaints();
    }
  }

  tabComplaints.addEventListener('click', () => switchTab('complaints'));
  tabLostFound.addEventListener('click', () => switchTab('lostfound'));

  // Check URL Params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'lostfound') {
    switchTab('lostfound');
  } else {
    loadComplaints();
  }


  // ============================
  // LOAD COMPLAINTS
  // ============================
  async function loadComplaints() {
    // Only load if empty or refresh needed (simplified: just load)
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
      console.error(error);
      list.innerHTML = "<p class='text-center text-red-500'>Failed to load complaints.</p>";
      return;
    }
    allComplaints = data;
    renderComplaints(allComplaints);
  }

  function renderComplaints(complaints) {
    list.replaceChildren();
    if (!complaints || complaints.length === 0) {
      list.innerHTML = "<p class='text-center text-gray-500 py-6'>No Complaints Found</p>";
      return;
    }

    const template = document.getElementById('complaintCardTemplate');

    complaints.forEach((c) => {
      if (!template) return;
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector('div'); // The root div

      const statusInfo = statusConfig[c.complaintstatus] || { color: "#999", icon: "⚪" };
      card.style.borderLeft = `5px solid ${statusInfo.color}`;

      // Populate Data
      clone.querySelector('.title').textContent = c.complainttitle;
      clone.querySelector('.desc').textContent = c.complaintdescription;

      const catBadge = clone.querySelector('.category-badge');
      catBadge.textContent = c.category?.categoryname || "Other";
      catBadge.style.background = categoryColors[c.category?.categoryname] || '#555';

      const statBadge = clone.querySelector('.status-badge');
      statBadge.innerHTML = `${statusInfo.icon} ${c.complaintstatus}`; // innerHTML allowed for icon+text, or split if strictly text needed
      statBadge.style.color = statusInfo.color;

      const adminDiv = clone.querySelector('.admin-feedback');
      if (c.admin_feedback) {
        adminDiv.classList.remove('hidden');
        adminDiv.querySelector('.feedback-text').textContent = c.admin_feedback;
      }

      clone.querySelector('.submitted-date').textContent = `Submitted: ${new Date(c.submitteddate).toLocaleDateString()}`;

      // Click Event to View Details
      card.addEventListener('click', () => {
        window.location.href = `UserComplaintDetails.html?id=${c.complaintid}`;
      });

      list.appendChild(clone);
    });
  }

  // ============================
  // LOAD LOST ITEMS
  // ============================
  async function loadLostItems() {
    lostList.innerHTML = "<p class='text-center text-gray-500 py-6'>Loading...</p>";

    const { data, error } = await supabase
      .from('lost_and_found')
      .select('*')
      .eq('user_id', user.id)
      .order('reported_date', { ascending: false });

    if (error) {
      console.error(error);
      lostList.innerHTML = "<p class='text-center text-red-500'>Failed to load items.</p>";
      return;
    }
    allLostItems = data;
    renderLostItems(allLostItems);
  }

  function renderLostItems(items) {
    lostList.replaceChildren();
    if (!items || items.length === 0) {
      lostList.innerHTML = "<p class='text-center text-gray-500 py-6'>No Lost Items Reported</p>";
      return;
    }

    const template = document.getElementById('lostItemCardTemplate');

    items.forEach(item => {
      if (!template) return;
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector('div');

      const statusInfo = lostStatusConfig[item.status] || lostStatusConfig['Lost'];
      card.style.borderLeft = `5px solid ${statusInfo.color}`;

      // Date formatting
      const dateLost = item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Unknown Date';

      // Populate Data
      clone.querySelector('.item-name').textContent = item.item_name;
      clone.querySelector('.location').textContent = item.location_lost;
      clone.querySelector('.date').textContent = dateLost;

      const descP = clone.querySelector('.item-desc');
      if (item.description) {
        descP.classList.remove('hidden');
        descP.textContent = item.description;
      }

      clone.querySelector('.type-badge').textContent = item.item_type;

      const statBadge = clone.querySelector('.status-badge');
      statBadge.innerHTML = `${statusInfo.icon} ${statusInfo.text}`;
      statBadge.style.color = statusInfo.color;


      // Details (Brand/Color)
      if (item.brand || item.primary_color) {
        const detailsP = clone.querySelector('.item-details');
        detailsP.classList.remove('hidden');
        const parts = [];
        if (item.brand) parts.push(`Brand: ${item.brand}`);
        if (item.primary_color) parts.push(`Color: ${item.primary_color}`);
        detailsP.textContent = parts.join(' • ');
      }

      // Admin Feedback
      if (item.admin_feedback) {
        const adminDiv = clone.querySelector('.admin-feedback');
        adminDiv.classList.remove('hidden');
        adminDiv.querySelector('.feedback-text').textContent = item.admin_feedback;
      }

      // Click Event for Details
      card.addEventListener('click', () => {
        window.location.href = `UserLostFoundDetails.html?id=${item.item_id}`;
      });

      lostList.appendChild(clone);
    });
  }

  // ============================
  // FILTER HELPERS
  // ============================
  statusFilter.addEventListener("change", () => {
    const val = statusFilter.value;
    const filtered = val === 'all' ? allComplaints : allComplaints.filter(c => c.complaintstatus === val);
    renderComplaints(filtered);
  });

  categoryFilter.addEventListener("change", () => {
    const val = categoryFilter.value;
    const filtered = val === 'all' ? allComplaints : allComplaints.filter(c => c.category?.categoryname === val);
    renderComplaints(filtered);
  });

  dateSort.addEventListener("change", () => {
    const sortVal = dateSort.value;
    // Sort Complaints Only
    allComplaints.sort((a, b) => {
      const dateA = new Date(a.submitteddate);
      const dateB = new Date(b.submitteddate);
      return sortVal === 'newest' ? dateB - dateA : dateA - dateB;
    });
    renderComplaints(allComplaints);
  });

  // Lost Item Sort Listener
  const lostDateSort = document.getElementById("lostDateSort");
  if (lostDateSort) {
    lostDateSort.addEventListener("change", () => {
      const sortVal = lostDateSort.value;
      allLostItems.sort((a, b) => {
        const dateA = new Date(a.reported_date);
        const dateB = new Date(b.reported_date);
        return sortVal === 'newest' ? dateB - dateA : dateA - dateB;
      });
      renderLostItems(allLostItems);
    });
  }

  lostStatusFilter.addEventListener("change", () => {
    const val = lostStatusFilter.value;
    const filtered = val === 'all' ? allLostItems : allLostItems.filter(i => i.status === val);
    renderLostItems(filtered);
  });

});
