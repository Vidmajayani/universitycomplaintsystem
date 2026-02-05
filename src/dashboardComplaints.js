import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Immediate Session Check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'Login.html';
    return;
  }

  try {
    // Get the currently logged-in user
    const user = session.user;

    const userId = user.id;

    // Fetch user's full name from the "users" table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      document.getElementById('welcomeUsername').textContent = 'Welcome!';
    } else {
      const { first_name, last_name } = userData;
      document.getElementById('welcomeUsername').textContent = `Welcome, ${first_name} ${last_name}!`;
    }

    // Fetch user's complaints
    const { data: complaints, error: complaintsError } = await supabase
      .from('complaint')
      .select('complaintstatus')
      .eq('complainantid', userId);

    if (complaintsError) {
      console.error('Error fetching complaints:', complaintsError);
      return;
    }

    // Count statuses
    let pending = 0, inProgress = 0, resolved = 0, deleted = 0;
    complaints.forEach(c => {
      switch (c.complaintstatus) {
        case 'Pending': pending++; break;
        case 'In-Progress': inProgress++; break;
        case 'Resolved': resolved++; break;
        case 'Deleted': deleted++; break;
      }
    });

    // Update HTML
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('inProgressCount').textContent = inProgress;
    document.getElementById('resolvedCount').textContent = resolved;
    if (document.getElementById('deletedCount')) {
      document.getElementById('deletedCount').textContent = deleted;
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    alert('Something went wrong! Check console.');
  }
});

// =============================================================
// FETCH & DISPLAY USER'S 5 MOST RECENT COMPLAINTS FROM SUPABASE
// =============================================================
async function loadRecentComplaints() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch complaints along with category info
  const { data: complaints, error } = await supabase
    .from('complaint')
    .select(`
      complaintid,
      complainttitle,
      complaintdescription,
      complaintstatus,
      submitteddate,
      category:categoryid ( categoryname )
    `)
    .eq('complainantid', user.id)
    .order('submitteddate', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching complaints:", error);
    return;
  }

  const container = document.getElementById("recentComplaintsContainer");
  const template = document.getElementById("complaintCardTemplate");

  container.innerHTML = "";

  if (!complaints || complaints.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">No complaints found.</p>`;
    return;
  }

  complaints.forEach(c => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.complaint-card');

    // Title & Description
    clone.querySelector(".title").textContent = c.complainttitle;
    clone.querySelector(".description").textContent = c.complaintdescription;

    // Status Badge
    const status = clone.querySelector(".status");
    status.textContent = c.complaintstatus;

    if (c.complaintstatus === "Pending") {
      status.classList.add("bg-yellow-100", "text-yellow-700");
    } else if (c.complaintstatus === "In-Progress") {
      status.classList.add("bg-blue-100", "text-blue-700");
    } else if (c.complaintstatus === "Resolved") {
      status.classList.add("bg-green-100", "text-green-700");
    } else if (c.complaintstatus === "Deleted") {
      status.classList.add("bg-red-100", "text-red-700");
    }

    // Add category badge
    const categoryBadge = document.createElement("span");
    categoryBadge.classList.add("px-3", "py-1", "text-xs", "font-semibold", "rounded-full");

    const category = c.category?.categoryname || "Other";
    categoryBadge.textContent = category;

    // Category color mapping
    switch (category) {
      case "Facility":
        categoryBadge.classList.add("bg-purple-100", "text-purple-700");
        break;
      case "Academic":
        categoryBadge.classList.add("bg-indigo-100", "text-indigo-700");
        break;
      case "Administrative":
        categoryBadge.classList.add("bg-pink-100", "text-pink-700");
        break;
      case "Student Disciplinary":
        categoryBadge.classList.add("bg-red-100", "text-red-700");
        break;
      case "Technical":
        categoryBadge.classList.add("bg-teal-100", "text-teal-700");
        break;
      default:
        categoryBadge.classList.add("bg-gray-100", "text-gray-700");
    }

    // Add category badge to footer
    clone.querySelector(".footer").appendChild(categoryBadge);

    // Date & Time
    const submittedDate = new Date(c.submitteddate);
    clone.querySelector(".date").textContent =
      submittedDate.toLocaleDateString() + " " + submittedDate.toLocaleTimeString();

    // Click Event to View Details
    card.addEventListener('click', () => {
      window.location.href = `UserComplaintDetails.html?id=${c.complaintid}`;
    });

    // Append card
    container.appendChild(clone);
  });
}

// Start loading complaints
loadRecentComplaints();
