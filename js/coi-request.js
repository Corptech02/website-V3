// COI Request Functionality

// Open COI Modal
function openCOIModal() {
    const modal = document.getElementById('coiModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // Reset form when opening
        document.getElementById('coiRequestForm').reset();
    }
}

// Close COI Modal
function closeCOIModal() {
    const modal = document.getElementById('coiModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close Success Message
function closeSuccessMessage() {
    const successModal = document.getElementById('coiSuccess');
    if (successModal) {
        successModal.style.display = 'none';
    }
}

// Format phone number as user types
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.length <= 3) {
                    value = `(${value}`;
                } else if (value.length <= 6) {
                    value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                } else {
                    value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                }
            }
            e.target.value = value;
        });
    }

    // Format policy number as user types
    const policyInput = document.getElementById('policyNumber');
    if (policyInput) {
        policyInput.addEventListener('input', function(e) {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            
            // Auto-format: XX-YYYY-NNNNN
            if (value.length > 2 && value[2] !== '-') {
                value = value.slice(0, 2) + '-' + value.slice(2);
            }
            if (value.length > 7 && value[7] !== '-') {
                value = value.slice(0, 7) + '-' + value.slice(7);
            }
            
            // Limit to format length
            if (value.length > 13) {
                value = value.slice(0, 13);
            }
            
            e.target.value = value;
        });
    }
});

// Submit COI Request
async function submitCOIRequest(event) {
    event.preventDefault();

    const form = document.getElementById('coiRequestForm');
    const formData = new FormData(form);

    // Get form values
    const requestData = {
        policyNumber: formData.get('policyNumber'),
        phoneNumber: formData.get('phoneNumber'),
        email: formData.get('email') || '',
        certificateHolder: formData.get('certificateHolder') || 'Not specified',
        additionalInfo: formData.get('additionalInfo') || 'None',
        requestDate: new Date().toISOString(),
        status: 'pending',
        source: 'website'
    };

    console.log('COI Request being sent to CRM:', requestData);

    // Show loading on submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending to CRM...';
        submitBtn.disabled = true;
    }

    try {
        // Send to CRM via proxy
        const response = await fetch('/api/coi-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('COI Request successfully sent to CRM:', result);

            // Store in localStorage as backup
            let coiRequests = JSON.parse(localStorage.getItem('coiRequests') || '[]');
            coiRequests.push(requestData);
            localStorage.setItem('coiRequests', JSON.stringify(coiRequests));

            // Close modal and show success message
            closeCOIModal();

            // Show success message
            const successModal = document.getElementById('coiSuccess');
            if (successModal) {
                successModal.style.display = 'flex';

                // Auto-close after 5 seconds
                setTimeout(() => {
                    closeSuccessMessage();
                }, 5000);
            }
        } else {
            throw new Error(result.error || 'Failed to send COI request');
        }

    } catch (error) {
        console.error('Error sending COI request to CRM:', error);
        alert('Error: Unable to send COI request to CRM. Please contact us at contact@vigagency.com or call (866) 628-9441.');
    } finally {
        // Restore button
        if (submitBtn) {
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.disabled = false;
        }
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('coiModal');
    if (event.target === modal) {
        closeCOIModal();
    }
    
    const successModal = document.getElementById('coiSuccess');
    if (event.target === successModal) {
        closeSuccessMessage();
    }
});

// Add keyboard support (ESC to close)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeCOIModal();
        closeSuccessMessage();
    }
});