// Simple Node.js test for DOT lookup integration

console.log('🧪 Testing DOT Integration Logic...');

// Mock carrier data from API response
const mockCarrierData = {
    "DOT_NUMBER": 3833739,
    "LEGAL_NAME": "GOLDS CUSTOM SERVICES INC",
    "PHY_STATE": "IN",
    "PHONE": "8155883712"
};

// Simulate the processCarrierData function logic
function processCarrierDataMock(leadId, carrierData) {
    console.log(`📝 POPULATE: Processing carrier data for lead ${leadId}`);

    const populatedData = {
        // Basic company information
        companyName: carrierData.LEGAL_NAME || carrierData.legal_name || carrierData.company_name || '',
        dbaName: carrierData.DBA_NAME || carrierData.dba_name || '',
        dotNumber: carrierData.DOT_NUMBER || carrierData.usdot_number || carrierData.dot_number || '',
        mcNumber: carrierData.MC_NUMBER || carrierData.mc_number || '',

        // Contact information
        phone: carrierData.PHONE || carrierData.phone || '',
        email: carrierData.EMAIL_ADDRESS || carrierData.email || carrierData.email_address || '',

        // Address
        address: carrierData.PHY_STREET || carrierData.physical_address || carrierData.street_address || '',
        city: carrierData.PHY_CITY || carrierData.physical_city || carrierData.city || '',
        state: carrierData.PHY_STATE || carrierData.physical_state || carrierData.state || '',
        zipCode: carrierData.PHY_ZIP || carrierData.physical_zip_code || carrierData.zip_code || '',

        // Business information
        yearEstablished: calculateYearFromDate(carrierData.ADD_DATE || carrierData.authority_date),
        operatingStatus: carrierData.operating_status || carrierData.STATUS_CODE || '',
        carrierOperation: carrierData.carrier_operation || carrierData.CARRIER_OPERATION || '',

        // Fleet information
        powerUnits: carrierData.POWER_UNITS || carrierData.power_units || 0,
        totalDrivers: carrierData.TOTAL_DRIVERS || carrierData.total_drivers || 0
    };

    return populatedData;
}

// Helper function
function calculateYearFromDate(dateStr) {
    if (!dateStr) return '';
    const year = dateStr.substring(0, 4);
    if (year && /^\d{4}$/.test(year)) {
        return year;
    }
    return '';
}

// Test the function
const result = processCarrierDataMock('test-lead-123', mockCarrierData);

console.log('✅ Processed data:');
console.log(JSON.stringify(result, null, 2));

console.log('\n🔍 Field Analysis:');
console.log(`Company Name: "${result.companyName}"`);
console.log(`DOT Number: "${result.dotNumber}"`);
console.log(`Phone: "${result.phone}"`);
console.log(`State: "${result.state}"`);
console.log(`Year Established: "${result.yearEstablished}"`);