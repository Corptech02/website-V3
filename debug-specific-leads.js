// Debug script for specific leads showing incorrect "Reach Out" text
console.log('🔍 DEBUGGING: Specific leads with "Reach Out" issue...');

// Function to check specific leads
function debugSpecificLeads() {
    try {
        const leads = JSON.parse(localStorage.getItem('insurance_leads') || '[]');
        const callbacks = JSON.parse(localStorage.getItem('scheduled_callbacks') || '{}');

        // Find leads with names containing the problematic text
        const problematicLeads = leads.filter(lead =>
            lead.name && (
                lead.name.toUpperCase().includes('DOLLY DONKEYS') ||
                lead.name.toUpperCase().includes('ZEMAX LOGISTICS')
            )
        );

        console.log(`🎯 Found ${problematicLeads.length} problematic leads`);

        problematicLeads.forEach(lead => {
            console.log(`\n📊 LEAD DEBUG: ${lead.name}`);
            console.log(`   ID: ${lead.id}`);
            console.log(`   Stage: ${lead.stage}`);
            console.log(`   Phone: ${lead.phone}`);

            // Check what the current getNextAction returns
            if (typeof window.getNextAction === 'function') {
                const todoResult = window.getNextAction(lead.stage, lead);
                console.log(`   Current TO DO: "${todoResult}"`);
            } else {
                console.log('   ❌ getNextAction function not found');
            }

            // Check for callbacks
            const leadCallbacks = callbacks[lead.id] || [];
            console.log(`   Callbacks: ${leadCallbacks.length} total`);

            if (leadCallbacks.length > 0) {
                const now = new Date();
                leadCallbacks.forEach((callback, index) => {
                    const callbackTime = new Date(`${callback.date}T${callback.time}`);
                    const isOverdue = !callback.completed && callbackTime < now;
                    console.log(`     ${index + 1}. ${callback.date} ${callback.time} - Completed: ${callback.completed} - Overdue: ${isOverdue}`);
                });
            }

            // Check what the simplified logic should return
            const expectedActions = {
                'info_received': 'Prepare Quote',
                'loss_runs_received': 'Prepare app.',
                'loss_runs_requested': 'Prepare app.',
                'app_prepared': 'Email brokers',
                'app_sent': '',
                'new': 'Assign Stage'
            };

            const expectedAction = expectedActions[lead.stage] || '';
            console.log(`   Expected TO DO: "${expectedAction}"`);

            if (todoResult !== expectedAction && !todoResult.includes('Reach out: CALL')) {
                console.log(`   ❌ MISMATCH: Should show "${expectedAction}" not "${todoResult}"`);
            }
        });

        // Also check table cells directly
        console.log('\n🔍 CHECKING TABLE CELLS:');
        const tableBody = document.querySelector('#leadsTableBody') || document.querySelector('tbody');
        if (tableBody) {
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const checkbox = row.querySelector('.lead-checkbox');
                if (!checkbox) return;

                const leadId = checkbox.value;
                const lead = leads.find(l => String(l.id) === String(leadId));
                if (!lead) return;

                if (lead.name && (lead.name.toUpperCase().includes('DOLLY DONKEYS') || lead.name.toUpperCase().includes('ZEMAX LOGISTICS'))) {
                    const todoCell = row.querySelectorAll('td')[6]; // TODO column
                    const cellContent = todoCell ? todoCell.textContent.trim() : 'N/A';
                    console.log(`   ${lead.name}: Table cell shows "${cellContent}"`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error in debug:', error);
    }
}

// Run immediately
debugSpecificLeads();

// Make available globally
window.debugSpecificLeads = debugSpecificLeads;

console.log('💡 Run debugSpecificLeads() to check these leads again');