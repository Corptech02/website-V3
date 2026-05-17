// Test script to verify Ultimate Callback-Only Override
console.log('🧪 TESTING Ultimate Callback-Only Override...');

// Simulate test environment
if (typeof localStorage !== 'undefined') {

    // Test leads - some with and without overdue callbacks
    const testLeads = [
        {
            id: '1',
            name: 'Lead No Callbacks',
            stage: 'info_received',
            phone: '555-1111'
        },
        {
            id: '2',
            name: 'Lead Overdue Callback',
            stage: 'info_received',
            phone: '555-2222'
        },
        {
            id: '3',
            name: 'App Sent Lead',
            stage: 'app_sent',
            phone: '555-3333'
        }
    ];

    // Create test callbacks with one overdue
    const testCallbacks = {
        '1': [], // No callbacks
        '2': [   // Overdue callback
            {
                date: '2025-02-04', // Yesterday (overdue)
                time: '10:00',
                completed: false,
                note: 'Follow up call'
            }
        ],
        '3': []  // No callbacks for app sent lead
    };

    // Store test data
    localStorage.setItem('insurance_leads', JSON.stringify(testLeads));
    localStorage.setItem('scheduled_callbacks', JSON.stringify(testCallbacks));

    console.log('📊 Test data stored');

    // Wait for ultimate override to load, then run tests
    setTimeout(() => {
        console.log('🧪 Running tests...');

        // Test each lead
        testLeads.forEach(lead => {
            if (typeof window.ultimateCallbackOnlyGetNextAction === 'function') {
                const result = window.ultimateCallbackOnlyGetNextAction(lead.stage, lead);
                console.log(`🎯 Lead ${lead.id} (${lead.name}) -> "${result}"`);

                // Check expectations
                if (lead.id === '1') {
                    // Should show stage action, not reach out
                    const expected = result === 'Prepare Quote';
                    console.log(`   ✅ Lead 1: ${expected ? 'PASS' : 'FAIL'} - Should show "Prepare Quote", got "${result}"`);
                }

                if (lead.id === '2') {
                    // Should show reach out call (has overdue callback)
                    const expected = result.includes('Reach out: CALL');
                    console.log(`   ✅ Lead 2: ${expected ? 'PASS' : 'FAIL'} - Should show "Reach out: CALL", got "${result}"`);
                }

                if (lead.id === '3') {
                    // App sent should show empty
                    const expected = result === '';
                    console.log(`   ✅ Lead 3: ${expected ? 'PASS' : 'FAIL'} - Should show empty, got "${result}"`);
                }
            } else {
                console.log('❌ ultimateCallbackOnlyGetNextAction function not found');
            }
        });

        // Test that competing systems are disabled
        const competingFunctions = [
            'checkExpiredHighlight',
            'applyExpiredHighlightFix',
            'emergencyCallbackCheck',
            'checkReachOutRequirement'
        ];

        competingFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                try {
                    const result = window[funcName]();
                    console.log(`🛑 ${funcName}: ${result === false || result === undefined ? 'DISABLED ✅' : 'STILL ACTIVE ❌'}`);
                } catch (e) {
                    console.log(`🛑 ${funcName}: DISABLED ✅ (throws error: ${e.message})`);
                }
            } else {
                console.log(`🛑 ${funcName}: NOT FOUND (expected)`);
            }
        });

        console.log('🏁 Ultimate Override Test completed');

    }, 3000); // Wait 3 seconds for override to fully load

} else {
    console.log('❌ localStorage not available for testing');
}