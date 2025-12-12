// ===============================
// FORMS.JS
// Handles form-specific functionality
// ===============================
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate Session Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login.html';
        return;
    }
    const complaintForms = document.querySelectorAll('form');

    complaintForms.forEach(form => {
        // Form type detection
        const formId = form.querySelector('h1')?.textContent.toLowerCase() || '';

        // ------------------------------
        // Word Counter for textareas (if any)
        // ------------------------------
        const textareaWithCounter = form.querySelector('textarea#description');
        const counterEl = form.querySelector('#descCounter');
        if (textareaWithCounter && counterEl) {
            textareaWithCounter.addEventListener('input', () => {
                const words = textareaWithCounter.value.trim().split(/\s+/).filter(Boolean).length;
                counterEl.textContent = `${words} / 500 words`;
            });
        }

        // ------------------------------
        // Form validation on submit
        // ------------------------------
        form.addEventListener('submit', (e) => {
            const declaration = form.querySelector('#declaration');
            if (declaration && !declaration.checked) {
                alert('Please agree to the declaration before submitting.');
                e.preventDefault();
                return;
            }

            // Additional per-form validations
            if (formId.includes('technical')) {
                const issueType = form.querySelector('#issueType');
                const device = form.querySelector('#device');
                if (!issueType.value || !device.value) {
                    alert('Please fill all required fields.');
                    e.preventDefault();
                }
            }

            if (formId.includes('student behavior') || formId.includes('other')) {
                const requiredInputs = form.querySelectorAll('input[required], textarea[required]');
                let empty = false;
                requiredInputs.forEach(input => {
                    if (utils.isEmpty(input.value)) empty = true;
                });
                if (empty) {
                    alert('Please fill all required fields.');
                    e.preventDefault();
                }
            }
        });
    });
});
