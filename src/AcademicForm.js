import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Immediate Session Check
  const { data: { session: activeSession } } = await supabase.auth.getSession();
  if (!activeSession || !activeSession.user) {
    window.location.href = "Login.html";
    return;
  }

  const form = document.getElementById("complaintForm");

  // ================ ERROR HELPER ================
  function showError(id, message) {
    const field = document.getElementById(id);
    const errorElement = field.nextElementSibling;

    if (errorElement && errorElement.classList.contains("error-text")) {
      errorElement.textContent = message;
      errorElement.style.color = "var(--color-error, #ff4d4d)";
    }
  }

  function clearError(id) {
    const field = document.getElementById(id);
    const errorElement = field.nextElementSibling;

    if (errorElement && errorElement.classList.contains("error-text")) {
      errorElement.textContent = "";
    }
  }

  // ================ WORD COUNT ================
  function wordCount(text) {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  function updateWordCount(id, counterId, maxWords) {
    const textArea = document.getElementById(id);
    let text = textArea.value.trim();
    const count = wordCount(text);
    document.getElementById(counterId).textContent = `${count} / ${maxWords} words`;

    if (count > maxWords) {
      textArea.value = text.split(/\s+/).slice(0, maxWords).join(" ");
    }
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

  ["description", "fileDesc", "previousAttempt"].forEach((id) => {
    const counterId =
      id === "description"
        ? "descCounter"
        : id === "fileDesc"
          ? "fileCounter"
          : "attemptCounter";

    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () =>
        updateWordCount(id, counterId, id === "description" ? 500 : 100)
      );
      // Initial trigger
      el.dispatchEvent(new Event('input'));
    }
  });

  // ================ SUPABASE SESSION ================
  // Using the session captured immediately above
  let session = activeSession;

  if (!session || !session.user) {
    window.location.href = "Login.html";
    return;
  }

  const userId = session.user.id;

  // ================ FORM SUBMIT ================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // clear all old errors
    document.querySelectorAll(".error-text").forEach((el) => (el.textContent = ""));

    let valid = true;

    // ========== COMPLAINT TITLE VALIDATION ==========
    const complaintTitle = document.getElementById("complaintTitle").value.trim();
    if (!complaintTitle) {
      valid = false;
      showError("complaintTitle", "Complaint title is required.");
    }

    // ========== VALIDATION RULES ==========

    const dateIncidentValue = document.getElementById("dateIncident").value;
    const dateIncident = new Date(dateIncidentValue);
    const today = new Date();

    if (!dateIncidentValue || dateIncident >= today) {
      valid = false;
      showError("dateIncident", "Incident date must be before today.");
    }

    const phone = document.getElementById("phone").value.trim();
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      valid = false;
      showError("phone", "Phone number must be exactly 10 digits.");
    }

    const level = document.getElementById("currentLevel").value;
    if (!level) {
      valid = false;
      showError("currentLevel", "Please select a level.");
    }

    const semester = document.getElementById("semester").value;
    if (!semester) {
      valid = false;
      showError("semester", "Please select a semester.");
    }

    const description = document.getElementById("description").value.trim();
    if (wordCount(description) > 500 || !description) {
      valid = false;
      showError("description", "Description must be less than 500 words.");
    }

    const fileDesc = document.getElementById("fileDesc").value.trim();
    if (wordCount(fileDesc) > 100) {
      valid = false;
      showError("fileDesc", "File description must be less than 100 words.");
    }

    const attempts = document.getElementById("previousAttempt").value.trim();
    if (wordCount(attempts) > 100) {
      valid = false;
      showError("previousAttempt", "Previous attempts must be less than 100 words.");
    }

    const desiredOutcome = document.getElementById("desiredOutcome").value.trim();
    if (wordCount(desiredOutcome) > 100) {
      valid = false;
      showError("desiredOutcome", "Desired outcome must be less than 100 words.");
    }

    if (!document.getElementById("declaration").checked) {
      valid = false;
      document
        .getElementById("declaration")
        .nextElementSibling.insertAdjacentHTML(
          "afterend",
          `<p class="error-text" style="color:red;">You must agree to the declaration.</p>`
        );
    }

    if (!valid) return;

    // ================ SUPABASE INSERT ================
    try {
      // 1. Get Academic Admin ID
      const { data: adminData, error: adminError } = await supabase
        .from('admin') // Table name
        .select('id') // Get the 'id' column
        .eq('adminrole', 'Academic Admin') // WHERE adminrole = 'Academic Admin'
        .single(); // Return single result

      if (adminError || !adminData) {
        console.error("Error fetching Academic Admin:", adminError);
        alert("System Error: Could not find Academic Admin. Please contact support.");
        return;
      }

      const academicAdminId = adminData.id;

      // 2. Get Academic Category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('categoryid')
        .eq('categoryname', 'Academic')
        .single();

      if (categoryError || !categoryData) {
        console.error("Error fetching Academic category:", categoryError);
        alert("System Error: Could not find Academic category. Please contact support.");
        return;
      }

      const academicCategoryId = categoryData.categoryid;

      const { data: complaintData, error: complaintError } = await supabase
        .from("complaint")
        .insert([
          {
            complainantid: userId,
            adminid: academicAdminId,
            categoryid: academicCategoryId,
            submitteddate: new Date().toISOString(),
            dateofincident: dateIncidentValue,
            complainttitle: complaintTitle,
            complaintdescription: description,
            complaintstatus: "Pending",
          },
        ])
        .select()
        .single();

      if (complaintError) {
        console.error(complaintError);
        return;
      }

      const complaintID = complaintData.complaintid;

      const { error: academicError } = await supabase
        .from("academiccomplaint")
        .insert([
          {
            complaintid: complaintID,
            lecturername: document.getElementById("lecturer").value.trim(),
            batchcode: document.getElementById("batchCode").value.trim(),
            modulename: document.getElementById("moduleName").value.trim(),
            currentlevel: level,
            phone: phone,
            semester: semester,
            specificationofissue: document
              .getElementById("issueSpec")
              .value.trim(),
            previousattempts: attempts,
            desiredoutcome: desiredOutcome,
          },
        ]);

      if (academicError) {
        console.error(academicError);
        return;
      }

      // ================ FILE UPLOAD (Optional) ================
      const fileInput = document.getElementById("file");
      const fileDescription = document.getElementById("fileDesc").value.trim();

      if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          const fileName = `${Date.now()}_${file.name}`;

          //  Upload file to Supabase Storage
          const { data: fileData, error: fileError } = await supabase.storage
            .from("user-uploads")
            .upload(fileName, file);

          if (fileError) {
            console.error("File upload error:", fileError);
            alert("File upload failed. Please try again.");
            return;
          }

          //  Get public URL
          const { data } = supabase.storage.from("user-uploads").getPublicUrl(fileData.path);
          const publicUrl = data.publicUrl;

          console.log("File public URL:", publicUrl);

          //  Save file info to complaintattachment table
          const { error: attachmentError } = await supabase
            .from("complaintattachment")
            .insert([
              {
                complaintid: complaintID,
                fileurl: publicUrl, // store the public URL
                description: fileDescription,
                filename: file.name // optional: save original file name
              },
            ]);

          if (attachmentError) {
            console.error("Attachment insert error:", attachmentError);
            alert("Failed to save file info. Please try again.");
            return;
          }
        }
      }

      // ================ INSERT ADMIN NOTIFICATION ================
      // Notify the assigned admin about the new complaint
      try {
        await supabase.from('admin_notifications').insert([{
          admin_id: academicAdminId,
          complaint_id: complaintID,
          type: 'New Complaint',
          message: `New Academic complaint submitted: "${complaintTitle}"`,
          is_read: false
        }]);
      } catch (notifError) {
        console.error('Failed to create admin notification:', notifError);
        // Don't block the submission if notification fails
      }

      form.reset();

      alert("Your Academic complaint has been submitted successfully!");
    } catch (err) {
      console.error(err);
    }
  });
});
