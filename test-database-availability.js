// Test Database Availability and Data Ranges
console.log('🔍 Testing FMCSA Database Availability');

async function testDatabaseRanges() {
    const baseUrl = 'https://162-220-14-239.nip.io/api';

    // Test different time ranges to find where data exists
    const testRanges = [
        { days: 1, skip_days: 0, label: 'Next 1 day' },
        { days: 7, skip_days: 0, label: 'Next 7 days' },
        { days: 30, skip_days: 0, label: 'Next 30 days' },
        { days: 90, skip_days: 0, label: 'Next 90 days' },
        { days: 365, skip_days: 0, label: 'Next 365 days' },
        { days: 30, skip_days: -30, label: 'Past 30 days' },
        { days: 365, skip_days: -365, label: 'Past 365 days' },
        { days: 3650, skip_days: -1825, label: 'All time range' }
    ];

    const testStates = ['OH', 'TX', 'CA', 'FL', 'NY'];

    console.log('📊 Testing different time ranges and states...\n');

    for (const range of testRanges) {
        console.log(`⏰ ${range.label}:`);

        for (const state of testStates) {
            try {
                const testUrl = `${baseUrl}/matched-carriers-leads?state=${state}&days=${range.days}&skip_days=${range.skip_days}&min_fleet=1&max_fleet=9999&limit=5`;

                const response = await fetch(testUrl);
                const data = await response.json();

                if (data.total_available !== undefined && data.total_available > 0) {
                    console.log(`   ${state}: ${data.total_available.toLocaleString()} leads`);

                    // Show sample data if available
                    if (data.leads && data.leads.length > 0) {
                        const sample = data.leads[0];
                        console.log(`      Sample: ${sample.company_name} - Expires: ${sample.insurance_expiry}`);
                    }
                } else {
                    console.log(`   ${state}: No data`);
                }

                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.log(`   ${state}: ERROR - ${error.message}`);
            }
        }
        console.log('');
    }

    // Test the exact same query that worked in your logs
    console.log('🎯 Testing the exact query from your successful logs:');
    const successfulUrl = `${baseUrl}/matched-carriers-leads?state=OH&days=30&skip_days=0&min_fleet=1&max_fleet=9999`;

    try {
        const response = await fetch(successfulUrl);
        const data = await response.json();

        console.log('📊 Results from successful query:');
        console.log(`   Total available: ${data.total_available || 'undefined'}`);
        console.log(`   Leads returned: ${data.leads ? data.leads.length : 0}`);
        console.log(`   Data source: ${data.data_source || 'unknown'}`);

        if (data.leads && data.leads.length > 0) {
            console.log('\n📋 Sample leads:');
            data.leads.slice(0, 3).forEach((lead, i) => {
                console.log(`   ${i + 1}. ${lead.company_name} (${lead.state}) - DOT: ${lead.dot_number} - Expires: ${lead.insurance_expiry}`);
            });
        }

    } catch (error) {
        console.log(`❌ Error with successful query: ${error.message}`);
    }
}

testDatabaseRanges();