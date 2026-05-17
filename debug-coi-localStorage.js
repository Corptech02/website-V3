// Debug COI localStorage Script - Run in CRM Browser Console
// This will show all localStorage keys and find where COI documents are stored

console.log('🔍 Debugging COI localStorage...');

// Show all localStorage keys
console.log('📋 All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    const preview = value.length > 100 ? value.substring(0, 100) + '...' : value;
    console.log(`  ${i + 1}. ${key} (${value.length} chars): ${preview}`);
}

// Check specific keys that might contain COI data
const coiKeys = ['policies', 'coi_documents', 'coiDocuments', 'documents'];
coiKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
        console.log(`\n📄 Found data in '${key}':`, data.length, 'characters');
        try {
            const parsed = JSON.parse(data);
            console.log(`   Type: ${typeof parsed}, Array: ${Array.isArray(parsed)}`);
            if (Array.isArray(parsed)) {
                console.log(`   Array length: ${parsed.length}`);
                parsed.forEach((item, idx) => {
                    if (item && typeof item === 'object') {
                        console.log(`   Item ${idx} keys:`, Object.keys(item));
                        if (item.coiDocuments) {
                            console.log(`     COI documents: ${item.coiDocuments.length}`);
                            item.coiDocuments.forEach((doc, docIdx) => {
                                console.log(`       Doc ${docIdx}: ${doc.name} (${doc.dataUrl ? doc.dataUrl.length : 0} chars)`);
                            });
                        }
                    }
                });
            }
        } catch (e) {
            console.log(`   Parse error: ${e.message}`);
        }
    }
});

// Search for any key containing 'coi'
console.log('\n🔍 Keys containing COI:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.toLowerCase().includes('coi')) {
        const value = localStorage.getItem(key);
        console.log(`   ${key}: ${value.length} chars`);
    }
}