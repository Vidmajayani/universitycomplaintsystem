import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Immediate Session Check
  const { data: { session: activeSession } } = await supabase.auth.getSession();
  if (!activeSession || !activeSession.user) {
    window.location.href = "Login.html";
    return;
  }

  const form = document.getElementById("otherComplaintForm");

  const dateIncident = document.getElementById("dateIncident");
  const description = document.getElementById("description");
  const fileDesc = document.getElementById("fileDesc");
  const previousAttempt = document.getElementById("previousAttempt");
  const declaration = document.getElementById("declaration");
  const desiredOutcome = document.getElementById("desiredOutcome");
  const suggestedCategory = document.getElementById("category");

  const descCounter = document.getElementById("descCounter");
  const fileCounter = document.getElementById("fileCounter");
  const attemptCounter = document.getElementById("attemptCounter");


  // Set today's date as max
  const today = new Date().toISOString().split("T")[0];
  dateIncident.setAttribute("max", today);

  // ==============================
  // Word count helper
  // ==============================
  function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function setupWordCounter(element, counter, maxWords) {
    element.addEventListener("input", () => {
      let words = countWords(element.value);
      if (words > maxWords) {
        element.value = element.value.split(/\s+/).slice(0, maxWords).join(" ");
        words = maxWords;
      }
      counter.textContent = `${words} / ${maxWords} words`;
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
  setupWordCounter(previousAttempt, attemptCounter, 100);

  // Initial trigger
  [description, fileDesc, previousAttempt].forEach(el => {
    if (el) el.dispatchEvent(new Event('input'));
  });

  // ==============================
  // Supabase session
  // ==============================
  let session = activeSession;
  try {
    // session retrieved
  } catch (e) {
    console.error("Supabase session error:", e);
  }

  if (!session || !session.user) {
    window.location.href = "Login.html";
    return;
  }

  const userId = session.user.id;

  // ==============================
  // Form submission
  // ==============================
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

    const today = new Date().toISOString().split("T")[0];

    // ==============================
    // Existing validations (unchanged)
    // ==============================
    if (!dateIncident.value) {
      errors.push("Please select the Date of Incident.");
    } else if (dateIncident.value > today) {
      errors.push("Date of Incident cannot be in the future.");
    }

    if (!description.value.trim()) {
      errors.push("Description is required.");
    }

    if (!declaration.checked) {
      errors.push("You must declare that the information is accurate.");
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    try {
      // 1. Get General Admin ID (for Other complaints)
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('id')
        .eq('adminrole', 'General Admin')
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching General Admin:", adminError);
        alert("System Error: Could not find General Admin. Please contact support.");
        return;
      }

      const generalAdminId = adminData.id;

      // 2. Get Other Category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('categoryid')
        .eq('categoryname', 'Other')
        .single();

      if (categoryError || !categoryData) {
        console.error("Error fetching Other category:", categoryError);
        alert("System Error: Could not find Other category. Please contact support.");
        return;
      }

      const otherCategoryId = categoryData.categoryid;

      // Insert into main complaint table
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaint")
        .insert([
          {
            complainantid: userId,
            adminid: generalAdminId,
            categoryid: otherCategoryId,
            submitteddate: new Date().toISOString(),
            dateofincident: dateIncident.value,
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

      // Insert into othercomplaint table
      const { error: otherError } = await supabase
        .from("othercomplaint")
        .insert([
          {
            complaintid: complaintID,
            previousattempts: previousAttempt.value.trim() || null,
            suggestedcategory: suggestedCategory.value.trim() || null,
            desiredoutcome: desiredOutcome.value.trim() || null,
          },
        ]);

      if (otherError) {
        console.error("Other complaint insert error:", otherError);
        alert("Failed to save other complaint. Please try again.");
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

      // ================ INSERT ADMIN NOTIFICATION ================
      try {
        await supabase.from('admin_notifications').insert([{
          admin_id: generalAdminId,
          complaint_id: complaintID,
          type: 'New Complaint',
          message: `New complaint submitted: "${complaintTitle}"`,
          is_read: false
        }]);
      } catch (notifError) {
        console.error('Failed to create admin notification:', notifError);
      }

      // Reset form and counters
      form.reset();
      descCounter.textContent = "0 / 500 words";
      fileCounter.textContent = "0 / 100 words";
      attemptCounter.textContent = "0 / 100 words";

      alert("Other complaint submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  });
});
