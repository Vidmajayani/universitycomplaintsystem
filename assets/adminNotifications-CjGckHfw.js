import{s as l}from"./darkMode-creXmiRS.js";let d=null,s=[];function y(t){const e=t?.toLowerCase();return e==="academic"?"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800":e==="technical"?"bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800":e==="facility"?"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800":e==="student disciplinary"||e==="student behavior"?"bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800":e==="administrative"?"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800":"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}document.addEventListener("DOMContentLoaded",async()=>{const{data:{session:t}}=await l.auth.getSession();if(!t||!t.user){window.location.href="Login.html";return}d=t.user.id,console.log("Logged in as User ID:",d);const{data:e}=await l.from("admin").select("adminrole").eq("id",d).single();if(e?.adminrole==="Master Admin"){console.log("Master Admin detected: Redirecting to dashboard"),window.location.href="AdminDashboard.html";return}console.log("Admin Role:",e?.adminrole),await h(!1),w()});async function h(t=!1){try{let e=l.from("admin_notifications").select(`
                *,
                complaint:complaint_id (
                    complainttitle,
                    category:categoryid (categoryname),
                    user:complainantid (first_name, last_name)
                )
            `);t?console.log("Master Admin detected: Loading all notifications"):e=e.eq("admin_id",d);const{data:r,error:n}=await e.order("created_at",{ascending:!1});if(n)throw n;console.log("Fetched notifications with details:",r),s=r||[],f()}catch(e){console.error("Error loading notifications:",e),_()}}function f(){const t=document.getElementById("loadingState"),e=document.getElementById("emptyState"),r=document.getElementById("notificationsList"),n=document.getElementById("markAllReadBtn");if(t.classList.add("hidden"),s.length===0){e.classList.remove("hidden"),r.classList.add("hidden"),n.classList.add("hidden");return}e.classList.add("hidden"),r.classList.remove("hidden"),s.filter(a=>!a.is_read).length>0?n.classList.remove("hidden"):n.classList.add("hidden"),r.innerHTML=s.map(a=>{const i=!a.is_read,m=new Date(a.created_at),o=v(m),c=a.complaint,g=c?.user,x=g?`${g.first_name} ${g.last_name}`:"Unknown User",b=c?.category?.categoryname||"General";return`
            <div class="notification-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition cursor-pointer ${i?"border-l-4 border-blue-500":""}"
                 data-id="${a.id}"
                 data-complaint-id="${a.complaint_id}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="fas fa-exclamation-circle text-blue-500"></i>
                            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${a.type}</span>
                            <span class="px-2 py-0.5 ${y(b)} text-xs rounded-full font-medium transition-colors">${b}</span>
                            ${i?'<span class="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full font-medium">New</span>':""}
                        </div>
                        <p class="text-gray-800 dark:text-gray-200 mb-1 font-medium">${a.message}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">By: <span class="font-semibold text-gray-800 dark:text-gray-200">${x}</span></p>
                        <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span><i class="far fa-clock mr-1"></i>${o}</span>
                            <span><i class="fas fa-hashtag mr-1"></i>Complaint ${a.complaint_id}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 ml-4">
                        ${i?`
                            <button class="mark-read-btn px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    data-id="${a.id}">
                                <i class="fas fa-check mr-1"></i>Mark Read
                            </button>
                        `:""}
                        <i class="fas fa-chevron-right text-black dark:text-white text-lg"></i>
                    </div>
                </div>
            </div>
        `}).join(""),document.querySelectorAll(".notification-card").forEach(a=>{a.addEventListener("click",async i=>{if(i.target.closest(".mark-read-btn")){i.stopPropagation();const c=parseInt(i.target.closest(".mark-read-btn").dataset.id);await p(c);return}const m=parseInt(a.dataset.id),o=parseInt(a.dataset.complaintId);await p(m),o&&(console.log("Navigating to AdminComplaintDetails for ID:",o),window.location.href=`AdminComplaintDetails.html?id=${o}`)})})}async function p(t){try{const{error:e}=await l.from("admin_notifications").update({is_read:!0}).eq("id",t).eq("admin_id",d);if(e)throw e;const r=s.find(n=>n.id===t);r&&(r.is_read=!0,f())}catch(e){console.error("Error marking notification as read:",e)}}async function k(){try{const{error:t}=await l.from("admin_notifications").update({is_read:!0}).eq("admin_id",d).eq("is_read",!1);if(t)throw t;s.forEach(e=>e.is_read=!0),f()}catch(t){console.error("Error marking all as read:",t)}}function w(){const t=document.getElementById("markAllReadBtn");t&&t.addEventListener("click",k)}function v(t){const e=Math.floor((new Date-t)/1e3),r={year:31536e3,month:2592e3,week:604800,day:86400,hour:3600,minute:60};for(const[n,u]of Object.entries(r)){const a=Math.floor(e/u);if(a>=1)return`${a} ${n}${a>1?"s":""} ago`}return"Just now"}function _(){const t=document.getElementById("loadingState");t.innerHTML=`
        <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <p class="text-red-600 dark:text-red-400">Failed to load notifications. Please refresh the page.</p>
    `}
