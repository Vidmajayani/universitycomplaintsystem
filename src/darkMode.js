// Import Supabase for logout functionality
import { supabase } from './supabaseClient.js';

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
const darkModeToggles = [document.getElementById('darkModeToggle'), document.getElementById('mobileDarkModeToggle')];
const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
const profileMenu = document.getElementById('profileMenu');

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

// ======================
// FILTER COMPLAINTS FUNCTION
// ======================
function filterComplaints(status) {
  window.location.href = `my-complaints.html?status=${status}`;
}

// ======================
// LOGOUT FUNCTIONALITY
// ======================
// This handles logout for all user pages

// Function to handle logout
async function handleLogout(e) {
  e.preventDefault();

  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      alert('Error logging out. Please try again.');
      return;
    }

    // Clear localStorage
    localStorage.clear();

    // Redirect to login page
    window.location.href = 'Login.html';
  } catch (err) {
    console.error('Unexpected logout error:', err);
    alert('Error logging out. Please try again.');
  }
}

// Attach logout handlers to all logout links
document.addEventListener('DOMContentLoaded', () => {
  // Find all logout links (both desktop and mobile)
  const logoutLinks = document.querySelectorAll('a[href="Login.html"]');

  logoutLinks.forEach(link => {
    // Check if the link text contains "Log Out" or "Logout"
    if (link.textContent.trim().toLowerCase().includes('log out') ||
      link.textContent.trim().toLowerCase().includes('logout')) {
      link.addEventListener('click', handleLogout);
    }
  });
});
