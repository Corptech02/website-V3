// Complete FMCSA Database Analysis - Get Entire Database
console.log('🔍 COMPLETE FMCSA DATABASE ANALYSIS');
console.log('=====================================');

async function getEntireFMCSADatabase() {
    const baseUrl = 'https://162-220-14-239.nip.io/api';

    // All US states
    const allStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    let grandTotal = 0;
    const stateResults = {};
    const timeRanges = [
        { days: 30, label: '30 days' },
        { days: 60, label: '60 days' },
        { days: 90, label: '90 days' },
        { days: 180, label: '6 months' },
        { days: 365, label: '12 months' },
        { days: 730, label: '24 months' },
        { days: 1095, label: '3 years' },
        { days: 1825, label: '5 years' }
    ];

    console.log('📊 Querying all states for complete database size...');
    console.log('⏳ This will take several minutes to complete...\n');

    try {
        // First, get the absolute maximum by querying with very large time range
        console.log('🔍 Phase 1: Finding maximum database size...');

        for (const state of allStates.slice(0, 10)) { // Test first 10 states for speed
            try {
                // Query with maximum possible range
                const maxUrl = `${baseUrl}/matched-carriers-leads?state=${state}&days=3650&skip_days=0&min_fleet=1&max_fleet=99999&limit=1`;
                console.log(`   Checking ${state}...`);

                const response = await fetch(maxUrl);
                const data = await response.json();

                if (data.total_available !== undefined) {
                    const count = data.total_available;
                    stateResults[state] = count;
                    grandTotal += count;
                    console.log(`   ${state}: ${count.toLocaleString()} total leads`);
                } else {
                    console.log(`   ${state}: No data returned`);
                    stateResults[state] = 0;
                }

                // Delay to avoid overwhelming API
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.log(`   ${state}: ERROR - ${error.message}`);
                stateResults[state] = 'ERROR';
            }
        }

        console.log(`\n📊 Phase 1 Results (First 10 states):`);
        console.log(`   Total leads found: ${grandTotal.toLocaleString()}`);
        console.log(`   Average per state: ${Math.round(grandTotal / 10).toLocaleString()}`);
        console.log(`   Projected all states: ${Math.round(grandTotal * 5).toLocaleString()}\n`);

        // Phase 2: Get remaining states
        console.log('🔍 Phase 2: Querying remaining states...');

        for (const state of allStates.slice(10)) {
            try {
                const maxUrl = `${baseUrl}/matched-carriers-leads?state=${state}&days=3650&skip_days=0&min_fleet=1&max_fleet=99999&limit=1`;
                console.log(`   Checking ${state}...`);

                const response = await fetch(maxUrl);
                const data = await response.json();

                if (data.total_available !== undefined) {
                    const count = data.total_available;
                    stateResults[state] = count;
                    grandTotal += count;
                    console.log(`   ${state}: ${count.toLocaleString()} total leads`);
                } else {
                    stateResults[state] = 0;
                }

                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.log(`   ${state}: ERROR - ${error.message}`);
                stateResults[state] = 'ERROR';
            }
        }

        // Final summary
        console.log('\n🎯 FINAL DATABASE ANALYSIS:');
        console.log('================================');
        console.log(`📊 TOTAL LEADS IN ENTIRE DATABASE: ${grandTotal.toLocaleString()}`);
        console.log(`🗺️  States covered: ${allStates.length}`);
        console.log(`📈 Average leads per state: ${Math.round(grandTotal / allStates.length).toLocaleString()}`);

        // Top states by lead count
        const sortedStates = Object.entries(stateResults)
            .filter(([state, count]) => typeof count === 'number')
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        console.log('\n🏆 TOP 10 STATES BY LEAD COUNT:');
        sortedStates.forEach(([state, count], index) => {
            console.log(`   ${index + 1}. ${state}: ${count.toLocaleString()} leads`);
        });

        // Time-based breakdown for top state
        const topState = sortedStates[0][0];
        console.log(`\n📅 TIME-BASED BREAKDOWN FOR ${topState}:`);

        for (const timeRange of timeRanges) {
            try {
                const timeUrl = `${baseUrl}/matched-carriers-leads?state=${topState}&days=${timeRange.days}&skip_days=0&min_fleet=1&max_fleet=99999&limit=1`;
                const timeResponse = await fetch(timeUrl);
                const timeData = await timeResponse.json();

                if (timeData.total_available !== undefined) {
                    console.log(`   ${timeRange.label}: ${timeData.total_available.toLocaleString()} leads`);
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.log(`   ${timeRange.label}: ERROR`);
            }
        }

        // Save results
        window.completeFMCSAResults = {
            grandTotal,
            stateResults,
            topStates: sortedStates,
            analysisDate: new Date().toISOString()
        };

        console.log('\n✅ Complete FMCSA database analysis finished!');
        console.log('📁 Results saved to window.completeFMCSAResults');

    } catch (error) {
        console.error('❌ Critical error during database analysis:', error);
    }
}

// Execute the complete analysis
getEntireFMCSADatabase();

console.log('\n⚡ Analysis started - results will appear above as they complete...');
console.log('📝 This script will query all 50 states to get the complete database size.');
console.log('⏰ Estimated completion time: 5-10 minutes');