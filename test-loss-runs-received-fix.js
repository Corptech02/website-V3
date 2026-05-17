// Test script to verify Loss Runs Received To Do text fix
console.log('🧪 TESTING Loss Runs Received To Do text fix...');

// Create a test lead with loss_runs_received stage
const testLead = {
    id: 'test-123',
    name: 'Test Company for Loss Runs Received',
    stage: 'loss_runs_received',
    phone: '555-123-4567',
    reachOut: {
        callAttempts: 0,
        callsConnected: 0,
        emailCount: 0,
        textCount: 0,
        voicemailCount: 0
    }
};

// Test the fixed getNextAction function
if (typeof window.getNextAction === 'function') {
    const result = window.getNextAction('loss_runs_received', testLead);
    console.log('✅ Testing getNextAction for loss_runs_received:', result);

    if (result === 'Prepare app.') {
        console.log('✅ SUCCESS: Loss Runs Received stage returns correct To Do text: "Prepare app."');
    } else {
        console.log('❌ FAILED: Expected "Prepare app." but got:', result);
    }
} else {
    console.log('❌ getNextAction function not found');
}

// Test the ultimate override function if it exists
if (typeof window.ultimateGetNextAction === 'function') {
    const result = window.ultimateGetNextAction('loss_runs_received', testLead);
    console.log('✅ Testing ultimateGetNextAction for loss_runs_received:', result);

    if (result === 'Prepare app.') {
        console.log('✅ SUCCESS: Ultimate override returns correct To Do text: "Prepare app."');
    } else {
        console.log('❌ FAILED: Expected "Prepare app." but got:', result);
    }
} else {
    console.log('❌ ultimateGetNextAction function not found');
}

console.log('🧪 Test completed. Check console output above for results.');