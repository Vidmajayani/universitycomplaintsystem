import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("changePasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  // Toggle Buttons
  const toggleNewBtn = document.getElementById("toggleNewPassword");
  const toggleConfirmBtn = document.getElementById("toggleConfirmPassword");

  // Icons
  const eyeIconNew = document.getElementById("eyeIconNew");
  const eyeOffIconNew = document.getElementById("eyeOffIconNew");
  const eyeIconConfirm = document.getElementById("eyeIconConfirm");
  const eyeOffIconConfirm = document.getElementById("eyeOffIconConfirm");

  // -----------------------------------------------------------
  // TOGGLE PASSWORD VISIBILITY
  // -----------------------------------------------------------
  function toggleVisibility(input, eyeIcon, eyeOffIcon) {
    if (input.type === "password") {
      input.type = "text";
      eyeIcon.classList.remove("hidden");
      eyeOffIcon.classList.add("hidden");
    } else {
      input.type = "password";
      eyeIcon.classList.add("hidden");
      eyeOffIcon.classList.remove("hidden");
    }
  }

  if (toggleNewBtn) {
    toggleNewBtn.addEventListener("click", () => {
      toggleVisibility(newPasswordInput, eyeIconNew, eyeOffIconNew);
    });
  }

  if (toggleConfirmBtn) {
    toggleConfirmBtn.addEventListener("click", () => {
      toggleVisibility(confirmPasswordInput, eyeIconConfirm, eyeOffIconConfirm);
    });
  }

  // -----------------------------------------------------------
  // 1. CHECK FOR ERRORS IN URL (Hash Fragment)
  // -----------------------------------------------------------
  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const errorDescription = hashParams.get("error_description");
  const errorCode = hashParams.get("error_code");

  if (errorDescription) {
    alert(`Error: ${errorDescription}`);
    console.error("Supabase error:", errorCode, errorDescription);
  }

  // -----------------------------------------------------------
  // 2. HANDLE PKCE FLOW (Query Param ?code=...)
  // -----------------------------------------------------------
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");

  // -----------------------------------------------------------
  // 1. IMMEDIATE SESSION CHECK (Security)
  // -----------------------------------------------------------
  // Allow access ONLY if:
  // - There is a session already
  // - OR there is a 'code' in URL (PKCE flow)
  // - OR there is an 'error' in URL (Auth failure feedback)
  const params = new URLSearchParams(window.location.search);
  const hasCode = params.has("code");
  const urlHash = window.location.hash;
  const hasToken = urlHash.includes("access_token") || urlHash.includes("type=recovery");
  const hasError = urlHash.includes("error=");

  const { data: { session } } = await supabase.auth.getSession();

  if (!session && !hasCode && !hasToken && !hasError) {
    // User is trying to access directly without a link or session
    window.location.href = "Login.html";
    return;
  }

  if (hasCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.get("code"));
    if (error) {
      console.error("Exchange code error:", error);
      alert("Invalid or expired link: " + error.message);
      window.location.href = "Login.html";
      return;
    } else {
      console.log("PKCE Session established");
    }
  }

  // REVEAL CONTENT (Validation Passed)
  const mainContent = document.getElementById("mainContent");
  if (mainContent) mainContent.classList.remove("hidden");

  // -----------------------------------------------------------
  // 3. LISTEN FOR AUTH STATE
  // -----------------------------------------------------------
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      console.log("Password recovery mode active. Session:", session);
    }
  });

  // -----------------------------------------------------------
  // 4. UPDATE THE PASSWORD
  // -----------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // Validation
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    // Check session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert("Session invalid or expired. Please request a new password reset link.");
      return;
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert("Error updating password: " + error.message);
      console.error(error);
      return;
    }

    alert("Password updated successfully!");
    window.location.href = "Login.html";
  });
});
