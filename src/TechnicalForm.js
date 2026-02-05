import { supabase } from "./supabaseClient.js";

// ==============================
// WORD COUNT HELPER
// ==============================
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Maximum file size (5 MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ==============================
// DOMContentLoaded
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Immediate Session Check
  const { data: { session: activeSession } } = await supabase.auth.getSession();
  if (!activeSession || !activeSession.user) {
    window.location.href = "Login.html";
    return;
  }

  const form = document.getElementById("technicalForm");

  // Get elements
  const issueType = document.getElementById("issueType");
  const device = document.getElementById("device");
  const dateIncident = document.getElementById("dateIncident");
  const description = document.getElementById("description");
  const fileDesc = document.getElementById("fileDesc");
  const previousAttempts = document.getElementById("previousAttempts");
  const declaration = document.getElementById("declaration");
  const complaintTitle = document.getElementById("complaintTitle");

  const descCounter = document.getElementById("descCounter");
  const fileCounter = document.getElementById("fileCounter");
  const attemptCounter = document.getElementById("attemptCounter");

  // ======================
  // SET MAX DATE (Today)
  // ======================
  const today = new Date().toISOString().split("T")[0];
  dateIncident.max = today;

  // ======================
  // WORD COUNTER SETUP
  // ======================
  function setupWordCounter(element, counter, maxWords) {
    element.addEventListener("input", () => {
      let words = element.value.trim().split(/\s+/).filter(Boolean);
      if (words.length > maxWords) {
        element.value = words.slice(0, maxWords).join(" ");
        words = words.slice(0, maxWords);
      }
      counter.textContent = `${words.length} / ${maxWords} words`;
    });
  }

  // ================ IMAGE PREVIEW ================
  const fileInput = document.getElementById("file");
  const imagePreview = document.getElementById("imagePreview");

  fileInput.addEventListener("change", () => {
    imagePreview.innerHTML = "";
    if (fileInput.files) {
      Array.from(fileInput.files).forEach(file => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const container = document.createElement("div");
            container.classList.add("relative", "w-24", "h-24");

            const img = document.createElement("img");
            img.src = e.target.result;
            img.classList.add("w-full", "h-full", "object-cover", "rounded-lg", "border", "border-gray-200", "shadow-sm");

            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.classList.add("absolute", "-top-2", "-right-2", "bg-red-500", "text-white", "rounded-full", "w-6", "h-6", "flex", "items-center", "justify-center", "text-xs", "hover:bg-red-600", "shadow-md");
            deleteBtn.onclick = (event) => {
              event.preventDefault();
              fileInput.value = "";
              imagePreview.innerHTML = "";
            };

            container.appendChild(img);
            container.appendChild(deleteBtn);
            imagePreview.appendChild(container);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  });

  setupWordCounter(description, descCounter, 500);
  setupWordCounter(fileDesc, fileCounter, 100);
  setupWordCounter(previousAttempts, attemptCounter, 100);

  // Initial trigger to update counters
  [description, fileDesc, previousAttempts].forEach(el => {
    if (el) el.dispatchEvent(new Event('input'));
  });

  // ======================
  // SUPABASE SESSION
  // ======================
  let session = activeSession;

  try {
    // session retrieved
  } catch (err) {
    console.error("Session error:", err);
  }

  if (!session || !session.user) {
    window.location.href = "Login.html";
    return;
  }

  const userId = session.user.id;

  // ======================
  // FORM SUBMISSION
  // ======================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let errors = [];

    // Basic validations
    if (!complaintTitle.value.trim()) errors.push("Complaint title is required.");
    if (!issueType.value) errors.push("Type of Issue is required.");
    if (!device.value.trim()) errors.push("Device / Software Affected is required.");
    if (!description.value.trim()) errors.push("Description of Issue is required.");
    if (!declaration.checked) errors.push("You must accept the declaration.");

    if (dateIncident.value > today) {
      errors.push("Date of Issue cannot be in the future.");
    }

    // File size check
    let fileInput = document.getElementById("file");
    let file = fileInput.files[0];

    if (file && file.size > MAX_FILE_SIZE) {
      errors.push("File must be smaller than 5MB.");
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    try {
      // 1. Get Technical Admin ID
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('id')
        .eq('adminrole', 'Technical Admin')
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching Technical Admin:", adminError);
        alert("System Error: Could not find Technical Admin. Please contact support.");
        return;
      }

      const technicalAdminId = adminData.id;

      // 2. Get Technical Category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('categoryid')
        .eq('categoryname', 'Technical')
        .single();

      if (categoryError || !categoryData) {
        console.error("Error fetching Technical category:", categoryError);
        alert("System Error: Could not find Technical category. Please contact support.");
        return;
      }

      const technicalCategoryId = categoryData.categoryid;

      // ==============================
      // INSERT INTO complaint TABLE
      // ==============================
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaint")
        .insert([
          {
            complainantid: userId,
            adminid: technicalAdminId,
            categoryid: technicalCategoryId,
            submitteddate: new Date().toISOString(),
            dateofincident: dateIncident.value,
            complainttitle: complaintTitle.value.trim(),
            complaintdescription: description.value.trim(),
            complaintstatus: "Pending",
          },
        ])
        .select()
        .single();

      if (complaintError) {
        console.error("Complaint insert failed:", complaintError);
        alert("Failed to save complaint.");
        return;
      }

      const complaintID = complaintData.complaintid;

      // ==============================
      // INSERT INTO technicalcomplaint TABLE
      // ==============================
      const { error: techError } = await supabase
        .from("technicalcomplaint")
        .insert([
          {
            complaintid: complaintID,
            typeofissue: issueType.value,
            deviceaffected: device.value.trim(),
            previousattempts: previousAttempts.value.trim(),
          },
        ]);

      if (techError) {
        console.error("Technical insert failed:", techError);
        alert("Failed to save technical complaint.");
        return;
      }

      // ==============================
      // FILE UPLOAD (optional)
      // ==============================
      if (file) {
        const fileName = `${Date.now()}_${file.name}`;

        const { data: fileData, error: fileError } = await supabase.storage
          .from("user-uploads")
          .upload(fileName, file);

        if (fileError) {
          console.error("File upload error:", fileError);
          alert("File upload failed.");
          return;
        }

        const { data: urlData } = supabase
          .storage
          .from("user-uploads")
          .getPublicUrl(fileData.path);

        const publicUrl = urlData.publicUrl;

        // Save file info
        await supabase.from("complaintattachment").insert([
          {
            complaintid: complaintID,
            fileurl: publicUrl,
            filename: file.name,
            description: fileDesc.value.trim(),
          },
        ]);
      }

      // ================ INSERT ADMIN NOTIFICATION ================
      try {
        await supabase.from('admin_notifications').insert([{
          admin_id: technicalAdminId,
          complaint_id: complaintID,
          type: 'New Complaint',
          message: `New Technical complaint submitted: "${complaintTitle.value}"`,
          is_read: false
        }]);
      } catch (notifError) {
        console.error('Failed to create admin notification:', notifError);
      }

      // Reset form
      form.reset();
      descCounter.textContent = "0 / 500 words";
      fileCounter.textContent = "0 / 100 words";
      attemptCounter.textContent = "0 / 100 words";

      alert("Technical complaint submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  });
});
