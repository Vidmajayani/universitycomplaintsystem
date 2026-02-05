import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './', // Ensures relative paths for GitHub Pages
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'src/Login.html'),
                userDashboard: resolve(__dirname, 'src/UserDashboard.html'),
                newComplaint: resolve(__dirname, 'src/Newcomplaint.html'),
                myComplaints: resolve(__dirname, 'src/Mycomplaint.html'),
                profile: resolve(__dirname, 'src/Profile.html'),
                notifications: resolve(__dirname, 'src/Notifications.html'),
                changePassword: resolve(__dirname, 'src/ChangePassword.html'),
                resetPassword: resolve(__dirname, 'src/ResetPassword.html'),

                // Forms
                academicForm: resolve(__dirname, 'src/AcademicForm.html'),
                administrativeForm: resolve(__dirname, 'src/AdministrativeForm.html'),
                facilityForm: resolve(__dirname, 'src/FacilityForm.html'),
                studentBehaviorForm: resolve(__dirname, 'src/StudentBehaviorForm.html'),
                technicalForm: resolve(__dirname, 'src/TechnicalForm.html'),
                otherForm: resolve(__dirname, 'src/OtherForm.html'),

                // Lost & Found Pages
                lostAndFound: resolve(__dirname, 'src/LostAndFound.html'),

                // Admin Pages
                adminDashboard: resolve(__dirname, 'src/AdminDashboard.html'),
                allComplaints: resolve(__dirname, 'src/AllComplaints.html'),
                adminComplaintDetails: resolve(__dirname, 'src/AdminComplaintDetails.html'),
                analytics: resolve(__dirname, 'src/Analytics.html'),
                adminProfile: resolve(__dirname, 'src/AdminProfile.html'),
                adminLostFound: resolve(__dirname, 'src/AdminLostFound.html'),
                adminLostFoundDashboard: resolve(__dirname, 'src/AdminLostFoundDashboard.html'),
                adminLostFoundDetails: resolve(__dirname, 'src/AdminLostFoundDetails.html'),
                adminFoundItemDetails: resolve(__dirname, 'src/AdminFoundItemDetails.html'),
                adminUploadFoundItem: resolve(__dirname, 'src/AdminUploadFoundItem.html'),
                adminNotifications: resolve(__dirname, 'src/AdminNotifications.html'),
                userComplaintDetails: resolve(__dirname, 'src/UserComplaintDetails.html'),
                userLostFoundDetails: resolve(__dirname, 'src/UserLostFoundDetails.html'),
            },
        },
    },
});
