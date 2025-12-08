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
// WORD COUNT VALIDATION + LIVE COUNTERS
// ==============================

// Description (max 500 words)
const description = document.getElementById("description");
const descCounter = document.getElementById("descCounter");

description.addEventListener("input", () => {
  let words = countWords(description.value);
  descCounter.textContent = `${words} / 500 words`;

  if (words > 500) {
    description.value = description.value.split(/\s+/).slice(0, 500).join(" ");
  }
});

// File Description (max 100 words)
const fileDesc = document.getElementById("fileDesc");
const fileCounter = document.getElementById("fileCounter");

fileDesc.addEventListener("input", () => {
  let words = countWords(fileDesc.value);
  fileCounter.textContent = `${words} / 100 words`;

  if (words > 100) {
    fileDesc.value = fileDesc.value.split(/\s+/).slice(0, 100).join(" ");
  }
});

// Previous Attempt (max 100 words)
const previousAttempt = document.getElementById("previousAttempt");
const prevAttemptCounter = document.getElementById("prevAttemptCounter");

previousAttempt.addEventListener("input", () => {
  let words = countWords(previousAttempt.value);
  prevAttemptCounter.textContent = `${words} / 100 words`;

  if (words > 100) {
    previousAttempt.value = previousAttempt.value.split(/\s+/).slice(0, 100).join(" ");
  }
});

// ==============================
// FORM SUBMISSION + SUPABASE
// ==============================
document.addEventListener("DOMContentLoaded", async () => {

  const form = document.getElementById("facilityComplaintForm");

  // ======================
  // SUPABASE SESSION
  // ======================
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

  // ======================
  // FORM SUBMIT LISTENER
  // ======================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let errors = [];
    // Get current value
    const complaintTitle = document.getElementById("complaintTitle").value.trim();

    // JS Validation
    if (!complaintTitle) {
      errors.push("Complaint title is required.");
    } else if (!/^[A-Za-z0-9\s]+$/.test(complaintTitle)) {
      errors.push("Complaint title can only contain letters, numbers, and spaces.");
    }

    // Remove previous red borders
    document.querySelectorAll(".border-red-500").forEach(el => {
      el.classList.remove("border-red-500");
    });

    // ======================
    // VALIDATIONS
    // ======================
    const requiredFields = [
      "facilityType",
      "facilityIssue",
      "floor",
      "dateObservation",
      "description"
    ];

    requiredFields.forEach(id => {
      const field = document.getElementById(id);

      if (!field.value.trim()) {
        field.classList.add("border-red-500");
        errors.push(`${id.replace(/([A-Z])/g, ' $1')} is required.`);
      }
    });

    // Date cannot be in the future
    let selectedDate = new Date(document.getElementById("dateObservation").value);
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      errors.push("Date of observation cannot be in the future.");
      document.getElementById("dateObservation").classList.add("border-red-500");
    }

    // Word counts
    if (countWords(description.value) > 500) {
      errors.push("Description cannot exceed 500 words.");
      description.classList.add("border-red-500");
    }

    if (countWords(fileDesc.value) > 100) {
      errors.push("File description cannot exceed 100 words.");
      fileDesc.classList.add("border-red-500");
    }

    if (countWords(previousAttempt.value) > 100) {
      errors.push("Previous attempt cannot exceed 100 words.");
      previousAttempt.classList.add("border-red-500");
    }

    // File size limit
    let file = document.getElementById("file").files[0];
    if (file && file.size > MAX_FILE_SIZE) {
      errors.push("Attached file must be less than 5 MB.");
    }

    // Declaration required
    if (!document.getElementById("declaration").checked) {
      errors.push("You must confirm the declaration.");
    }

    // Stop submission if errors found
    if (errors.length > 0) {
      alert("Please fix the following issues:\n\n" + errors.join("\n"));
      return; // Stop execution if validation fails
    }

    // ======================
    // SUPABASE INSERTS
    // ======================
    try {
      // 1. Get Facility Admin ID
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('id')
        .eq('adminrole', 'Facility Admin')
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching Facility Admin:", adminError);
        alert("System Error: Could not find Facility Admin. Please contact support.");
        return;
      }

      const facilityAdminId = adminData.id;

      // 2. Get Facility Category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('categoryid')
        .eq('categoryname', 'Facility')
        .single();

      if (categoryError || !categoryData) {
        console.error("Error fetching Facility category:", categoryError);
        alert("System Error: Could not find Facility category. Please contact support.");
        return;
      }

      const facilityCategoryId = categoryData.categoryid;

      // Insert into complaint table
      const dateObservationValue = document.getElementById("dateObservation").value;
      const descriptionValue = description.value.trim();

      const { data: complaintData, error: complaintError } = await supabase
        .from("complaint")
        .insert([
          {
            complainantid: userId,
            adminid: facilityAdminId,
            categoryid: facilityCategoryId,
            submitteddate: new Date().toISOString(),
            dateofincident: dateObservationValue,
            complainttitle: complaintTitle,
            complaintdescription: descriptionValue,
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

      // Insert into facilitycomplaint table
      const { error: facilityError } = await supabase
        .from("facilitycomplaint")
        .insert([
          {
            complaintid: complaintID,
            typeoffacility: document.getElementById("facilityType").value,
            typeoffacilityissue: document.getElementById("facilityIssue").value,
            facilityfloor: document.getElementById("floor").value,
            previousattempt: previousAttempt.value.trim(),
          },
        ]);

      if (facilityError) {
        console.error("Facility complaint insert error:", facilityError);
        alert("Failed to save facility complaint. Please try again.");
        return;
      }

      // Optional file upload
      const fileInput = document.getElementById("file");
      const fileDescriptionValue = fileDesc.value.trim();

      if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          const fileName = `${Date.now()}_${file.name}`;

          const { data: fileData, error: fileError } = await supabase.storage
            .from("user-uploads")
            .upload(fileName, file);

          if (fileError) {
            console.error("File upload error:", fileError);
            alert("File upload failed. Please try again.");
            return;
          }

          const { data } = supabase.storage.from("user-uploads").getPublicUrl(fileData.path);
          const publicUrl = data.publicUrl;

          const { error: attachmentError } = await supabase
            .from("complaintattachment")
            .insert([
              {
                complaintid: complaintID,
                fileurl: publicUrl,
                description: fileDescriptionValue,
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
      fileCounter.textContent = "0 / 100 words";
      prevAttemptCounter.textContent = "0 / 100 words";

      alert("Facility complaint submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  });
});
