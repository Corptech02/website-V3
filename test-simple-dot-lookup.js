const sqlite3 = require('sqlite3').verbose();

// Simple test of DB-V3 lookup
const dotNumber = '3342195';
const dbPath = '/var/www/vanguard/DB-V3.db';

console.log(`Testing DOT lookup for ${dotNumber}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening DB-V3:', err);
        return;
    }
    console.log('Connected to DB-V3');
});

const query = `
    SELECT
        DOT_NUMBER,
        LEGAL_NAME,
        DBA_NAME,
        PHY_STREET,
        PHY_CITY,
        PHY_STATE,
        PHY_ZIP,
        PHONE,
        EMAIL_ADDRESS,
        POWER_UNITS,
        TOTAL_DRIVERS,
        ADD_DATE
    FROM carriers
    WHERE DOT_NUMBER = ?
`;

db.get(query, [dotNumber], (err, row) => {
    if (err) {
        console.error('Query error:', err);
    } else if (row) {
        console.log('Found carrier:', row);
    } else {
        console.log('No carrier found');
    }

    db.close();
});