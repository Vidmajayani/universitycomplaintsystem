// Import Supabase for logout functionality
import { supabase } from './supabaseClient.js';

// ======================
// AUTHENTICATION GUARD
// ======================
// Protect all user pages that load darkMode.js
// Skip guard for login and reset password pages
const currentPage = window.location.pathname.split('/').pop();
const publicPages = ['Login.html', 'ResetPassword.html', 'ChangePassword.html'];

// Hide page content until auth check completes
if (!publicPages.includes(currentPage)) {
  document.documentElement.style.visibility = 'hidden';
}

// Run authentication check
(async () => {
  if (!publicPages.includes(currentPage)) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth check error:', error);
        window.location.href = 'Login.html';
        return;
      }

      if (!session) {
        // No active session - redirect to login
        window.location.href = 'Login.html';
        return;
      }

      // Session exists - fetch user data for profile picture (try users then admin)
      let profileUrl = null;

      const { data: userData } = await supabase
        .from('users')
        .select('profile_image_url')
        .eq('id', session.user.id)
        .maybeSingle();

      profileUrl = userData?.profile_image_url;

      if (!profileUrl) {
        const { data: adminData } = await supabase
          .from('admin')
          .select('profile_pic')
          .eq('id', session.user.id)
          .maybeSingle();
        profileUrl = adminData?.profile_pic;
      }

      if (profileUrl) {
        const profileBtn = document.getElementById('profileButton');
        if (profileBtn) {
          profileBtn.innerHTML = `
            <img src="${profileUrl}" alt="Profile" class="h-10 w-10 rounded-full object-cover border-2 border-blue-500">
          `;
        }
      }

      // --- ADMIN NOTIFICATION BADGE LOGIC ---
      const badge = document.getElementById('adminNotificationCount');
      const bell = document.getElementById('adminNotificationBell');

      if (badge || bell) {
        try {
          // Check if this user is an admin and get their role
          const { data: adminData } = await supabase
            .from('admin')
            .select('adminrole')
            .eq('id', session.user.id)
            .single();

          if (adminData) {
            // Master Admin should NOT see notifications at all
            if (adminData.adminrole === 'Master Admin') {
              if (bell) bell.classList.add('hidden');
              if (badge) badge.classList.add('hidden');
            } else if (badge) {
              // Regular Admin - fetch their specific notifications
              let query = supabase
                .from('admin_notifications')
                .select('id', { count: 'exact', head: true })
                .eq('is_read', false)
                .eq('admin_id', session.user.id);

              const { count, error: countError } = await query;

              if (!countError && count !== null) {
                if (count > 0) {
                  badge.textContent = count > 99 ? '99+' : count;
                  badge.classList.remove('hidden');
                } else {
                  badge.classList.add('hidden');
                }
              }
            }
          }
        } catch (badgeErr) {
          console.error('Error updating notification badge:', badgeErr);
        }
      }
      // --------------------------------------

      // Session exists - show the page
      document.documentElement.style.visibility = 'visible';
    } catch (err) {
      console.error('Unexpected auth error:', err);
      window.location.href = 'Login.html';
    }
  } else {
    // Public page - show immediately
    document.documentElement.style.visibility = 'visible';
  }
})();

// // ======================
// // Helper Function
// // ======================
// function countWords(text) {
//   return text.trim().split(/\s+/).filter(Boolean).length;
// }

// // ======================
// // STUDENT COMPLAINT FORM
// // ======================
// const studentForm = document.getElementById('complaintForm');
// if (studentForm) {
//   const desc = document.getElementById('description');
//   const fileDesc = document.getElementById('fileDesc');
//   const prevAttempt = document.getElementById('previousAttempt');
//   const descCounter = document.getElementById('descCounter');
//   const fileCounter = document.getElementById('fileCounter');
//   const attemptCounter = document.getElementById('attemptCounter');

//   if (desc) {
//     desc.addEventListener('input', () => {
//       const words = countWords(desc.value);
//       descCounter.textContent = `${words} / 500 words`;
//       if (words > 500) desc.value = desc.value.split(/\s+/).slice(0, 500).join(' ');
//     });
//   }

//   if (fileDesc) {
//     fileDesc.addEventListener('input', () => {
//       const words = countWords(fileDesc.value);
//       fileCounter.textContent = `${words} / 100 words`;
//       if (words > 100) fileDesc.value = fileDesc.value.split(/\s+/).slice(0, 100).join(' ');
//     });
//   }

//   if (prevAttempt) {
//     prevAttempt.addEventListener('input', () => {
//       const words = countWords(prevAttempt.value);
//       attemptCounter.textContent = `${words} / 100 words`;
//       if (words > 100) prevAttempt.value = prevAttempt.value.split(/\s+/).slice(0, 100).join(' ');
//     });
//   }

//   studentForm.addEventListener('submit', function (e) {
//     e.preventDefault();

//     const year = parseInt(document.getElementById('year').value);
//     const semester = parseInt(document.getElementById('semester').value);
//     const phone = document.getElementById('phone').value.trim();
//     const dateIncident = document.getElementById('dateIncident').value;
//     const today = new Date().toISOString().split('T')[0];
//     const currentYear = new Date().getFullYear();

//     const textFields = ['moduleName', 'batchCode', 'lecturer'];
//     const pattern = /^[a-zA-Z0-9\s]+$/;
//     const requiredFields = [
//       'moduleName', 'batchCode', 'year', 'semester',
//       'lecturer', 'description', 'issueSpec', 'dateIncident'
//     ];

//     for (let id of requiredFields) {
//       if (!document.getElementById(id).value.trim()) {
//         alert('Please fill all required fields before submitting.');
//         return;
//       }
//     }

//     for (let id of textFields) {
//       if (!pattern.test(document.getElementById(id).value)) {
//         alert(`${id.replace(/([A-Z])/g, ' $1')} should not contain special characters.`);
//         return;
//       }
//     }

//     if (year < 2024 || year > currentYear) {
//       alert('Year must be between 2024 and the current year.');
//       return;
//     }

//     if (semester !== 1 && semester !== 2) {
//       alert('Semester must be either 1 or 2.');
//       return;
//     }

//     if (phone && (!/^\d+$/.test(phone) || phone.length > 10)) {
//       alert('Phone number must contain only digits and not exceed 10 digits.');
//       return;
//     }

//     if (dateIncident > today) {
//       alert('Date of incident cannot be in the future.');
//       return;
//     }

//     if (!document.getElementById('declaration').checked) {
//       alert('Please confirm the declaration.');
//       return;
//     }

//     alert('Complaint submitted successfully!');
//     this.reset();
//     descCounter.textContent = '0 / 500 words';
//     fileCounter.textContent = '0 / 100 words';
//     attemptCounter.textContent = '0 / 100 words';
//   });
// }

// // ======================
// // ADMIN COMPLAINT FORM
// // ======================
// const adminForm = document.getElementById('adminComplaintForm');
// if (adminForm) {
//   const desc = document.getElementById('description');
//   const prev = document.getElementById('previousAttempts');
//   const sugg = document.getElementById('suggestions');
//   const descCounter = document.getElementById('descCounter');
//   const attemptCounter = document.getElementById('attemptCounter');
//   const suggestionCounter = document.getElementById('suggestionCounter');

//   if (desc) {
//     desc.addEventListener('input', () => {
//       const words = countWords(desc.value);
//       descCounter.textContent = `${words} / 500 words`;
//       if (words > 500) desc.value = desc.value.split(/\s+/).slice(0, 500).join(' ');
//     });
//   }

//   if (prev) {
//     prev.addEventListener('input', () => {
//       const words = countWords(prev.value);
//       attemptCounter.textContent = `${words} / 100 words`;
//       if (words > 100) prev.value = prev.value.split(/\s+/).slice(0, 100).join(' ');
//     });
//   }

//   if (sugg) {
//     sugg.addEventListener('input', () => {
//       const words = countWords(sugg.value);
//       suggestionCounter.textContent = `${words} / 100 words`;
//       if (words > 100) sugg.value = sugg.value.split(/\s+/).slice(0, 100).join(' ');
//     });
//   }

//   adminForm.addEventListener('submit', function (e) {
//     e.preventDefault();

//     const department = document.getElementById('department').value.trim();
//     const dateIssue = document.getElementById('dateIssue').value;
//     const issueType = document.getElementById('issueType').value;
//     const impact = document.getElementById('impact').value.trim();
//     const declaration = document.getElementById('declaration').checked;
//     const today = new Date().toISOString().split('T')[0];

//     if (!department || !dateIssue || !issueType || !impact) {
//       alert('Please fill all required fields before submitting.');
//       return;
//     }

//     if (dateIssue > today) {
//       alert('Date of issue cannot be in the future.');
//       return;
//     }

//     if (!declaration) {
//       alert('Please confirm the declaration.');
//       return;
//     }

//     alert('Administrative complaint submitted successfully!');
//     this.reset();
//     descCounter.textContent = '0 / 500 words';
//     attemptCounter.textContent = '0 / 100 words';
//     suggestionCounter.textContent = '0 / 100 words';
//   });
// }

// // ======================
// // FACILITY COMPLAINT FORM
// // ======================
// const facilityForm = document.getElementById('facilityComplaintForm');
// if (facilityForm) {
//   facilityForm.addEventListener('submit', function (e) {
//     e.preventDefault();

//     const requiredFields = [
//       'fullName', 'id', 'location', 'facilityType',
//       'dateIssue', 'description', 'urgency', 'impact'
//     ];

//     for (const field of requiredFields) {
//       if (!document.getElementById(field).value.trim()) {
//         alert('Please fill all required fields before submitting.');
//         return;
//       }
//     }

//     const dateIssue = document.getElementById('dateIssue').value;
//     const today = new Date().toISOString().split('T')[0];
//     if (dateIssue > today) {
//       alert('Date of issue cannot be in the future.');
//       return;
//     }

//     if (!document.getElementById('declaration').checked) {
//       alert('Please confirm the declaration.');
//       return;
//     }

//     alert('Facility complaint submitted successfully!');
//     this.reset();
//   });
// }

// // ======================
// // OTHER COMPLAINT FORM
// // ======================
// const otherForm = document.getElementById('otherComplaintForm');
// if (otherForm) {
//   otherForm.addEventListener('submit', function (e) {
//     e.preventDefault();

//     const requiredFields = [
//       'fullName', 'id', 'dateIssue',
//       'briefDescription', 'detailedDescription', 'impact'
//     ];

//     for (const field of requiredFields) {
//       if (!document.getElementById(field).value.trim()) {
//         alert('Please fill all required fields before submitting.');
//         return;
//       }
//     }

//     const dateIssue = document.getElementById('dateIssue').value;
//     const today = new Date().toISOString().split('T')[0];
//     if (dateIssue > today) {
//       alert('Date of issue cannot be in the future.');
//       return;
//     }

//     if (!document.getElementById('declaration').checked) {
//       alert('Please confirm the declaration.');
//       return;
//     }

//     alert('Complaint submitted successfully!');
//     this.reset();
//   });
// }

// // ======================
// // BEHAVIOR COMPLAINT FORM
// // ======================
// const behaviorForm = document.getElementById('behaviorForm');
// if (behaviorForm) {
//   behaviorForm.addEventListener('submit', (e) => {
//     e.preventDefault();

//     const requiredFields = ['fullName', 'studentId', 'involvedStudents', 'dateTime', 'location', 'misbehavior', 'description', 'impact'];
//     for (const field of requiredFields) {
//       if (!document.getElementById(field).value.trim()) {
//         alert('Please complete all required fields before submitting.');
//         return;
//       }
//     }

//     const incidentDate = new Date(document.getElementById('dateTime').value);
//     if (incidentDate > new Date()) {
//       alert('Date and time cannot be in the future.');
//       return;
//     }

//     if (!document.getElementById('declaration').checked) {
//       alert('Please confirm the declaration before submitting.');
//       return;
//     }

//     alert('Complaint submitted successfully!');
//     behaviorForm.reset();
//   });
// }

// ======================
// LOGIN & RESET FORMS
// ======================
// NOTE: Login and Reset forms are now handled by login.js and resetPassword.js
// which properly integrate with Supabase authentication.
// Removed mock handlers to prevent authentication bypass.

// ======================
// DARK MODE, MOBILE MENU & PROFILE DROPDOWN
// ======================
const darkModeToggles = [
  document.getElementById('navbarThemeToggle')
];

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

darkModeToggles.forEach(toggle => {
  if (toggle) toggle.addEventListener('click', toggleDarkMode);
});

if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

// Initialize menus after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('overlay');
  const profileButton = document.getElementById('profileButton');
  const profileMenu = document.getElementById('profileMenu');

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('-translate-x-full');
      if (overlay) {
        overlay.classList.toggle('hidden');
      }
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        mobileMenu.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
      });
    }
  }

  if (profileButton && profileMenu) {
    profileButton.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!profileMenu.classList.contains('hidden') && !profileButton.contains(e.target)) {
        profileMenu.classList.add('hidden');
      }
    });
  }
});

// ======================
// LOGOUT FUNCTIONALITY (Centralized)
// ======================
// Handles logout confirmation for all user pages

// 1. Inject or Init Logout Modal
function injectLogoutModal() {
  let modal = document.getElementById('logoutModal');

  if (!modal) {
    const modalHtml = `
      <div id="logoutModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm transform transition-all scale-100">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirm Logout</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to log out?</p>
          <div class="flex justify-end space-x-3">
            <button id="cancelLogoutBtn"
              class="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium">
              Cancel
            </button>
            <button id="confirmLogoutBtn"
              class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-md font-bold">
              Log Out
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('logoutModal');
  }

  // Always setup/ensure Modal Listeners exist if not already attached
  const cancelBtn = document.getElementById('cancelLogoutBtn');
  const confirmBtn = document.getElementById('confirmLogoutBtn');

  if (cancelBtn && !cancelBtn.dataset.listenerAttached) {
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    cancelBtn.dataset.listenerAttached = 'true';
  }

  if (confirmBtn && !confirmBtn.dataset.listenerAttached) {
    confirmBtn.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        localStorage.clear();
        window.location.href = 'Login.html';
      } catch (err) {
        console.error('Logout error:', err);
        alert('Error logging out. Please try again.');
        modal.classList.add('hidden');
      }
    });
    confirmBtn.dataset.listenerAttached = 'true';
  }

  // Close on outside click
  if (modal && !modal.dataset.listenerAttached) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
    modal.dataset.listenerAttached = 'true';
  }
}

// 2. Function to show the modal
function showLogoutModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.remove('hidden');
  } else {
    // If somehow not injected yet
    injectLogoutModal();
    document.getElementById('logoutModal').classList.remove('hidden');
  }
}

// 3. Attach logout handlers globally
function initLogoutHandlers() {
  injectLogoutModal();

  // Use event delegation for dynamic "Log Out" links or buttons
  document.addEventListener('click', (e) => {
    // Look for link or button with IDs or specific text
    const target = e.target.closest('a, button');
    if (!target) return;

    const isLogoutId = target.id === 'headerLogoutBtn' || target.id === 'mobileLogoutBtn' || target.id === 'profileLogoutBtn';
    const href = target.getAttribute('href');
    const isLogoutHref = href === 'Login.html' || (href === 'javascript:void(0)' && target.id?.toLowerCase().includes('logout'));

    // Normalize text check: replace all whitespace (including newlines) with a single space
    const text = target.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    const isLogoutText = text === 'log out' || text === 'logout';

    if (isLogoutId || (isLogoutText && (isLogoutHref || target.tagName === 'BUTTON' || href === 'javascript:void(0)'))) {
      showLogoutModal(e);
    }
  });
}

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogoutHandlers);
} else {
  initLogoutHandlers();
}
