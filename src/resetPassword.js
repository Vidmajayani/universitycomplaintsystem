import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================
  // CHECK IF USER IS ALREADY LOGGED IN
  // If yes, redirect to appropriate dashboard
  // ============================================
  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    const userId = session.user.id;

    // Check if user is an Admin
    const { data: adminData } = await supabase
      .from('admin')
      .select('id')
      .eq('id', userId)
      .single();

    if (adminData) {
      window.location.href = 'AdminDashboard.html';
      return;
    }

    // Check if user is a regular User
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userData) {
      window.location.href = 'UserDashboard.html';
      return;
    }
  }
  // ============================================

  const form = document.getElementById('resetForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();

    if (!email) {
      alert('Please enter your email.');
      return;
    }

    try {
      // ------------------------------------------
      // 1. Pre-check: Verify email exists in DB
      // ------------------------------------------
      let emailExists = false;

      // Check Admin Table
      const { data: admin } = await supabase
        .from('admin')
        .select('id')
        .eq('adminemail', email)
        .maybeSingle();

      if (admin) {
        emailExists = true;
      } else {
        // Check Users Table (if not admin)
        // We use maybeSingle() to avoid errors if 0 rows
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (user) emailExists = true;

        // If getting user failed (e.g. column missing), we might assume false or log it
        if (userError && userError.code !== 'PGRST116') {
          console.warn('Could not verify/search users table:', userError);
        }
      }

      if (!emailExists) {
        alert('This email is not registered in our system.');
        return;
      }

      // ------------------------------------------
      // 2. Send Reset Link (Only if verified)
      // ------------------------------------------
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('ChangePassword.html', window.location.href).href,
      });

      if (error) {
        alert('Error sending reset email: ' + error.message);
        console.error(error);
        return;
      }

      alert('Password reset email sent! Please check your inbox.');
      form.reset();

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error: ' + err.message);
    }
  });
});
