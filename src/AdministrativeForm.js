import { supabase } from "./supabaseClient.js";

// ==============================
// Administrative Complaint Form
// ==============================

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("adminComplaintForm");

  const description = document.getElementById("description");
  const previousAttempts = document.getElementById("previousAttempts");
  const fileDesc = document.getElementById("fileDesc");
  const staffInvolved = document.getElementById("staffInvolved");
  const declaration = document.getElementById("declaration");
  const adminType = document.getElementById("adminType");

  const descCounter = document.getElementById("descCounter");
  const attemptCounter = document.getElementById("attemptCounter");
  const fileCounter = document.getElementById("fileCounter");

  // ==============================
  // Word Count Helper
  // ==============================
  function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function setupWordCounter(textarea, counter, maxWords) {
    textarea.addEventListener("input", () => {
      let words = countWords(textarea.value);
      if (words > maxWords) {
        const trimmed = textarea.value.split(/\s+/).slice(0, maxWords).join(" ");
        textarea.value = trimmed;
        words = maxWords;
      }
      counter.textContent = `${words} / ${maxWords} words`;
    });
  }

  setupWordCounter(description, descCounter, 500);
  setupWordCounter(previousAttempts, attemptCounter, 100);
  setupWordCounter(fileDesc, fileCounter, 100);

  // ==============================
  // Supabase Session
  // ==============================
  let session = null;
  try {
    const response = await supabase.auth.getSession();
    session = response.data.session;
  } catch (e) {
    console.error("Supabase session error:", e);
  }

  if (!session || !session.user) {
    window.location.href = "/login.html";
    return;
  }

  const userId = session.user.id;

  // ==============================
  // Form Submission
  // ==============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let errors = [];

    // Get the current value when the form is submitted
    const complaintTitle = document.getElementById("complaintTitle").value.trim();

    // ==============================
    // Existing Validations
    // ==============================
    if (!complaintTitle) {
      errors.push("Complaint title is required.");
    } else if (!/^[A-Za-z0-9\s]+$/.test(complaintTitle)) {
      errors.push("Complaint title can only contain letters, numbers, and spaces.");
    }

    if (!adminType.value) {
      errors.push("Please select a Type of Administration.");
    }

    if (!description.value.trim()) {
      errors.push("Description is required.");
    }

    if (!declaration.checked) {
      errors.push("You must declare that the information provided is accurate.");
    }

    if (staffInvolved.value.trim() && !/^[a-zA-Z0-9\s]+$/.test(staffInvolved.value)) {
      errors.push("Staff Involved can only contain letters, numbers, and spaces.");
    }

    if (countWords(description.value) > 500) {
      errors.push("Description cannot exceed 500 words.");
    }

    if (countWords(previousAttempts.value) > 100) {
      errors.push("Previous attempts cannot exceed 100 words.");
    }

    if (countWords(fileDesc.value) > 100) {
      errors.push("File description cannot exceed 100 words.");
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    // ==============================
    // Insert into Supabase
    // ==============================
    try {
      // 1. Get Administrative Admin ID
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('id')
        .eq('adminrole', 'Administrative Admin')
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching Administrative Admin:", adminError);
        alert("System Error: Could not find Administrative Admin. Please contact support.");
        return;
      }

      const administrativeAdminId = adminData.id;

      // 2. Get Administrative Category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('categoryid')
        .eq('categoryname', 'Administrative')
        .single();

      if (categoryError || !categoryData) {
        console.error("Error fetching Administrative category:", categoryError);
        alert("System Error: Could not find Administrative category. Please contact support.");
        return;
      }

      const administrativeCategoryId = categoryData.categoryid;

      // Insert into main complaint table
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaint")
        .insert([
          {
            complainantid: userId,
            adminid: administrativeAdminId,
            categoryid: administrativeCategoryId,
            submitteddate: new Date().toISOString(),
            dateofincident: new Date().toISOString(),
            complainttitle: complaintTitle,
            complaintdescription: description.value.trim(),
            complaintstatus: "Pending",
          },
        ])
        .select()
        .single();

      if (complaintError) {
        console.error("Complaint insert error:", complaintError);
        alert("Failed to submit complaint. Please try again.");
        return;
      }

      const complaintID = complaintData.complaintid;

      // Insert into administrative complaint table
      const { error: adminComplaintError } = await supabase
        .from("administrativecomplaint")
        .insert([
          {
            complaintid: complaintID,
            complaintdepartment: adminType.value,
            staffinvolved: staffInvolved.value.trim() || null,
            previousattempts: previousAttempts.value.trim() || null,
            desiredoutcome: document.getElementById("desiredOutcome").value.trim() || null,
          },
        ]);

      if (adminComplaintError) {
        console.error("Administrative complaint insert error:", adminComplaintError);
        alert("Failed to save administrative complaint. Please try again.");
        return;
      }

      // Optional file upload
      const fileInput = document.getElementById("file");
      const fileDescription = fileDesc.value.trim();
      if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          const fileName = `${Date.now()}_${file.name}`;

          // Upload file to Supabase Storage
          const { data: fileData, error: fileError } = await supabase.storage
            .from("user-uploads")
            .upload(fileName, file);

          if (fileError) {
            console.error("File upload error:", fileError);
            alert("File upload failed. Please try again.");
            return;
          }

          // Get public URL
          const { data } = supabase.storage.from("user-uploads").getPublicUrl(fileData.path);
          const publicUrl = data.publicUrl;

          // Save file info to complaintattachment table
          const { error: attachmentError } = await supabase
            .from("complaintattachment")
            .insert([
              {
                complaintid: complaintID,
                fileurl: publicUrl,
                description: fileDescription,
                filename: file.name,
              },
            ]);

          if (attachmentError) {
            console.error("Attachment insert error:", attachmentError);
            alert("Failed to save file info. Please try again.");
            return;
          }
        }
      }

      // Reset form and counters
      form.reset();
      descCounter.textContent = "0 / 500 words";
      attemptCounter.textContent = "0 / 100 words";
      fileCounter.textContent = "0 / 100 words";

      alert("Administrative complaint submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  });
});
