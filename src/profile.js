import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Immediate Session Check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "Login.html";
    return;
  }

  // REVEAL CONTENT
  document.getElementById("mainContent").classList.remove("hidden");

  loadProfile();
});

async function loadProfile() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    window.location.href = "Login.html";
    return;
  }

  const user = session.user;

  const userId = user.id;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error loading profile:", error);
    return;
  }

  // Fill profile info
  document.getElementById("fullName").textContent = data.first_name + " " + data.last_name;
  document.getElementById("email").textContent = user.email;
  document.getElementById("department").textContent = data.department;
  document.getElementById("role").textContent = data.role;

  document.getElementById("fullNameInput").value = data.first_name + " " + data.last_name;
  document.getElementById("emailInput").value = user.email;
  document.getElementById("departmentInput").value = data.department;

  document.getElementById("phoneInput").value = data.phone || "";
  document.getElementById("displayNameInput").value = data.display_name || "";

  if (data.profile_image_url) {
    document.getElementById("profileImage").src = data.profile_image_url;
  }

  // Only save phone & display name
  setupSaveProfile(userId);
}

function setupSaveProfile(userId) {
  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("phoneInput").value.trim();
    const displayName = document.getElementById("displayNameInput").value.trim();

    const { error } = await supabase
      .from("users")
      .update({ phone, display_name: displayName })
      .eq("id", userId);

    if (error) {
      alert("Failed to update profile: " + error.message);
      return;
    }

    alert("Profile updated successfully!");
  });
}
