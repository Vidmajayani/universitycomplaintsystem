import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Immediate Session Check
  const { data: { session: activeSession } } = await supabase.auth.getSession();
  if (!activeSession || !activeSession.user) {
    window.location.href = "Login.html";
    return;
  }

  const form = document.getElementById("behaviorForm");

  const description = document.getElementById("description");
  const location = document.getElementById("location");
  const fileDetail = document.getElementById("fileDetail");
  const declaration = document.getElementById("declaration");
  const involvedStudents = document.getElementById("involvedStudents");
  const misconduct = document.getElementById("misconduct");
  const previousAttempts = document.getElementById("previousAttempts");

  const descCounter = document.getElementById("descCounter");
  const locationCounter = document.getElementById("locationCounter");
  const fileDetailCounter = document.getElementById("fileCounter");
  const attemptCounter = document.getElementById("attemptCounter");

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
  const fileUpload = document.getElementById("fileUpload");
  const imagePreview = document.getElementById("imagePreview");

  fileUpload.addEventListener("change", () => {
    imagePreview.innerHTML = "";
    if (fileUpload.files) {
      Array.from(fileUpload.files).forEach((file, index) => {
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
              // Since it's 'multiple', for now we'll just clear the input if any are deleted
              // or we can just remove the specific container. 
              // To keep it simple and consistent with how file inputs work without complex management:
              fileUpload.value = "";
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
  setupWordCounter(location, locationCounter, 100);
  setupWordCounter(fileDetail, fileDetailCounter, 100);
  setupWordCounter(previousAttempts, attemptCounter, 100);

  // Initial trigger to update counters if fields have default text (though they shouldn't usually)
  [description, location, fileDetail, previousAttempts].forEach(el => {
    if (el) el.dispatchEvent(new Event('input'));
  });

  // ==============================
  // Supabase session
  // ==============================
  let session = activeSession;
  try {
    // Session already retrieved
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

    // ==============================
    // Existing validations (unchanged)
    // ==============================
    if (!misconduct.value) errors.push("Please select the Nature of Misconduct.");
    if (!description.value.trim()) errors.push("Description is required.");
    if (!declaration.checked) errors.push("You must declare that the information is accurate.");

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    try {
      // 1. Get Student Disciplinary Admin ID
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('id')
        .eq('adminrole', 'Student Disciplinary Admin')
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching Student Disciplinary Admin:", adminError);
        alert("System Error: Could not find Student Disciplinary Admin. Please contact support.");
        return;
      }

      const disciplinaryAdminId = adminData.id;

      // 2. Get Student Disciplinary Category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('categoryid')
        .eq('categoryname', 'Student Disciplinary')
        .single();

      if (categoryError || !categoryData) {
        console.error("Error fetching Student Disciplinary category:", categoryError);
        alert("System Error: Could not find Student Disciplinary category. Please contact support.");
        return;
      }

      const disciplinaryCategoryId = categoryData.categoryid;

      // Insert into main complaint table
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaint")
        .insert([
          {
            complainantid: userId,
            adminid: disciplinaryAdminId,
            categoryid: disciplinaryCategoryId,
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

      // Insert into studentbehaviorcomplaint table
      const { error: studentError } = await supabase
        .from("studentbehaviorcomplaint")
        .insert([
          {
            complaintid: complaintID,
            accusedname: involvedStudents.value.trim() || null,
            typeofbehavior: misconduct.value,
            locationofincident: location.value.trim(),
            witnessdetail: document.getElementById("witness").value.trim() || null,
            previousattempts: previousAttempts.value.trim() || null,
          },
        ]);

      if (studentError) {
        console.error("Student behavior insert error:", studentError);
        alert("Failed to save student behavior complaint. Please try again.");
        return;
      }

      // Optional file upload
      const fileInput = document.getElementById("fileUpload");
      const fileDescription = fileDetail.value.trim();

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

      // ================ INSERT ADMIN NOTIFICATION ================
      try {
        await supabase.from('admin_notifications').insert([{
          admin_id: disciplinaryAdminId,
          complaint_id: complaintID,
          type: 'New Complaint',
          message: `New Student Behavior complaint submitted: "${complaintTitle}"`,
          is_read: false
        }]);
      } catch (notifError) {
        console.error('Failed to create admin notification:', notifError);
      }

      // Reset form and counters
      form.reset();
      descCounter.textContent = "0 / 500 words";
      locationCounter.textContent = "0 / 100 words";
      fileDetailCounter.textContent = "0 / 100 words";
      attemptCounter.textContent = "0 / 100 words";

      alert("Student behavior complaint submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  });
});
