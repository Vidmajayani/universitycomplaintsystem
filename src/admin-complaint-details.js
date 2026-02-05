// Admin Complaint Details JavaScript
import { supabase } from './supabaseClient.js';

// DOM Elements
const complaintTitle = document.getElementById('complaintTitle');
const statusBadge = document.getElementById('statusBadge');
const complaintIdEl = document.getElementById('complaintId');
const submittedDateEl = document.getElementById('submittedDate');
const complaintDescription = document.getElementById('complaintDescription');

// Category Details
const categoryDetailsCard = document.getElementById('categoryDetailsCard');
const categoryNameEl = document.getElementById('categoryName');
const categoryFields = document.getElementById('categoryFields');
const categoryFieldTemplate = document.getElementById('category-field-template');

// Attachments
const attachmentsContainer = document.getElementById('attachmentsContainer');
const attachmentItemTemplate = document.getElementById('attachment-item-template');

// Complainant Info
const avatarInitials = document.getElementById('avatarInitials');
const avatarImage = document.getElementById('avatarImage');
const complainantName = document.getElementById('complainantName');
const complainantRole = document.getElementById('complainantRole');
const complainantId = document.getElementById('complainantId');
const complainantEmail = document.getElementById('complainantEmail');
const complainantDept = document.getElementById('complainantDept');

// Admin Feedback
const feedbackContainer = document.getElementById('feedbackContainer');
const adminInitials = document.getElementById('adminInitials');
const adminProfileImage = document.getElementById('adminProfileImage');
const adminName = document.getElementById('adminName');


// State
let currentComplaintId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentComplaintId = urlParams.get('id');

    if (!currentComplaintId) {
        alert('No complaint ID provided.');
        window.location.href = 'AllComplaints.html';
        return;
    }

    checkAdminSession();
});

// ------------------------
//  CHECK ADMIN SESSION
// ------------------------
async function checkAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'Login.html';
        return;
    }

    // Get admin details
    const { data: adminData, error } = await supabase
        .from('admin')
        .select('id, adminrole, profile_pic')
        .eq('id', session.user.id)
        .single();

    if (error || !adminData) {
        alert('Access denied.');
        window.location.href = 'Login.html';
        return;
    }

    // Update Profile Picture in Header
    const profileBtn = document.getElementById('profileButton');
    if (profileBtn && adminData.profile_pic) {
        profileBtn.innerHTML = `
            <img src="${adminData.profile_pic}" alt="Profile" class="h-10 w-10 rounded-full object-cover">
        `;
    }

    // --- ROLE-BASED ACCESS CONTROL (NAVIGATION) ---
    const adminRole = adminData.adminrole;
    const navDashboard = document.getElementById('navDashboard');
    const navAllComplaints = document.getElementById('navAllComplaints');
    const navAnalytics = document.getElementById('navAnalytics');
    const mobileNavDashboard = document.getElementById('mobileNavDashboard');
    const mobileNavAllComplaints = document.getElementById('mobileNavAllComplaints');
    const mobileNavAnalytics = document.getElementById('mobileNavAnalytics');

    if (adminRole === 'LostAndFound Admin') {
        // Update Dashboard Links
        if (navDashboard) navDashboard.href = 'AdminLostFoundDashboard.html';
        if (mobileNavDashboard) mobileNavDashboard.href = 'AdminLostFoundDashboard.html';

        // Update All Complaints to Manage Items
        if (navAllComplaints) {
            navAllComplaints.textContent = 'Manage Items';
            navAllComplaints.href = 'AdminLostFound.html';
        }
        if (mobileNavAllComplaints) {
            mobileNavAllComplaints.textContent = 'Manage Items';
            mobileNavAllComplaints.href = 'AdminLostFound.html';
        }

        // Hide Analytics
        if (navAnalytics) navAnalytics.style.display = 'none';
        if (mobileNavAnalytics) mobileNavAnalytics.style.display = 'none';
    }

    // Load details
    loadComplaintDetails(currentComplaintId);
}

async function loadComplaintDetails(id) {
    try {
        console.log('Loading details for complaint:', id);

        // 1. Fetch Basic Complaint Info
        const { data: complaint, error: compError } = await supabase
            .from('complaint')
            .select('*')
            .eq('complaintid', id)
            .single();

        if (compError || !complaint) {
            console.error('Error fetching complaint:', compError);
            alert('Complaint not found.');
            return;
        }

        // 2. Fetch Category Name
        const { data: category } = await supabase
            .from('category')
            .select('categoryname')
            .eq('categoryid', complaint.categoryid)
            .single();

        const catName = category ? category.categoryname : 'Unknown';
        console.log('Category:', catName);

        // 3. Fetch Complainant Details (User)
        let user = null;
        if (complaint.complainantid) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', complaint.complainantid)
                .single();

            if (!userError && userData) {
                user = userData;
            } else {
                console.warn('Could not fetch user info:', userError);
            }
        }

        // 4. Fetch Attachments
        const { data: attachments, error: attachError } = await supabase
            .from('complaintattachment')
            .select('*')
            .eq('complaintid', id);

        if (attachError) console.warn('Error fetching attachments:', attachError);

        // 5. Fetch Specific Sub-table Data
        let specificData = null;
        let subTable = '';

        if (catName === 'Technical') subTable = 'technicalcomplaint';
        else if (catName === 'Student Disciplinary') subTable = 'studentbehaviorcomplaint';
        else if (catName === 'Facility') subTable = 'facilitycomplaint';
        else if (catName === 'Administrative') subTable = 'administrativecomplaint';
        else if (catName === 'Academic') subTable = 'academiccomplaint';
        else if (catName === 'Other') subTable = 'othercomplaint';

        if (subTable) {
            const { data: subData, error: subError } = await supabase
                .from(subTable)
                .select('*')
                .eq('complaintid', id)
                .single();

            if (!subError) specificData = subData;
            else console.warn(`Error fetching ${subTable}:`, subError);
        }

        // 6. Fetch Assigned Admin Name & Profile
        let adminNameStr = 'Unassigned';
        let adminData = null; // Store full admin object

        if (complaint.adminid) {
            const { data: admin } = await supabase
                .from('admin')
                .select('adminfirstname, adminlastname, profile_pic')
                .eq('id', complaint.adminid)
                .single();

            if (admin) {
                adminNameStr = `${admin.adminfirstname} ${admin.adminlastname}`;
                adminData = admin; // Save it to pass later
            }
        }

        // RENDER ALL
        renderMainDetails(complaint, catName, user, adminNameStr, adminData);
        renderSpecificDetails(catName, specificData);
        renderAttachments(attachments);
        renderFeedback(complaint);

    } catch (err) {
        console.error('Unexpected error:', err);
        alert('An error occurred while loading details.');
    }
}

function renderMainDetails(complaint, catName, user, adminNameStr, adminData) {
    // Header
    complaintTitle.textContent = complaint.complainttitle || 'Untitled';
    complaintIdEl.textContent = `#${complaint.complaintid}`;

    const dateObj = new Date(complaint.submitteddate);
    submittedDateEl.textContent = !isNaN(dateObj) ? dateObj.toLocaleString() : 'N/A';

    // Status Badge
    statusBadge.textContent = complaint.complaintstatus;
    statusBadge.className = `px-3 py-1 rounded-full text-xs font-bold border inline-block ${getStatusColor(complaint.complaintstatus)}`;
    statusBadge.classList.remove('hidden');

    // Description
    complaintDescription.textContent = complaint.complaintdescription || 'No description provided.';

    // Complainant Info
    if (user) {
        complainantName.textContent = `${user.first_name || ''} ${user.last_name || ''}`;
        complainantRole.textContent = user.role || 'Student';
        complainantId.textContent = user.id || 'N/A';
        complainantId.title = user.id || '';
        complainantEmail.textContent = user.email || 'N/A';
        complainantDept.textContent = user.department || 'N/A';

        // Avatar Logic: Image vs Initials
        if (user.profile_image_url) {
            avatarImage.src = user.profile_image_url;
            avatarImage.classList.remove('hidden');
            avatarInitials.classList.add('hidden');
        } else {
            const f = user.first_name ? user.first_name[0] : '';
            const l = user.last_name ? user.last_name[0] : '';
            avatarInitials.innerText = (f + l).toUpperCase() || 'U';
            avatarImage.classList.add('hidden');
            avatarInitials.classList.remove('hidden');
        }
    } else {
        complainantName.textContent = 'Unknown User';
        complainantRole.textContent = 'N/A';
        complainantId.textContent = 'N/A';
        complainantEmail.textContent = 'N/A';
        complainantDept.textContent = 'N/A';
        avatarInitials.innerText = 'U';
        avatarImage.classList.add('hidden');
        avatarInitials.classList.remove('hidden');
    }

    // Assigned Admin
    adminName.textContent = adminNameStr;

    // Toggle between Image or Initials
    if (adminData && adminData.profile_pic) {
        adminProfileImage.src = adminData.profile_pic;
        adminProfileImage.classList.remove('hidden');
        adminInitials.classList.add('hidden');
    } else {
        const adminInit = adminNameStr !== 'Unassigned'
            ? adminNameStr.split(' ').map(n => n[0]).join('')
            : 'U';
        adminInitials.textContent = adminInit;
        adminProfileImage.classList.add('hidden');
        adminInitials.classList.remove('hidden');
    }

    // Display Delete Button if not deleted
    const deleteBtn = document.getElementById('deleteComplaintBtn');
    if (deleteBtn) {
        if (complaint.complaintstatus === 'Deleted') {
            deleteBtn.classList.add('hidden');
        } else {
            deleteBtn.classList.remove('hidden');
            deleteBtn.onclick = () => handleDelete(complaint);
        }
    }
}

// ------------------------
//  HANDLE DELETE
// ------------------------
async function handleDelete(complaint) {
    const reason = prompt("Enter a reason for deleting this complaint:");
    if (!reason) return;

    try {
        // 1. Soft Delete
        const { error } = await supabase
            .from('complaint')
            .update({
                complaintstatus: 'Deleted',
                admin_feedback: reason || "Deleted by Admin"
            })
            .eq('complaintid', complaint.complaintid);

        if (error) throw error;

        // 2. Notification for User
        const message = `Your complaint "${complaint.complainttitle}" was marked as Deleted. Reason: ${reason}`;
        await supabase.from('notifications').insert([{
            userid: complaint.complainantid,
            complaint_id: complaint.complaintid,
            type: 'Deleted',
            message: message,
            is_read: false
        }]);

        // 3. Email Notification (if email exists)
        if (complaint.complainantEmail) {
            const templateParams = {
                to_name: complaint.complainantName || "Student",
                to_email: complaint.complainantEmail,
                complaint_title: complaint.complainttitle,
                new_status: 'Deleted',
                message: message
            };
            // Public Key: 08jWWt0PNjZJ4BcQw
            emailjs.send('service_q77wg09', 'template_sb3k70p', templateParams, '08jWWt0PNjZJ4BcQw')
                .then(() => console.log('Email sent'))
                .catch(err => console.error('Email failed', err));
        }

        alert('Complaint deleted successfully.');
        window.location.href = 'AllComplaints.html';

    } catch (err) {
        console.error('Error deleting complaint:', err);
        alert('Failed to delete complaint.');
    }
}


function renderSpecificDetails(catName, data) {
    if (!data) return;

    categoryDetailsCard.classList.remove('hidden');
    categoryNameEl.textContent = catName;
    categoryFields.textContent = ''; // Clear container safely

    const createField = (label, value) => {
        // Use Template instead of innerHTML
        const clone = categoryFieldTemplate.content.cloneNode(true);
        const labelEl = clone.querySelector('.field-label');
        const valueEl = clone.querySelector('.field-value');

        labelEl.textContent = label;
        valueEl.textContent = value || 'N/A';

        if (!value) {
            // Apply italic styling for N/A if needed by adding a span or just setting text
            // innerHTML support for <span class="italic">N/A</span> was removed.
            // We can add the class directly if value is missing.
            valueEl.classList.add('italic', 'text-gray-400');
        }

        categoryFields.appendChild(clone);
    };

    if (catName === 'Technical') {
        createField('Type of Issue', data.typeofissue);
        createField('Device Affected', data.deviceaffected);
        createField('Previous Attempts', data.previousattempts);
    } else if (catName === 'Student Disciplinary') {
        createField('Accused Name', data.accusedname);
        createField('Type of Behavior', data.typeofbehavior);
        createField('Location', data.locationofincident);
        createField('Witness Details', data.witnessdetail);
        createField('Previous Attempts', data.previousattempts);
    } else if (catName === 'Facility') {
        createField('Facility Type', data.typeoffacility);
        createField('Issue', data.typeoffacilityissue);
        createField('Floor', data.facilityfloor);
        createField('Previous Attempt', data.previousattempt);
    } else if (catName === 'Administrative') {
        createField('Department', data.complaintdepartment);
        createField('Staff Involved', data.staffinvolved);
        createField('Desired Outcome', data.desiredoutcome);
        createField('Previous Attempts', data.previousattempts);
    } else if (catName === 'Academic') {
        createField('Lecturer Name', data.lecturername);
        createField('Module Name', data.modulename);
        createField('Batch Code', data.batchcode);
        createField('Level', data.currentlevel);
        createField('Semester', data.semester);
        createField('Issue', data.specificationofissue);
        createField('Phone', data.phone);
        createField('Desired Outcome', data.desiredoutcome);
        createField('Previous Attempts', data.previousattempts);
    } else if (catName === 'Other') {
        createField('Suggested Category', data.suggestedcategory);
        createField('Desired Outcome', data.desiredoutcome);
        createField('Previous Attempts', data.previousattempts);
    }
}

function renderAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
        attachmentsContainer.textContent = ''; // Clear
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'text-gray-500 text-sm italic';
        emptyMsg.textContent = 'No attachments found.';
        attachmentsContainer.appendChild(emptyMsg);
        return;
    }

    attachmentsContainer.textContent = ''; // Clear
    attachments.forEach(file => {
        // Use Template instead of innerHTML
        const clone = attachmentItemTemplate.content.cloneNode(true);
        const link = clone.querySelector('.attachment-link');
        const filenameEl = clone.querySelector('.attachment-filename');
        const descEl = clone.querySelector('.attachment-desc');

        link.href = file.fileurl;
        filenameEl.textContent = file.filename;
        descEl.textContent = file.description || 'Attachment';

        attachmentsContainer.appendChild(clone);
    });
}

function renderFeedback(complaint) {
    feedbackContainer.textContent = ''; // Clear
    const p = document.createElement('p');

    if (complaint.admin_feedback) {
        p.className = 'text-gray-700 dark:text-gray-300 whitespace-pre-wrap';
        p.textContent = complaint.admin_feedback;
    } else {
        p.className = 'text-gray-500 text-sm italic';
        p.textContent = 'No feedback provided yet.';
    }
    feedbackContainer.appendChild(p);
}

function getStatusColor(status) {
    switch (status) {
        case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        case 'In-Progress': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'Resolved': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        case 'Deleted': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
}
// ------------------------
//  LOGOUT LOGIC
// ------------------------
function setupEventListeners() {
    // Header Logout
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
    if (headerLogoutBtn) {
        headerLogoutBtn.addEventListener('click', handleLogout);
    }

    // Modal Action Listeners
    const modal = document.getElementById('logoutModal');
    if (modal) {
        const cancelBtn = document.getElementById('cancelLogoutBtn');
        const confirmBtn = document.getElementById('confirmLogoutBtn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Error signing out:', error);
                window.location.href = 'Login.html';
            });
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    // Mobile Logout Interception
    const mobileLogoutWait = setInterval(() => {
        const mobileLogout = document.querySelector('#mobileMenu a[href="Login.html"]');
        if (mobileLogout) {
            mobileLogout.addEventListener('click', handleLogout);
            clearInterval(mobileLogoutWait);
        } else if (document.readyState === 'complete') {
            const lastTry = document.querySelector('#mobileMenu a[href="Login.html"]');
            if (lastTry) lastTry.addEventListener('click', handleLogout);
            clearInterval(mobileLogoutWait);
        }
    }, 100);
}

function handleLogout(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('hidden');
}

// Initialize listeners
setupEventListeners();
