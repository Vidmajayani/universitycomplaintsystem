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
// MAIN INITIALIZATION
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Immediate Session Check
  const { data: { session: activeSession } } = await supabase.auth.getSession();
  if (!activeSession || !activeSession.user) {
    window.location.href = "Login.html";
    return;
  }

  const userId = activeSession.user.id;
  const form = document.getElementById("facilityComplaintForm");

  // Elements for counters and logic
  const description = document.getElementById("description");
  const descCounter = document.getElementById("descCounter");
  const fileDesc = document.getElementById("fileDesc");
  const fileCounter = document.getElementById("fileCounter");
  const previousAttempt = document.getElementById("previousAttempt");
  const prevAttemptCounter = document.getElementById("prevAttemptCounter");
  const fileInput = document.getElementById("file");
  const imagePreview = document.getElementById("imagePreview");
  const declaration = document.getElementById("declaration");
  const dateObservation = document.getElementById("dateObservation");
  const complaintTitleInput = document.getElementById("complaintTitle");

  // Prevent future dates
  const today = new Date().toISOString().split("T")[0];
  if (dateObservation) dateObservation.max = today;

  // ==============================
  // WORD COUNTERS
  // ==============================
  function setupWordCounter(element, counter, maxWords) {
    if (!element || !counter) return;
    element.addEventListener("input", () => {
      let words = element.value.trim().split(/\s+/).filter(Boolean);
      if (words.length > maxWords) {
        element.value = words.slice(0, maxWords).join(" ");
        words = words.slice(0, maxWords);
      }
      counter.textContent = `${words.length} / ${maxWords} words`;
    });
  }

  setupWordCounter(description, descCounter, 500);
  setupWordCounter(fileDesc, fileCounter, 100);
  setupWordCounter(previousAttempt, prevAttemptCounter, 100);

  // Initial trigger
  [description, fileDesc, previousAttempt].forEach(el => {
    if (el) el.dispatchEvent(new Event('input'));
  });

  // ================ IMAGE PREVIEW ================
  if (fileInput && imagePreview) {
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
  }

  // ======================
  // FORM SUBMISSION
  // ======================
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let errors = [];
      const complaintTitle = complaintTitleInput.value.trim();

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

      // VALIDATIONS
      const requiredFields = [
        { id: "facilityType", label: "Facility Type" },
        { id: "facilityIssue", label: "Facility Issue" },
        { id: "floor", label: "Floor" },
        { id: "dateObservation", label: "Date of Observation" },
        { id: "description", label: "Description" }
      ];

      requiredFields.forEach(fieldInfo => {
        const field = document.getElementById(fieldInfo.id);
        if (!field || !field.value.trim()) {
          if (field) field.classList.add("border-red-500");
          errors.push(`${fieldInfo.label} is required.`);
        }
      });

      // Date check
      if (dateObservation.value > today) {
        errors.push("Date of observation cannot be in the future.");
        dateObservation.classList.add("border-red-500");
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

      // File size
      const file = fileInput.files[0];
      if (file && file.size > MAX_FILE_SIZE) {
        errors.push("Attached file must be less than 5 MB.");
      }

      // Declaration
      if (!declaration.checked) {
        errors.push("You must confirm the declaration.");
      }

      if (errors.length > 0) {
        alert("Please fix the following issues:\n\n" + errors.join("\n"));
        return;
      }

      try {
        // 1. Get Admin/Category IDs
        const { data: adminData } = await supabase.from('admin').select('id').eq('adminrole', 'Facility Admin').single();
        const { data: categoryData } = await supabase.from('category').select('categoryid').eq('categoryname', 'Facility').single();

        if (!adminData || !categoryData) {
          alert("System Error: Could not find Facility Admin or Category.");
          return;
        }

        // Insert into complaint
        const { data: complaintData, error: complaintError } = await supabase
          .from("complaint")
          .insert([
            {
              complainantid: userId,
              adminid: adminData.id,
              categoryid: categoryData.categoryid,
              submitteddate: new Date().toISOString(),
              dateofincident: dateObservation.value,
              complainttitle: complaintTitle,
              complaintdescription: description.value.trim(),
              complaintstatus: "Pending",
            },
          ])
          .select()
          .single();

        if (complaintError) throw complaintError;

        const complaintID = complaintData.complaintid;

        // Insert into facilitycomplaint
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

        if (facilityError) throw facilityError;

        // File upload
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const fileName = `${Date.now()}_${file.name}`;
          const { data: fileData, error: fileError } = await supabase.storage.from("user-uploads").upload(fileName, file);

          if (fileError) throw fileError;

          const { data: urlData } = supabase.storage.from("user-uploads").getPublicUrl(fileData.path);

          await supabase.from("complaintattachment").insert([
            {
              complaintid: complaintID,
              fileurl: urlData.publicUrl,
              description: fileDesc.value.trim(),
              filename: file.name,
            },
          ]);
        }

        // ================ INSERT ADMIN NOTIFICATION ================
        try {
          await supabase.from('admin_notifications').insert([{
            admin_id: adminData.id,
            complaint_id: complaintID,
            type: 'New Complaint',
            message: `New Facility complaint submitted: "${complaintTitle}"`,
            is_read: false
          }]);
        } catch (notifError) {
          console.error('Failed to create admin notification:', notifError);
        }

        // Reset
        form.reset();
        [description, fileDesc, previousAttempt].forEach(el => {
          if (el) el.dispatchEvent(new Event('input'));
        });
        imagePreview.innerHTML = "";
        alert("Facility complaint submitted successfully!");

      } catch (err) {
        console.error(err);
        alert("Submission failed. Please try again.");
      }
    });
  }
});
