'use strict';

const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = '/var/www/vanguard/vanguard.db';

// ─── NAICS Classification Map ─────────────────────────────────────────────────
// Longest prefix wins. Each entry defines: vertical, sub-vertical, target lines,
// premium band (high/medium/low), and a raw fit score (0-28).
const NAICS_MAP = [
  // Roofing (sub of 2382 — check before parent)
  { prefix: '23816', vertical: 'Contractor',     sub: 'Roofing',                       lines: ['GL','WC','Commercial Auto','Inland Marine','Umbrella'],            premium: 'high',   score: 28 },
  // Specialty Trade Contractors
  { prefix: '2381',  vertical: 'Contractor',     sub: 'Foundation / Structure',         lines: ['GL','WC','Commercial Auto','Inland Marine'],                       premium: 'high',   score: 25 },
  { prefix: '2382',  vertical: 'Contractor',     sub: 'HVAC / Electrical / Plumbing',   lines: ['GL','WC','Commercial Auto','Tools & Equipment','Umbrella'],        premium: 'high',   score: 27 },
  { prefix: '2383',  vertical: 'Contractor',     sub: 'Building Finishing',             lines: ['GL','WC','Commercial Auto','Tools & Equipment'],                   premium: 'medium', score: 22 },
  { prefix: '2389',  vertical: 'Contractor',     sub: 'Other Specialty Trade',          lines: ['GL','WC','Commercial Auto','Umbrella'],                            premium: 'medium', score: 21 },
  // General / Heavy Construction
  { prefix: '2361',  vertical: 'Contractor',     sub: 'Residential Building',           lines: ['GL','WC','Commercial Auto','Builders Risk'],                       premium: 'high',   score: 24 },
  { prefix: '2362',  vertical: 'Contractor',     sub: 'Non-Residential Building',       lines: ['GL','WC','Commercial Auto','Builders Risk','Umbrella'],            premium: 'high',   score: 27 },
  { prefix: '2371',  vertical: 'Contractor',     sub: 'Utility / Pipeline',             lines: ['GL','WC','Commercial Auto','Inland Marine','Umbrella'],            premium: 'high',   score: 28 },
  { prefix: '2372',  vertical: 'Contractor',     sub: 'Land Subdivision',               lines: ['GL','WC','Commercial Auto','Property'],                            premium: 'medium', score: 20 },
  { prefix: '2373',  vertical: 'Contractor',     sub: 'Highway / Street',               lines: ['GL','WC','Commercial Auto','Inland Marine','Umbrella'],            premium: 'high',   score: 27 },
  { prefix: '2379',  vertical: 'Contractor',     sub: 'Other Heavy Construction',       lines: ['GL','WC','Commercial Auto','Inland Marine','Umbrella'],            premium: 'high',   score: 26 },
  // Trucking / Transport
  { prefix: '4841',  vertical: 'Trucking',       sub: 'General Freight',                lines: ['Commercial Auto','Cargo','GL','WC','Umbrella'],                    premium: 'high',   score: 28 },
  { prefix: '4842',  vertical: 'Trucking',       sub: 'Specialized Freight',            lines: ['Commercial Auto','Cargo','GL','WC','Umbrella'],                    premium: 'high',   score: 28 },
  { prefix: '4884',  vertical: 'Transport',      sub: 'Towing',                         lines: ['Commercial Auto','Garage Keepers','GL','Umbrella'],                premium: 'high',   score: 26 },
  { prefix: '4853',  vertical: 'Transport',      sub: 'Taxi / Limo',                    lines: ['Commercial Auto','GL','WC'],                                        premium: 'medium', score: 21 },
  { prefix: '4854',  vertical: 'Transport',      sub: 'School / Transit Bus',           lines: ['Commercial Auto','GL','WC','Umbrella'],                            premium: 'high',   score: 25 },
  { prefix: '4885',  vertical: 'Transport',      sub: 'Freight Arrangement',            lines: ['GL','E&O','Commercial Auto'],                                       premium: 'medium', score: 18 },
  { prefix: '488',   vertical: 'Transport',      sub: 'Support Activities',             lines: ['GL','Commercial Auto'],                                             premium: 'medium', score: 17 },
  // Auto Services
  { prefix: '4411',  vertical: 'Auto Dealer',    sub: 'New Car Dealer',                 lines: ['Garage Liability','Property','WC','Commercial Auto'],              premium: 'high',   score: 25 },
  { prefix: '4412',  vertical: 'Auto Dealer',    sub: 'Used Car Dealer',                lines: ['Garage Liability','Property','WC','Commercial Auto'],              premium: 'medium', score: 22 },
  { prefix: '8111',  vertical: 'Auto Repair',    sub: 'Auto Repair & Maintenance',      lines: ['Garage Liability','Property','WC','Tools & Equipment'],            premium: 'medium', score: 22 },
  // Food Service
  { prefix: '7224',  vertical: 'Restaurant',     sub: 'Bar / Drinking Place',           lines: ['GL','Property','Liquor Liability','WC'],                           premium: 'high',   score: 24 },
  { prefix: '7221',  vertical: 'Restaurant',     sub: 'Full Service',                   lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 20 },
  { prefix: '7222',  vertical: 'Restaurant',     sub: 'Limited Service',                lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 18 },
  { prefix: '7225',  vertical: 'Restaurant',     sub: 'Catering',                       lines: ['BOP','GL','WC'],                                                    premium: 'medium', score: 17 },
  // Manufacturing
  { prefix: '311',   vertical: 'Manufacturing',  sub: 'Food Manufacturing',             lines: ['GL','Property','WC','Commercial Auto','Product Liability'],         premium: 'high',   score: 25 },
  { prefix: '331',   vertical: 'Manufacturing',  sub: 'Primary Metal',                  lines: ['GL','Property','WC','Product Liability','Umbrella'],                premium: 'high',   score: 27 },
  { prefix: '332',   vertical: 'Manufacturing',  sub: 'Fabricated Metal',               lines: ['GL','Property','WC','Product Liability'],                           premium: 'high',   score: 25 },
  { prefix: '333',   vertical: 'Manufacturing',  sub: 'Machinery',                      lines: ['GL','Property','WC','Product Liability','Umbrella'],                premium: 'high',   score: 26 },
  { prefix: '336',   vertical: 'Manufacturing',  sub: 'Transportation Equipment',       lines: ['GL','Property','WC','Product Liability','Umbrella'],                premium: 'high',   score: 27 },
  { prefix: '337',   vertical: 'Manufacturing',  sub: 'Furniture',                      lines: ['GL','Property','WC'],                                               premium: 'medium', score: 20 },
  { prefix: '339',   vertical: 'Manufacturing',  sub: 'Misc Manufacturing',             lines: ['GL','Property','WC','Product Liability'],                           premium: 'medium', score: 21 },
  // Wholesale Distribution
  { prefix: '4231',  vertical: 'Wholesale',      sub: 'Motor Vehicle Parts',            lines: ['GL','Property','WC','Commercial Auto'],                            premium: 'medium', score: 20 },
  { prefix: '4234',  vertical: 'Wholesale',      sub: 'Commercial Equipment',           lines: ['GL','Property','WC','Commercial Auto'],                            premium: 'medium', score: 20 },
  { prefix: '4238',  vertical: 'Wholesale',      sub: 'Industrial Supplies',            lines: ['GL','Property','WC','Commercial Auto'],                            premium: 'medium', score: 19 },
  // Real Estate / Property
  { prefix: '5311',  vertical: 'Real Estate',    sub: 'Lessors / Landlords',            lines: ['Commercial Property','GL','Umbrella'],                             premium: 'medium', score: 20 },
  { prefix: '5313',  vertical: 'Real Estate',    sub: 'Property Management',            lines: ['GL','E&O','Commercial Property'],                                  premium: 'medium', score: 19 },
  // Healthcare / Social
  { prefix: '6216',  vertical: 'Healthcare',     sub: 'Home Health / Visiting Nurse',   lines: ['GL','WC','Professional Liability','Commercial Auto'],              premium: 'high',   score: 25 },
  { prefix: '6231',  vertical: 'Healthcare',     sub: 'Nursing / Long-Term Care',       lines: ['GL','Property','WC','Professional Liability','Umbrella'],          premium: 'high',   score: 26 },
  { prefix: '6241',  vertical: 'Healthcare',     sub: 'Social Services',                lines: ['GL','WC','Professional Liability','Commercial Auto'],              premium: 'high',   score: 23 },
  { prefix: '6211',  vertical: 'Healthcare',     sub: 'Physicians / Medical',           lines: ['BOP','GL','WC','Professional Liability'],                          premium: 'high',   score: 24 },
  { prefix: '6212',  vertical: 'Healthcare',     sub: 'Dental',                         lines: ['BOP','GL','WC','Professional Liability'],                          premium: 'high',   score: 23 },
  // Professional Services
  { prefix: '5413',  vertical: 'Professional',   sub: 'Engineering / Architecture',     lines: ['GL','E&O','WC','Professional Liability'],                         premium: 'high',   score: 23 },
  { prefix: '5416',  vertical: 'Professional',   sub: 'Management Consulting',          lines: ['BOP','GL','E&O'],                                                  premium: 'medium', score: 16 },
  // Field / Service
  { prefix: '5611',  vertical: 'Landscaping',    sub: 'Lawn Care / Landscaping',        lines: ['GL','WC','Commercial Auto','Tools & Equipment'],                  premium: 'medium', score: 21 },
  { prefix: '5617',  vertical: 'Cleaning',       sub: 'Building Cleaning Services',     lines: ['GL','WC','Commercial Auto','Tools & Equipment'],                  premium: 'medium', score: 19 },
  { prefix: '5616',  vertical: 'Security',       sub: 'Security Services',              lines: ['GL','WC','Commercial Auto','Umbrella'],                            premium: 'high',   score: 24 },
  { prefix: '5615',  vertical: 'Staffing',       sub: 'Employment / Staffing',          lines: ['WC','GL','E&O'],                                                   premium: 'medium', score: 18 },
  // Waste / Environmental
  { prefix: '5621',  vertical: 'Waste',          sub: 'Waste Collection',               lines: ['GL','WC','Commercial Auto','Umbrella'],                            premium: 'high',   score: 25 },
  { prefix: '5622',  vertical: 'Waste',          sub: 'Waste Treatment / Disposal',     lines: ['GL','WC','Property','Pollution','Umbrella'],                       premium: 'high',   score: 26 },
  // Retail — small/independent only (boutiques, specialty shops, mom-and-pop)
  { prefix: '4531',  vertical: 'Retail',         sub: 'Florist',                        lines: ['BOP','GL','WC'],                                                    premium: 'low',    score: 12 },
  { prefix: '4532',  vertical: 'Retail',         sub: 'Office Supplies / Gift Shop',    lines: ['BOP','GL','WC'],                                                    premium: 'low',    score: 13 },
  { prefix: '4533',  vertical: 'Retail',         sub: 'Used Merchandise / Thrift',      lines: ['BOP','GL','WC','Property'],                                         premium: 'low',    score: 12 },
  { prefix: '4521',  vertical: 'Retail',         sub: 'Specialty / Boutique Retail',    lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 16 },
  { prefix: '4522',  vertical: 'Retail',         sub: 'Clothing Boutique',              lines: ['BOP','GL','WC'],                                                    premium: 'medium', score: 15 },
  { prefix: '4511',  vertical: 'Retail',         sub: 'Sporting Goods / Hobby Shop',    lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 15 },
  { prefix: '4512',  vertical: 'Retail',         sub: 'Book / Music Store',             lines: ['BOP','GL','WC'],                                                    premium: 'low',    score: 11 },
  { prefix: '4451',  vertical: 'Retail',         sub: 'Grocery / Specialty Food',       lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 16 },
  { prefix: '4461',  vertical: 'Retail',         sub: 'Health / Beauty Supply',         lines: ['BOP','GL','WC'],                                                    premium: 'medium', score: 15 },
  { prefix: '4481',  vertical: 'Retail',         sub: 'Clothing & Accessories',         lines: ['BOP','GL','WC'],                                                    premium: 'medium', score: 15 },
  { prefix: '4441',  vertical: 'Retail',         sub: 'Hardware / Home Improvement',    lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 17 },
  { prefix: '4442',  vertical: 'Retail',         sub: 'Garden Center / Nursery',        lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 16 },
  { prefix: '4471',  vertical: 'Retail',         sub: 'Convenience Store / Gas Station',lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 17 },
  { prefix: '5251',  vertical: 'Retail',         sub: 'Hardware / Farm Supply',         lines: ['BOP','GL','WC','Property'],                                         premium: 'medium', score: 16 },
  // Logistics / Warehousing
  { prefix: '4931',  vertical: 'Logistics',      sub: 'Warehousing & Storage',          lines: ['GL','WC','Property','Commercial Auto','Inland Marine'],              premium: 'high',   score: 24 },
  { prefix: '4922',  vertical: 'Logistics',      sub: 'Courier & Local Delivery',       lines: ['Commercial Auto','GL','WC','Cargo'],                                premium: 'medium', score: 20 },
  { prefix: '4921',  vertical: 'Logistics',      sub: 'Couriers & Messengers',          lines: ['Commercial Auto','GL','WC'],                                        premium: 'medium', score: 19 },
  { prefix: '5611',  vertical: 'Logistics',      sub: 'Third-Party Logistics (3PL)',    lines: ['GL','WC','Cargo','Commercial Auto','Inland Marine','Umbrella'],      premium: 'high',   score: 25 },
  { prefix: '4885',  vertical: 'Logistics',      sub: 'Freight Brokerage',              lines: ['GL','E&O','Commercial Auto','Cargo'],                               premium: 'high',   score: 22 },
  { prefix: '4941',  vertical: 'Logistics',      sub: 'Fulfillment / Distribution Ctr', lines: ['GL','WC','Property','Commercial Auto','Inland Marine'],              premium: 'high',   score: 23 },
  // Hospitality
  { prefix: '7211',  vertical: 'Hospitality',    sub: 'Hotels & Motels',                lines: ['GL','Property','WC','Commercial Auto','Umbrella'],                 premium: 'high',   score: 25 },
  { prefix: '7212',  vertical: 'Hospitality',    sub: 'RV Parks & Campgrounds',         lines: ['GL','Property','WC'],                                              premium: 'medium', score: 17 },
  { prefix: '7213',  vertical: 'Hospitality',    sub: 'Rooming & Boarding Houses',      lines: ['GL','Property','WC'],                                              premium: 'low',    score: 14 },
  { prefix: '7219',  vertical: 'Hospitality',    sub: 'B&B / Inn / Boutique Hotel',     lines: ['BOP','GL','WC','Property'],                                        premium: 'medium', score: 20 },
  { prefix: '7011',  vertical: 'Hospitality',    sub: 'Hotel / Resort',                 lines: ['GL','Property','WC','Commercial Auto','Umbrella'],                 premium: 'high',   score: 26 },
  { prefix: '7999',  vertical: 'Hospitality',    sub: 'Event Venue / Banquet Hall',     lines: ['GL','WC','Property','Liquor Liability'],                           premium: 'high',   score: 23 },
  { prefix: '7941',  vertical: 'Hospitality',    sub: 'Amusement / Recreation Facility',lines: ['GL','WC','Property','Umbrella'],                                   premium: 'high',   score: 22 },
  { prefix: '7991',  vertical: 'Hospitality',    sub: 'Fitness / Sports Club',          lines: ['GL','WC','Property'],                                              premium: 'medium', score: 18 },
  { prefix: '7993',  vertical: 'Hospitality',    sub: 'Spa & Salon',                    lines: ['BOP','GL','WC'],                                                   premium: 'medium', score: 16 },
  // Utilities / Energy
  { prefix: '2211',  vertical: 'Utility',        sub: 'Electric Power Generation',      lines: ['GL','Property','WC','Commercial Auto','Umbrella'],                 premium: 'high',   score: 26 },
  { prefix: '2212',  vertical: 'Utility',        sub: 'Natural Gas Distribution',       lines: ['GL','Property','WC','Commercial Auto','Umbrella'],                 premium: 'high',   score: 25 },
];

// Longest-prefix match
function classifyNAICS(naicsCode) {
  if (!naicsCode) return null;
  const code = String(naicsCode).replace(/\D/g, '');
  for (let len = 6; len >= 2; len--) {
    const prefix = code.substring(0, len);
    const match = NAICS_MAP.find(m => m.prefix === prefix);
    if (match) return match;
  }
  return null;
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────
function scoreLead(lead) {
  const cls = classifyNAICS(lead.naicsCode);

  // Premium potential (0-30)
  let premium = 0;
  if (cls) {
    premium = cls.premium === 'high' ? 25 : cls.premium === 'medium' ? 16 : 8;
    if ((lead.employeeCount || 0) > 25)    premium = Math.min(30, premium + 4);
    if ((lead.violationCount || 0) > 2)    premium = Math.min(30, premium + 2);
    if ((lead.permitValue || 0) > 500000)  premium = Math.min(30, premium + 3);
  }

  // Contactability (0-20)
  let contactability = 0;
  if (lead.phone)             contactability += 9;
  if (lead.email)             contactability += 6;
  if (lead.website)           contactability += 3;
  if (lead.address && lead.city) contactability += 2;

  // Vertical fit vs agency appetite (0-20)
  const targetVerticals = ['Contractor','Trucking','Transport','Manufacturing','Auto Repair','Auto Dealer','Waste','Security','Landscaping'];
  let fit = 0;
  if (cls) {
    fit = Math.round(cls.score * 20 / 28);
    if (targetVerticals.includes(cls.vertical)) fit = Math.min(20, fit + 3);
  }

  // Urgency — how fresh is the signal (0-20)
  const daysOld = lead.daysOld || 999;
  let urgency;
  if      (daysOld <= 14)  urgency = 20;
  else if (daysOld <= 30)  urgency = 16;
  else if (daysOld <= 60)  urgency = 12;
  else if (daysOld <= 90)  urgency = 8;
  else if (daysOld <= 180) urgency = 4;
  else                     urgency = 1;

  // Data quality (0-10)
  const populated = [lead.businessName, lead.address, lead.city, lead.state, lead.zip, lead.naicsCode, (lead.phone || lead.email)].filter(Boolean).length;
  const dataQuality = Math.min(10, populated + ((lead.sourceCount || 1) > 1 ? 2 : 0));

  const total = premium + contactability + fit + urgency + dataQuality;
  const priority = total >= 72 ? 'A' : total >= 56 ? 'B' : total >= 40 ? 'C' : 'D';

  return { total, premium: Math.round(premium), contactability, fit, urgency, dataQuality, priority };
}

// ─── Database helpers ─────────────────────────────────────────────────────────
function getDB() {
  return new sqlite3.Database(DB_PATH);
}

function initTables() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS cl_businesses (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        source         TEXT NOT NULL,
        source_id      TEXT,
        business_name  TEXT,
        address        TEXT,
        city           TEXT,
        state          TEXT,
        zip            TEXT,
        naics_code     TEXT,
        phone          TEXT,
        email          TEXT,
        website        TEXT,
        employee_count INTEGER,
        year_formed    INTEGER,
        vertical       TEXT,
        sub_vertical   TEXT,
        target_lines   TEXT,
        premium_band   TEXT,
        score_total    INTEGER,
        score_priority TEXT,
        days_old       INTEGER,
        pulled_at      INTEGER DEFAULT (strftime('%s','now')),
        UNIQUE(source, source_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS cl_sync_log (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        source    TEXT,
        state     TEXT,
        records   INTEGER,
        status    TEXT,
        message   TEXT,
        synced_at INTEGER DEFAULT (strftime('%s','now'))
      )`, (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// ─── CSV parser (handles quoted fields) ──────────────────────────────────────
function parseCSVLine(line) {
  const vals = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
    else { cur += ch; }
  }
  vals.push(cur);
  return vals.map(v => v.replace(/^"|"$/g, '').trim());
}

function indexOfAny(arr, names) {
  for (const n of names) {
    const i = arr.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

// ─── OSHA CSV Import ──────────────────────────────────────────────────────────
// Parses an OSHA Enforcement inspection CSV and stores classified records.
// Download from: https://enforcedata.dol.gov/views/data_summary.php
// Key columns: activity_nr, estab_name, site_address, site_city, site_state,
//              site_zip, naics_code, open_date
async function importOSHACSV(csvText, stateFilter) {
  await initTables();

  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV is empty or has no data rows');

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));

  const col = (names) => indexOfAny(headers, names);
  const idxId    = col(['activity_nr','activ_nr','inspection_id','id']);
  const idxName  = col(['estab_name','establishment_name','name','business_name']);
  const idxAddr  = col(['site_address','address','street_address','street']);
  const idxCity  = col(['site_city','city']);
  const idxState = col(['site_state','state']);
  const idxZip   = col(['site_zip','zip','zip_code','postal_code']);
  const idxNaics = col(['naics_code','naics','primary_naics_code','sic_code']);
  const idxDate  = col(['open_date','insp_date','inspection_date','date_opened']);
  const idxEmp   = col(['total_empl','nr_in_estab','employees','employee_count']);

  let imported = 0;
  let skipped = 0;

  // Parse all rows first (CPU only, no DB lock held)
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;
      const state = idxState >= 0 ? (cols[idxState] || '').toUpperCase().trim() : '';
      if (stateFilter && state && state !== stateFilter.toUpperCase()) { skipped++; continue; }
      const rawNaics = idxNaics >= 0 ? (cols[idxNaics] || '') : '';
      const naicsCode = rawNaics.replace(/\D/g, '').substring(0, 6);
      const cls = classifyNAICS(naicsCode);
      if (!cls) { skipped++; continue; }
      const businessName = idxName >= 0 ? (cols[idxName] || '').trim() : '';
      if (!businessName) { skipped++; continue; }
      const dateStr = idxDate >= 0 ? cols[idxDate] : '';
      let daysOld = 365;
      if (dateStr) { const d = new Date(dateStr); if (!isNaN(d.getTime())) daysOld = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); }
      const empCount = idxEmp >= 0 ? parseInt(cols[idxEmp]) || 0 : 0;
      const lead = { businessName, address: idxAddr >= 0 ? cols[idxAddr] || '' : '',
        city: idxCity >= 0 ? cols[idxCity] || '' : '', state,
        zip: idxZip >= 0 ? cols[idxZip] || '' : '', naicsCode,
        employeeCount: empCount, daysOld, sourceCount: 1, phone: '', email: '', website: '' };
      const scores = scoreLead(lead);
      rows.push({ sourceId: idxId >= 0 && cols[idxId] ? cols[idxId] : `osha-${i}`,
        businessName, address: lead.address, city: lead.city, state, zip: lead.zip,
        naicsCode, empCount, cls, scores, daysOld });
    } catch { skipped++; }
  }

  // Insert in batches of 2000 rows — each batch gets its own connection + transaction
  // so the write lock is released between batches and the app stays responsive
  const BATCH = 2000;
  const SQL = `INSERT OR REPLACE INTO cl_businesses
    (source, source_id, business_name, address, city, state, zip, naics_code,
     employee_count, vertical, sub_vertical, target_lines, premium_band,
     score_total, score_priority, days_old, pulled_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,strftime('%s','now'))`;

  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    await new Promise((resolve, reject) => {
      const db = getDB();
      db.run('PRAGMA journal_mode=WAL', () => {
        db.run('PRAGMA busy_timeout=15000', () => {
          db.run('BEGIN', (err) => {
            if (err) { db.close(); return reject(err); }
            const stmt = db.prepare(SQL);
            for (const r of batch) {
              stmt.run('osha', r.sourceId, r.businessName, r.address, r.city, r.state,
                r.zip, r.naicsCode, r.empCount, r.cls.vertical, r.cls.sub,
                JSON.stringify(r.cls.lines), r.cls.premium,
                r.scores.total, r.scores.priority, r.daysOld);
            }
            stmt.finalize((finalErr) => {
              if (finalErr) { db.run('ROLLBACK', () => { db.close(); reject(finalErr); }); return; }
              db.run('COMMIT', (commitErr) => { db.close(); if (commitErr) reject(commitErr); else resolve(); });
            });
          });
        });
      });
    });
    imported += batch.length;
  }

  // Log the sync
  await new Promise((resolve) => {
    const logDb = getDB();
    logDb.run(
      `INSERT INTO cl_sync_log (source, state, records, status, message) VALUES (?,?,?,?,?)`,
      ['osha', stateFilter || 'ALL', imported, 'success',
       `Imported ${imported} records, skipped ${skipped} (unclassified or filtered)`],
      () => { logDb.close(); resolve(); }
    );
  });

  return { imported, skipped, total: imported + skipped };
}

// ─── DOL / OSHA API Sync ──────────────────────────────────────────────────────
// Uses the DOL public API (free key at data.dol.gov/registration)
// Endpoint: https://apiprod.dol.gov/v4/get/OSHA/inspection/json
// Docs:     https://apiprod.dol.gov/v4/dataset_documentation/10313
//
// Pulls OSHA inspection records filtered by state + date range, classifies them
// by NAICS, scores them, and upserts into cl_businesses.
// Handles pagination automatically (1000 records per page).
async function syncOSHAFromAPI(options) {
  const {
    apiKey,
    states = [],           // e.g. ['OH','PA'] — empty = all states
    daysBack = 365,        // how far back to pull inspections
    maxRecords = 50000,    // safety ceiling
    naicsPrefixes = [],    // if set, only pull these NAICS prefixes
    onProgress = null,     // optional callback(msg) for live progress updates
  } = options;

  const key = apiKey || process.env.DOL_API_KEY || '';
  if (!key) throw new Error('DOL API key required. Get a free key at data.dol.gov/registration and set DOL_API_KEY in your .env');

  await initTables();

  // Helper: open a fresh connection, enable WAL, run one page of inserts in a transaction, close
  const insertPage = (records) => new Promise((resolve, reject) => {
    const db = getDB();
    db.run('PRAGMA journal_mode=WAL', () => {
      db.run('PRAGMA busy_timeout=10000', () => {
        db.run('BEGIN', (beginErr) => {
          if (beginErr) { db.close(); return reject(beginErr); }
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO cl_businesses
              (source, source_id, business_name, address, city, state, zip, naics_code,
               employee_count, vertical, sub_vertical, target_lines, premium_band,
               score_total, score_priority, days_old, pulled_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,strftime('%s','now'))
          `);
          let imported = 0, skipped = 0;
          for (const row of records) {
            if (upsertRecord(stmt, row)) imported++;
            else skipped++;
          }
          stmt.finalize((finalErr) => {
            if (finalErr) {
              db.run('ROLLBACK', () => { db.close(); reject(finalErr); });
              return;
            }
            db.run('COMMIT', (commitErr) => {
              db.close();
              if (commitErr) reject(commitErr);
              else resolve({ imported, skipped });
            });
          });
        });
      });
    });
  });

  const cutoffDate = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];
  const BASE_URL = 'https://apiprod.dol.gov/v4/get/OSHA/inspection/json';
  const PAGE_SIZE = 1000;

  let totalImported = 0;
  let totalSkipped = 0;
  let page = 0;
  let hasMore = true;
  const progressLog = [];

  // Build filter — DOL API format: single {field,operator,value} or {and:[...]} for multiple
  const buildFilter = (stateFilter) => {
    const conditions = [
      { field: 'open_date', operator: 'gte', value: cutoffDate },
    ];
    if (stateFilter) conditions.push({ field: 'site_state', operator: 'eq', value: stateFilter.toUpperCase() });
    return JSON.stringify(conditions.length === 1 ? conditions[0] : { and: conditions });
  };

  const upsertRecord = (stmt, row) => {
    const naicsCode = (row.naics_code || '').replace(/\D/g, '').substring(0, 6);
    const cls = classifyNAICS(naicsCode);
    if (!cls) return false;

    const businessName = (row.estab_name || '').trim();
    if (!businessName) return false;

    const state = (row.site_state || '').toUpperCase().trim();

    let daysOld = 365;
    if (row.open_date) {
      const d = new Date(row.open_date);
      if (!isNaN(d.getTime())) daysOld = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
    }

    const empCount = parseInt(row.nr_in_estab || row.total_empl) || 0;
    const lead = {
      businessName, address: row.site_address || '', city: row.site_city || '',
      state, zip: row.site_zip || '', naicsCode, employeeCount: empCount,
      daysOld, sourceCount: 1, phone: '', email: '', website: '',
    };
    const scores = scoreLead(lead);

    stmt.run(
      'osha', String(row.activity_nr || `api-${Date.now()}`),
      businessName, lead.address, lead.city, state, lead.zip, naicsCode, empCount,
      cls.vertical, cls.sub, JSON.stringify(cls.lines), cls.premium,
      scores.total, scores.priority, daysOld
    );
    return true;
  };

  // If specific states requested, query each separately for better filtering
  const stateList = states.length > 0 ? states : [null]; // null = no state filter

  for (const stateFilter of stateList) {
    page = 0;
    hasMore = true;

    while (hasMore && totalImported < maxRecords) {
      const params = new URLSearchParams({
        'X-API-KEY': key,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort_by: 'open_date',
        sort: 'DESC',
        filter_object: buildFilter(stateFilter),
      });

      let data;
      try {
        // Retry once on 429 (rate limit) with a 5-second back-off
        let res;
        for (let attempt = 0; attempt < 2; attempt++) {
          res = await fetch(`${BASE_URL}?${params}`, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'VanguardInsuranceCRM/1.0' },
            timeout: 30000,
          });
          if (res.status === 429 && attempt === 0) {
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
          break;
        }

        if (res.status === 401) throw new Error('Invalid DOL API key — check your .env DOL_API_KEY value');
        if (res.status === 429) throw new Error('DOL API rate limit — try again in a minute');
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`DOL API HTTP ${res.status}: ${body.substring(0, 100)}`);
        }

        data = await res.json();
      } catch (fetchErr) {
        const errMsg = `Page ${page} error: ${fetchErr.message}`;
        progressLog.push(errMsg);
        if (onProgress) onProgress({ type: 'error', message: errMsg, imported: totalImported, skipped: totalSkipped });
        break;
      }

      // DOL API wraps results in { data: [...] }
      const records = data.data || (Array.isArray(data) ? data : []);

      if (!records.length) { hasMore = false; break; }

      // Batch upsert — fresh connection per page so we release write locks between pages
      const { imported: pageImported, skipped: pageSkipped } = await insertPage(records);

      totalImported += pageImported;
      totalSkipped  += pageSkipped;
      const pageMsg = `${stateFilter || 'ALL'} page ${page + 1}: +${pageImported} records (${pageSkipped} skipped)`;
      progressLog.push(pageMsg);
      if (onProgress) onProgress({ type: 'progress', message: pageMsg, imported: totalImported, skipped: totalSkipped });

      if (records.length < PAGE_SIZE) { hasMore = false; } // last page
      page++;

      // Small delay between pages to be respectful of the API
      if (hasMore) await new Promise(r => setTimeout(r, 200));
    }
  }

  // Log the sync
  const message = `API sync: ${totalImported} imported, ${totalSkipped} skipped. States: ${states.join(',') || 'ALL'}. Days back: ${daysBack}.`;
  await new Promise((resolve) => {
    const logDb = getDB();
    logDb.run(
      `INSERT INTO cl_sync_log (source, state, records, status, message) VALUES (?,?,?,?,?)`,
      ['osha-api', states.join(',') || 'ALL', totalImported, 'success', message],
      () => { logDb.close(); resolve(); }
    );
  });

  return { imported: totalImported, skipped: totalSkipped, pages: page, log: progressLog, message };
}

// ─── OpenCorporates Connector ─────────────────────────────────────────────────
// Free SOS data aggregator — no API key required for basic use (~200 req/day)
// Docs: https://api.opencorporates.com/documentation/API-Reference
const OC_JURISDICTION_MAP = {
  'AL':'us_al','AK':'us_ak','AZ':'us_az','AR':'us_ar','CA':'us_ca','CO':'us_co',
  'CT':'us_ct','DE':'us_de','FL':'us_fl','GA':'us_ga','HI':'us_hi','ID':'us_id',
  'IL':'us_il','IN':'us_in','IA':'us_ia','KS':'us_ks','KY':'us_ky','LA':'us_la',
  'ME':'us_me','MD':'us_md','MA':'us_ma','MI':'us_mi','MN':'us_mn','MS':'us_ms',
  'MO':'us_mo','MT':'us_mt','NE':'us_ne','NV':'us_nv','NH':'us_nh','NJ':'us_nj',
  'NM':'us_nm','NY':'us_ny','NC':'us_nc','ND':'us_nd','OH':'us_oh','OK':'us_ok',
  'OR':'us_or','PA':'us_pa','RI':'us_ri','SC':'us_sc','SD':'us_sd','TN':'us_tn',
  'TX':'us_tx','UT':'us_ut','VT':'us_vt','VA':'us_va','WA':'us_wa','WV':'us_wv',
  'WI':'us_wi','WY':'us_wy',
};

async function fetchOpenCorporates(criteria) {
  const { state, daysBack = 90, maxResults = 100, industry, apiToken } = criteria;
  const jurisdiction = state ? OC_JURISDICTION_MAP[state.toUpperCase()] : null;
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    current_status: 'Active',
    inactive: 'false',
    created_after: cutoff,
    per_page: Math.min(maxResults, 100),
    page: 1,
  });
  if (jurisdiction) params.set('jurisdiction_code', jurisdiction);
  if (industry) params.set('q', industry);
  // Free API key — get one at https://opencorporates.com/api_accounts/new
  const token = apiToken || process.env.OPENCORPORATES_API_TOKEN || '';
  if (token) params.set('api_token', token);

  const url = `https://api.opencorporates.com/v0.4/companies/search?${params}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'VanguardInsuranceCRM/1.0' },
    timeout: 20000,
  });
  if (res.status === 401) throw new Error('OpenCorporates API token required — get a free key at opencorporates.com/api_accounts/new and set OPENCORPORATES_API_TOKEN in your .env');
  if (!res.ok) throw new Error(`OpenCorporates returned HTTP ${res.status}`);

  const data = await res.json();
  const companies = (data.results && data.results.companies) || [];

  return companies.map(c => {
    const co = c.company;
    const addr = co.registered_address || {};
    const incorporated = co.incorporation_date ? new Date(co.incorporation_date) : null;
    const daysOld = incorporated ? Math.max(0, Math.floor((Date.now() - incorporated.getTime()) / 86400000)) : 999;
    const yearFormed = incorporated ? incorporated.getFullYear() : null;

    const lead = {
      source: 'opencorporates',
      sourceId: `oc-${co.company_number || co.id}`,
      businessName: (co.name || '').toUpperCase().trim(),
      address: addr.street_address || '',
      city: addr.locality || '',
      state: addr.region || (state || ''),
      zip: addr.postal_code || '',
      naicsCode: null,
      phone: '',
      email: '',
      website: '',
      employeeCount: 0,
      yearFormed,
      daysOld,
      sourceCount: 1,
    };
    const cls = classifyNAICS(lead.naicsCode);
    const scores = scoreLead(lead);

    return {
      ...lead,
      vertical: cls ? cls.vertical : 'New Business',
      subVertical: cls ? cls.sub : co.company_type || 'LLC / Corp',
      targetLines: cls ? cls.lines : ['BOP','GL','WC'],
      premiumBand: cls ? cls.premium : 'medium',
      ...scores,
    };
  });
}

// ─── Google Places Connector ──────────────────────────────────────────────────
// Cache-first: results are stored in cl_businesses (source='google_places') so
// the same lead is never purchased from Google twice. On each run we:
//   1. Pull matching cached leads from DB (free)
//   2. Only call Google API for the difference (paid), querying by city for broad coverage
//   3. Store new results before returning

// Major cities per state — searched individually so we get 60 results per city
// instead of 60 total for the whole state.
const GP_STATE_CITIES = {
  AL:['Birmingham','Montgomery','Huntsville','Mobile','Tuscaloosa'],
  AK:['Anchorage','Fairbanks','Juneau'],
  AZ:['Phoenix','Tucson','Mesa','Chandler','Scottsdale','Tempe','Gilbert','Glendale'],
  AR:['Little Rock','Fort Smith','Fayetteville','Springdale','Jonesboro'],
  CA:['Los Angeles','San Diego','San Jose','San Francisco','Fresno','Sacramento','Long Beach','Oakland','Bakersfield','Anaheim','Santa Ana','Riverside','Stockton','Irvine','Chula Vista'],
  CO:['Denver','Colorado Springs','Aurora','Fort Collins','Lakewood','Thornton','Pueblo','Westminster'],
  CT:['Bridgeport','New Haven','Hartford','Stamford','Waterbury','Norwalk'],
  DE:['Wilmington','Dover','Newark'],
  FL:['Jacksonville','Miami','Tampa','Orlando','St. Petersburg','Hialeah','Tallahassee','Fort Lauderdale','Port St. Lucie','Pembroke Pines','Cape Coral','Hollywood','Gainesville','Miramar'],
  GA:['Atlanta','Augusta','Columbus','Macon','Savannah','Athens','Sandy Springs','Roswell','Albany','Johns Creek'],
  HI:['Honolulu','Pearl City','Hilo','Kailua'],
  ID:['Boise','Nampa','Meridian','Idaho Falls','Pocatello'],
  IL:['Chicago','Aurora','Rockford','Joliet','Naperville','Springfield','Peoria','Elgin','Waukegan','Champaign','Bloomington'],
  IN:['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel','Fishers','Hammond','Gary','Muncie','Lafayette'],
  IA:['Des Moines','Cedar Rapids','Davenport','Sioux City','Iowa City','Waterloo','Dubuque'],
  KS:['Wichita','Overland Park','Kansas City','Olathe','Topeka','Lawrence'],
  KY:['Louisville','Lexington','Bowling Green','Owensboro','Covington','Hopkinsville'],
  LA:['New Orleans','Baton Rouge','Shreveport','Metairie','Lafayette','Lake Charles','Kenner'],
  ME:['Portland','Lewiston','Bangor','South Portland'],
  MD:['Baltimore','Frederick','Rockville','Gaithersburg','Bowie','Hagerstown','Annapolis'],
  MA:['Boston','Worcester','Springfield','Lowell','Cambridge','New Bedford','Brockton','Quincy','Lynn'],
  MI:['Detroit','Grand Rapids','Warren','Sterling Heights','Lansing','Ann Arbor','Flint','Dearborn','Livonia','Westland','Kalamazoo','Southfield'],
  MN:['Minneapolis','Saint Paul','Rochester','Duluth','Bloomington','Brooklyn Park','Plymouth','Saint Cloud','Eagan'],
  MS:['Jackson','Gulfport','Southaven','Hattiesburg','Biloxi','Meridian'],
  MO:['Kansas City','Saint Louis','Springfield','Columbia','Independence','Lee\'s Summit','O\'Fallon','St. Joseph'],
  MT:['Billings','Missoula','Great Falls','Bozeman','Butte'],
  NE:['Omaha','Lincoln','Bellevue','Grand Island','Kearney'],
  NV:['Las Vegas','Henderson','Reno','North Las Vegas','Sparks','Carson City'],
  NH:['Manchester','Nashua','Concord','Derry','Dover'],
  NJ:['Newark','Jersey City','Paterson','Elizabeth','Trenton','Camden','Clifton','Toms River','Passaic'],
  NM:['Albuquerque','Las Cruces','Rio Rancho','Santa Fe','Roswell'],
  NY:['New York City','Buffalo','Rochester','Yonkers','Syracuse','Albany','New Rochelle','Mount Vernon','Schenectady','Utica','White Plains'],
  NC:['Charlotte','Raleigh','Greensboro','Durham','Winston-Salem','Fayetteville','Cary','Wilmington','High Point','Asheville','Concord'],
  ND:['Fargo','Bismarck','Grand Forks','Minot'],
  OH:['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton','Parma','Canton','Youngstown','Lorain','Hamilton','Springfield','Kettering','Elyria','Lakewood','Cuyahoga Falls','Middletown','Mentor','Mansfield','Beavercreek'],
  OK:['Oklahoma City','Tulsa','Norman','Broken Arrow','Lawton','Edmond','Moore','Midwest City'],
  OR:['Portland','Salem','Eugene','Gresham','Hillsboro','Beaverton','Bend','Medford','Corvallis'],
  PA:['Philadelphia','Pittsburgh','Allentown','Erie','Reading','Scranton','Bethlehem','Lancaster','Harrisburg','Altoona','York'],
  RI:['Providence','Cranston','Warwick','Pawtucket','East Providence'],
  SC:['Columbia','Charleston','North Charleston','Mount Pleasant','Rock Hill','Greenville','Summerville'],
  SD:['Sioux Falls','Rapid City','Aberdeen','Brookings'],
  TN:['Nashville','Memphis','Knoxville','Chattanooga','Clarksville','Murfreesboro','Franklin','Jackson'],
  TX:['Houston','San Antonio','Dallas','Austin','Fort Worth','El Paso','Arlington','Corpus Christi','Plano','Laredo','Lubbock','Irving','Garland','Frisco','Amarillo','Grand Prairie','McKinney','Midland','Killeen','Waco'],
  UT:['Salt Lake City','West Valley City','Provo','West Jordan','Orem','Sandy','St. George','Ogden','Layton'],
  VT:['Burlington','South Burlington','Rutland','Barre'],
  VA:['Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Alexandria','Hampton','Roanoke','Portsmouth','Suffolk'],
  WA:['Seattle','Spokane','Tacoma','Vancouver','Bellevue','Kent','Everett','Renton','Yakima','Federal Way','Kirkland','Bellingham'],
  WV:['Charleston','Huntington','Morgantown','Parkersburg','Wheeling'],
  WI:['Milwaukee','Madison','Green Bay','Kenosha','Racine','Appleton','Waukesha','Oshkosh','Eau Claire','Janesville'],
  WY:['Cheyenne','Casper','Laramie','Gillette'],
};

// Query variants per vertical — run each per city so we get 60 × variants × cities
// instead of 60 total. All deduplicated by Google Place ID.
const GP_QUERY_VARIANTS = {
  'Auto Dealer': [
    'auto dealer','used car dealer','new car dealership','car lot','auto sales',
    'car dealership','pre-owned vehicles','automotive dealer','buy here pay here',
    'car sales','vehicle dealer','certified pre-owned dealer','luxury car dealer',
  ],
  'Auto Repair': [
    'auto repair shop','mechanic shop','car repair','automotive repair',
    'auto body shop','collision repair','tire shop','oil change service',
    'transmission repair','brake repair','engine repair','auto maintenance',
    'auto service center','car tune up','wheel alignment',
  ],
  'Contractor': [
    'general contractor','construction company','building contractor',
    'remodeling contractor','commercial contractor','home builder',
    'renovation contractor','construction firm','masonry contractor',
    'concrete contractor','framing contractor','drywall contractor',
  ],
  'Roofing': [
    'roofing company','roofing contractor','roof repair','roofer',
    'roof installation','roof replacement','commercial roofing',
    'residential roofing','flat roof repair','metal roofing',
  ],
  'HVAC': [
    'hvac company','air conditioning repair','heating and cooling',
    'hvac contractor','ac repair','furnace repair','air conditioning installation',
    'heat pump repair','ductwork company','hvac service','boiler repair',
    'commercial hvac','refrigeration repair',
  ],
  'Plumbing': [
    'plumbing company','plumber','plumbing contractor','plumbing repair',
    'drain cleaning','pipe repair','water heater repair','sewer repair',
    'commercial plumbing','emergency plumber','gas line plumber',
  ],
  'Electrical': [
    'electrician','electrical contractor','electrical company','electrical repair',
    'commercial electrician','residential electrician','electrical panel upgrade',
    'wiring company','generator installation','lighting contractor',
  ],
  'Trucking': [
    'trucking company','freight carrier','commercial trucking','semi truck company',
    'flatbed trucking','refrigerated trucking','ltl carrier','ftl carrier',
    'long haul trucking','local trucking','tanker trucking','dump truck company',
    'owner operator trucking','freight company',
  ],
  'Transport': [
    'transportation company','towing company','logistics company',
    'limo service','taxi cab','medical transport','non-emergency medical transport',
    'freight brokerage','courier service','delivery company',
    'charter bus company','shuttle service','moving company',
  ],
  'Restaurant': [
    'restaurant','bar and grill','food service','diner','cafe',
    'catering company','fast food restaurant','pizza restaurant',
    'mexican restaurant','chinese restaurant','italian restaurant',
    'seafood restaurant','steakhouse','breakfast restaurant','food truck',
    'sports bar','nightclub','brewery','winery',
  ],
  'Manufacturing': [
    'manufacturing company','factory','industrial manufacturer',
    'fabrication shop','metal fabrication','machine shop',
    'plastic manufacturer','wood manufacturer','food manufacturer',
    'assembly plant','custom manufacturer','contract manufacturer',
    'stamping company','welding shop','cnc shop',
  ],
  'Healthcare': [
    'medical clinic','dental office','urgent care center','nursing home',
    'home health agency','chiropractor','physical therapy','optometrist',
    'pediatric clinic','family practice','assisted living facility',
    'adult day care','behavioral health clinic','dialysis center',
    'ambulatory surgery center','mental health clinic',
  ],
  'Cleaning': [
    'cleaning service','janitorial service','maid service','commercial cleaning',
    'office cleaning','carpet cleaning','window cleaning','pressure washing',
    'post construction cleaning','move out cleaning','industrial cleaning',
    'floor cleaning service','disinfection service',
  ],
  'Landscaping': [
    'landscaping company','lawn care service','landscape contractor',
    'lawn mowing service','tree service','tree removal','snow removal',
    'irrigation company','garden center','lawn maintenance',
    'commercial landscaping','sod installation','mulching service',
  ],
  'Security': [
    'security company','security guard service','private security firm',
    'armed security','unarmed security guard','event security',
    'commercial security','loss prevention','patrol service',
    'alarm monitoring company','security consulting',
  ],
  'Waste': [
    'waste management company','trash removal service','recycling company',
    'junk removal','dumpster rental','roll off dumpster','hazardous waste disposal',
    'construction debris removal','portable toilet rental','septic company',
    'grease trap service','environmental services',
  ],
  'Wholesale': [
    'wholesale distributor','wholesale company','distribution center',
    'wholesale supplier','industrial distributor','food distributor',
    'medical supply distributor','janitorial supply distributor',
    'building materials supplier','wholesale warehouse',
  ],
  'Real Estate': [
    'property management company','apartment complex','commercial property management',
    'real estate investment company','hoa management','condo association',
    'storage facility','self storage','mobile home park','office park',
  ],
  'Professional': [
    'engineering firm','architecture firm','civil engineering','structural engineering',
    'management consulting firm','it consulting','accounting firm','cpa firm',
    'law firm','staffing agency','hr consulting',
  ],
  'Staffing': [
    'staffing agency','temp agency','employment agency','workforce solutions',
    'labor staffing','industrial staffing','healthcare staffing','it staffing',
  ],
  'Retail': [
    'boutique clothing store','gift shop','specialty shop','small retail shop',
    'candy store','toy store','pet supply store','hobby shop','craft store',
    'antique shop','vintage shop','consignment shop','thrift store',
    'florist shop','flower shop','jewelry boutique','shoe boutique',
    'lingerie boutique','children clothing store','baby boutique',
    'natural food store','organic grocery','specialty grocery','deli market',
    'butcher shop','fish market','wine shop','liquor store',
    'independent hardware store','garden center','nursery',
    'beauty supply store','salon supply','health food store',
    'smoke shop','vape shop','sporting goods store','bike shop',
    'music store','book store','comic book store','art supply store',
    'kitchen store','home decor boutique','furniture boutique',
    'convenience store','corner store','neighborhood grocery',
  ],
  'Logistics': [
    'warehousing company','warehouse facility','storage warehouse','cold storage warehouse',
    'distribution center','fulfillment center','3pl company','third party logistics',
    'freight forwarder','freight broker','logistics company','supply chain company',
    'courier service','local delivery company','last mile delivery',
    'freight management','cargo handling','order fulfillment',
    'cross dock facility','pick and pack warehouse','public warehouse',
    'bonded warehouse','refrigerated warehouse','dry storage warehouse',
  ],
  'Hospitality': [
    'hotel','motel','inn','bed and breakfast','boutique hotel','extended stay hotel',
    'resort','lodge','guest house','suites hotel','airport hotel',
    'event venue','banquet hall','wedding venue','conference center','reception hall',
    'country club','golf club','social club',
    'spa','day spa','massage spa','wellness spa','nail spa',
    'fitness center','gym','health club','yoga studio','pilates studio',
    'amusement park','recreation center','entertainment venue','bowling alley',
    'rv park','campground','vacation rental management',
  ],
  'Utility': [
    'electric company','gas company','utility contractor','power company',
    'solar company','solar installer','wind energy company',
  ],
};

function getGPQueryVariants(industry, normalizedVertical) {
  // Try normalized vertical first, then industry keyword match
  const variants = GP_QUERY_VARIANTS[normalizedVertical]
    || GP_QUERY_VARIANTS[industry]
    || null;
  if (variants) return variants;
  // Fallback: use the raw industry keyword as the only variant
  return [industry || 'business'];
}

function normalizeGPVertical(industry) {
  if (!industry) return 'Business';
  const kw = industry.toLowerCase();
  const map = [
    [['auto dealer','car dealer','dealership','car lot','car sales','pre-owned','buy here pay here','automotive dealer'], 'Auto Dealer'],
    [['auto repair','mechanic','body shop','auto body','collision repair','tire shop','oil change','transmission','brake repair'], 'Auto Repair'],
    [['roofing','roofer','roof repair','roof install'],            'Roofing'],
    [['hvac','air condition','heating and cool','furnace','ac repair','heat pump','ductwork'], 'HVAC'],
    [['plumb','drain clean','water heater','sewer repair'],        'Plumbing'],
    [['electric','electrician','wiring','generator install'],      'Electrical'],
    [['contractor','construction','building contractor','remodel','builder','masonry','concrete','framing','drywall'], 'Contractor'],
    [['trucking','truckers','freight carrier','flatbed','ltl','ftl','tanker truck','dump truck','long haul'], 'Trucking'],
    [['transport','towing','limo','taxi','medical transport','charter bus','shuttle','moving'], 'Transport'],
    [['logistics','warehousing','warehouse','fulfillment','distribution center','3pl','third party logistics','freight forwarder','freight broker','cargo handling','supply chain','cross dock','order fulfillment','courier service','local delivery'], 'Logistics'],
    [['restaurant','food service','bar ','catering','dining','pizza','diner','cafe','brewery','winery','steakhouse','food truck'], 'Restaurant'],
    [['manufactur','factory','industrial','fabricat','machine shop','stamping','welding','cnc'], 'Manufacturing'],
    [['healthcare','medical','clinic','dental','nursing','home health','chiropract','physical therapy','optom','assisted living','dialysis'], 'Healthcare'],
    [['cleaning','janitorial','maid','carpet clean','window clean','pressure wash','disinfect'], 'Cleaning'],
    [['landscap','lawn','tree service','snow removal','irrigation','sod','mulch'], 'Landscaping'],
    [['security guard','security service','armed security','patrol service','loss prevention','alarm monitor'], 'Security'],
    [['staffing','temp agency','employment agency','workforce','labor staffing'], 'Staffing'],
    [['waste','recycling','disposal','trash','junk removal','dumpster','septic','grease trap'], 'Waste'],
    [['wholesale','distributor','distribution','supply warehouse'],  'Wholesale'],
    [['real estate','property manag','landlord','apartment complex','hoa','storage facility','self storage','mobile home park'], 'Real Estate'],
    [['engineer','architect','consulting','accounting','cpa','law firm'], 'Professional'],
    [['retail','boutique','gift shop','specialty shop','thrift','antique shop','florist shop','toy store','hobby shop','craft store','pet supply','candy store','deli market','butcher shop','fish market','wine shop','jewelry boutique','consignment','vintage shop','corner store','convenience store','garden center','nursery','home decor'], 'Retail'],
    [['hotel','motel','inn','bed and breakfast','boutique hotel','resort','lodge','guest house','event venue','banquet hall','wedding venue','conference center','country club','golf club','spa','day spa','fitness center','gym','health club','yoga studio','pilates studio','amusement park','recreation center','bowling alley','rv park','campground','hospitality'], 'Hospitality'],
    [['electric company','gas company','utility','solar','wind energy'], 'Utility'],
  ];
  for (const [keys, v] of map) {
    if (keys.some(k => kw.includes(k))) return v;
  }
  return industry;
}

function gpRowToLead(r) {
  return {
    source: r.source, sourceId: r.source_id, businessName: r.business_name,
    address: r.address, city: r.city, state: r.state, zip: r.zip,
    naicsCode: r.naics_code, phone: r.phone || '', email: r.email || '',
    website: r.website || '', employeeCount: r.employee_count || 0,
    yearFormed: r.year_formed, vertical: r.vertical, subVertical: r.sub_vertical,
    targetLines: r.target_lines ? JSON.parse(r.target_lines) : [],
    premiumBand: r.premium_band, total: r.score_total, priority: r.score_priority,
    daysOld: r.days_old, pulledAt: r.pulled_at,
  };
}

// Scrape a website homepage for the first email address found (3s timeout)
async function scrapeEmailFromSite(url) {
  if (!url) return null;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VanguardCRM/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const mailto = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailto) return mailto[1].toLowerCase();
    const matches = (html.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g) || []);
    const filtered = matches.filter(e =>
      !e.match(/\.(png|jpg|gif|svg|css|js|woff|ttf)$/i) &&
      !e.includes('sentry') && !e.includes('example') &&
      !e.includes('noreply') && !e.includes('no-reply')
    );
    return filtered.length ? filtered[0].toLowerCase() : null;
  } catch (_) { return null; }
}

async function fetchGooglePlaces(criteria) {
  const { state, industry, maxResults = 40 } = criteria;
  const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!PLACES_KEY) throw new Error('GOOGLE_PLACES_API_KEY not set in .env');

  const normalizedVertical = normalizeGPVertical(industry);

  // ── 1. Pull cached leads from DB ──────────────────────────────────────────
  const cached = await new Promise((resolve) => {
    const db = getDB();
    let q = `SELECT * FROM cl_businesses WHERE source='google_places'`;
    const p = [];
    if (state) { q += ` AND state=?`; p.push(state.toUpperCase()); }
    q += ` AND (vertical=? OR vertical=?)`;
    p.push(normalizedVertical, industry || '');
    q += ` ORDER BY score_total DESC LIMIT ?`;
    p.push(maxResults);
    db.all(q, p, (err, rows) => { db.close(); resolve(err ? [] : rows.map(gpRowToLead)); });
  });

  if (cached.length >= maxResults) return cached;

  const needed = maxResults - cached.length;
  const cachedIds = new Set(cached.map(c => c.sourceId));

  // ── 2. Build query list — variants × cities ───────────────────────────────
  // Google caps at 60 results per text-search query (3 pages × 20).
  // By crossing keyword variants with cities we get 60 × variants × cities.
  const stUp = state ? state.toUpperCase() : null;
  const cities = stUp && GP_STATE_CITIES[stUp] ? GP_STATE_CITIES[stUp] : null;
  const variants = getGPQueryVariants(industry, normalizedVertical);

  // Build: for each city, iterate all variants before moving to next city
  // so we saturate each city before spending quota on others.
  // Cap at 150 queries per run (~9,000 results max) to prevent timeouts.
  const MAX_QUERIES = 150;
  const allQueries = cities
    ? cities.flatMap(city => variants.map(v => `${v} in ${city} ${stUp}`))
    : variants.map(v => [v, stUp ? `in ${stUp}` : ''].filter(Boolean).join(' '));
  const queries = allQueries.slice(0, MAX_QUERIES);

  const cls    = NAICS_MAP.find(n => n.vertical === normalizedVertical);
  const tLines = cls ? cls.lines : ['GL', 'WC', 'BOP', 'Commercial Auto'];
  const pBand  = cls ? cls.premium : 'medium';

  const newLeads = [];
  const perPage = 20;

  outer:
  for (const queryText of queries) {
    if (newLeads.length >= needed) break;
    let pageToken = null;
    const pages = Math.min(Math.ceil((needed - newLeads.length) / perPage), 3);

    for (let p = 0; p < pages; p++) {
      const body = { textQuery: queryText, maxResultCount: perPage };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.formattedAddress,places.addressComponents,nextPageToken',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Google Places HTTP ${res.status}: ${txt.slice(0, 120)}`);
      }
      const data = await res.json();
      pageToken = data.nextPageToken || null;

      for (const pl of (data.places || [])) {
        const sourceId = `gp-${pl.id || Buffer.from((pl.displayName?.text || '') + (stUp || '')).toString('base64').slice(0, 20)}`;
        if (cachedIds.has(sourceId)) continue;
        cachedIds.add(sourceId); // dedupe across cities

        const comps = pl.addressComponents || [];
        const get  = type => (comps.find(c => c.types && c.types.includes(type)) || {}).longText  || '';
        const getS = type => (comps.find(c => c.types && c.types.includes(type)) || {}).shortText || '';
        const city    = get('locality') || get('sublocality');
        const stCode  = getS('administrative_area_level_1') || stUp || '';
        const zip     = get('postal_code');
        const address = (pl.formattedAddress || '').split(',')[0] || '';

        const lead = {
          source: 'google_places', sourceId,
          businessName: (pl.displayName?.text || '').toUpperCase().trim(),
          address, city, state: stCode, zip,
          naicsCode: null, phone: pl.nationalPhoneNumber || '',
          email: '', website: pl.websiteUri || '',
          employeeCount: 0, yearFormed: null, daysOld: 0, sourceCount: 1,
        };
        const scores = scoreLead(lead);

        newLeads.push({
          ...lead, vertical: normalizedVertical,
          subVertical: industry || normalizedVertical,
          targetLines: tLines, premiumBand: pBand, ...scores,
        });

        if (newLeads.length >= needed) break outer;
      }
      if (!pageToken) break;
      await new Promise(r => setTimeout(r, 300));
    }
    // Small pause between city queries to avoid rate limits
    if (queries.length > 1) await new Promise(r => setTimeout(r, 200));
  }

  // ── 3. Scrape emails from websites in parallel (10 at a time) ────────────
  if (newLeads.length > 0) {
    const EMAIL_BATCH = 10;
    for (let i = 0; i < newLeads.length; i += EMAIL_BATCH) {
      const batch = newLeads.slice(i, i + EMAIL_BATCH);
      const emails = await Promise.all(batch.map(l => scrapeEmailFromSite(l.website)));
      emails.forEach((email, j) => { if (email) newLeads[i + j].email = email; });
    }
  }

  // ── 4. Persist new leads so we never buy them again ───────────────────────
  if (newLeads.length > 0) {
    await new Promise((resolve) => {
      const db = getDB();
      db.run('PRAGMA journal_mode=WAL', () => {
        db.run('PRAGMA busy_timeout=10000', () => {
          db.run('BEGIN', () => {
            const stmt = db.prepare(`INSERT OR REPLACE INTO cl_businesses
              (source, source_id, business_name, address, city, state, zip, naics_code,
               phone, email, website, employee_count, vertical, sub_vertical, target_lines,
               premium_band, score_total, score_priority, days_old, pulled_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,strftime('%s','now'))`);
            for (const l of newLeads) {
              stmt.run(
                l.source, l.sourceId, l.businessName, l.address,
                l.city, l.state, l.zip, l.naicsCode,
                l.phone, l.email || null, l.website, l.employeeCount,
                l.vertical, l.subVertical, JSON.stringify(l.targetLines),
                l.premiumBand, l.total, l.priority, l.daysOld,
              );
            }
            stmt.finalize(() => { db.run('COMMIT', () => { db.close(); resolve(); }); });
          });
        });
      });
    });
  }

  return [...cached, ...newLeads];
}

// ─── Socrata Open Data Connector ──────────────────────────────────────────────
// Many cities/states publish business licenses + permits via Socrata SODA API.
// No API key required for public datasets. Pass any Socrata dataset endpoint.
// Example: https://data.cityofchicago.org/resource/r5kz-chrr.json
async function fetchSocrataData(endpointUrl, criteria) {
  const { state, maxResults = 200 } = criteria;
  const url = `${endpointUrl}?$limit=${maxResults}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'VanguardInsuranceCRM/1.0' },
    timeout: 20000,
  });
  if (!res.ok) throw new Error(`Socrata HTTP ${res.status}`);
  const rows = await res.json();

  return rows.map((r, i) => {
    // Socrata datasets vary — try common field names
    const businessName = r.legal_name || r.doing_business_as_name || r.business_name || r.name || r.applicant || '';
    const naicsCode = r.naics_code || r.primary_naics_code || '';
    const addr = r.address || r.street_address || r.location || '';
    const city = r.city || r.site_city || '';
    const st = r.state || r.site_state || state || '';
    const zip = r.zip_code || r.zip || r.postal_code || '';

    const lead = {
      source: 'socrata',
      sourceId: `soc-${r[':id'] || r.id || i}`,
      businessName: String(businessName).toUpperCase().trim(),
      address: String(addr).trim(),
      city: String(city).trim(),
      state: String(st).toUpperCase().trim(),
      zip: String(zip).trim(),
      naicsCode: String(naicsCode).replace(/\D/g, '').substring(0, 6),
      phone: r.phone || r.contact_phone || '',
      email: r.email || '',
      website: r.website || r.url || '',
      employeeCount: parseInt(r.employees || r.employee_count || 0) || 0,
      daysOld: 30,
      sourceCount: 1,
    };
    const cls = classifyNAICS(lead.naicsCode);
    const scores = scoreLead(lead);

    return {
      ...lead,
      vertical: cls ? cls.vertical : 'Business',
      subVertical: cls ? cls.sub : '',
      targetLines: cls ? cls.lines : ['BOP','GL'],
      premiumBand: cls ? cls.premium : 'medium',
      ...scores,
    };
  }).filter(r => r.businessName);
}

// ─── Query local OSHA data ────────────────────────────────────────────────────
function queryLocalOSHA(criteria, db) {
  return new Promise((resolve, reject) => {
    const {
      state, naicsPrefix, verticals = [], minScore = 0, maxResults = 250, daysBack, industry,
    } = criteria;

    let query = `SELECT * FROM cl_businesses WHERE source = 'osha'`;
    const params = [];

    if (state) { query += ` AND state = ?`; params.push(state.toUpperCase()); }
    if (naicsPrefix) { query += ` AND naics_code LIKE ?`; params.push(naicsPrefix + '%'); }
    if (verticals.length > 0) {
      query += ` AND vertical IN (${verticals.map(() => '?').join(',')})`;
      params.push(...verticals);
    }
    // Apply industry keyword in SQL so it filters BEFORE the LIMIT.
    // Use exact match on vertical/sub_vertical (indexed) + LIKE only on business_name.
    if (industry) {
      const kw = `%${industry}%`;
      query += ` AND (vertical = ? OR sub_vertical = ? OR business_name LIKE ?)`;
      params.push(industry, industry, kw);
    }
    if (daysBack && parseInt(daysBack) < 9999) { query += ` AND days_old <= ?`; params.push(parseInt(daysBack)); }
    query += ` AND score_total >= ? ORDER BY score_total DESC LIMIT ?`;
    params.push(minScore, maxResults);

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => ({
        source: r.source,
        sourceId: r.source_id,
        businessName: r.business_name,
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        naicsCode: r.naics_code,
        phone: r.phone || '',
        email: r.email || '',
        website: r.website || '',
        employeeCount: r.employee_count || 0,
        yearFormed: r.year_formed,
        vertical: r.vertical || '',
        subVertical: r.sub_vertical || '',
        targetLines: r.target_lines ? JSON.parse(r.target_lines) : [],
        premiumBand: r.premium_band || '',
        total: r.score_total,
        priority: r.score_priority,
        daysOld: r.days_old,
        pulledAt: r.pulled_at,
      })));
    });
  });
}

// ─── Deduplication ────────────────────────────────────────────────────────────
function dedupeLeads(leads) {
  const seen = new Map();
  for (const lead of leads) {
    const key = `${(lead.businessName || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}-${(lead.city || '').toLowerCase()}-${(lead.state || '').toUpperCase()}`;
    if (!seen.has(key)) {
      seen.set(key, lead);
    } else {
      // Merge: keep record with higher score, increment sourceCount
      const existing = seen.get(key);
      if ((lead.total || 0) > (existing.total || 0)) {
        seen.set(key, { ...lead, sourceCount: (existing.sourceCount || 1) + 1 });
      } else {
        existing.sourceCount = (existing.sourceCount || 1) + 1;
      }
    }
  }
  return Array.from(seen.values());
}

// ─── Main: Generate Leads ─────────────────────────────────────────────────────
async function generateCommercialLeads(criteria) {
  await initTables();
  const db = getDB();

  const {
    sources = ['osha', 'opencorporates'],
    state, naicsPrefix, industry,
    employeesMin, employeesMax,
    daysBack = 365,
    targetLines = [],
    verticals = [],
    minScore = 0,
    maxResults = 300,
    socrataEndpoint,
    ocApiToken,
    gpMax = 40,
  } = criteria;

  let allResults = [];
  const errors = [];

  // 1. Local OSHA data
  if (sources.includes('osha')) {
    try {
      const rows = await queryLocalOSHA({ state, naicsPrefix, verticals, minScore, maxResults, daysBack, industry }, db);
      allResults.push(...rows);
    } catch (e) {
      errors.push(`OSHA query: ${e.message}`);
    }
  }

  db.close();

  // 2. OpenCorporates (new business filings)
  if (sources.includes('opencorporates')) {
    try {
      const ocRows = await fetchOpenCorporates({ state, daysBack, maxResults: 100, industry, apiToken: ocApiToken || process.env.OPENCORPORATES_API_TOKEN });
      allResults.push(...ocRows);
    } catch (e) {
      errors.push(`OpenCorporates: ${e.message}`);
    }
  }

  // 3. Socrata open data
  if (sources.includes('socrata') && socrataEndpoint) {
    try {
      const socRows = await fetchSocrataData(socrataEndpoint, { state, maxResults: 200 });
      allResults.push(...socRows);
    } catch (e) {
      errors.push(`Socrata: ${e.message}`);
    }
  }

  // 4. Google Places
  if (sources.includes('google_places')) {
    try {
      const gpRows = await fetchGooglePlaces({ state, industry, maxResults: gpMax });
      allResults.push(...gpRows);
    } catch (e) {
      errors.push(`Google Places: ${e.message}`);
    }
  }

  // Dedupe
  allResults = dedupeLeads(allResults);

  // Exclude large self-insured national chains — not viable commercial insurance prospects
  const EXCLUDED_CHAINS = [
    'walmart','wal-mart','sams club',"sam's club",'target','costco','costco wholesale',
    'kroger','meijer','kmart','k-mart','sears','jcpenney','jc penney','nordstrom',
    'macy\'s','macys','bloomingdales','neiman marcus','belk','dillards','dillard\'s',
    'home depot','the home depot','lowe\'s','lowes','menards',
    'best buy','staples','office depot','officemax','dollar general','dollar tree',
    'family dollar','five below','big lots','ross stores','ross dress for less',
    'tj maxx','tjmaxx','marshalls','burlington coat factory','burlington',
    'bed bath beyond','bed bath & beyond','tuesday morning',
    'whole foods','trader joe\'s','trader joes','aldi','lidl','publix','safeway',
    'albertsons','giant eagle','meijer','hy-vee','hyvee','save a lot',
    'winn dixie','winn-dixie','food lion','stop and shop','stop & shop',
    'petco','petsmart','michaels','hobby lobby','joann','jo-ann',
    'cvs','cvs pharmacy','walgreens','rite aid',
    'amazon','amazon fulfillment','amazon warehouse','ups store','fedex',
    'dollar express','99 cents only','ollie\'s','ollies',
    'ace hardware','true value','do it best',  // These are OK as independents but chains appear too
    'autozone','o\'reilly auto','napa auto parts','advance auto',
    'speedway','marathon','bp gas','shell gas station','exxon','mobil',
    'circle k','7-eleven','7 eleven','wawa','sheetz','casey\'s',
    'subway','mcdonald\'s','mcdonalds','burger king','wendy\'s','wendys',
    'starbucks','dunkin','taco bell','chick-fil-a','popeyes','domino\'s',
  ];
  allResults = allResults.filter(r => {
    const name = (r.businessName || '').toLowerCase();
    return !EXCLUDED_CHAINS.some(chain => name.includes(chain));
  });

  // Post-filter
  if (industry) {
    const kw = industry.toLowerCase();
    allResults = allResults.filter(r =>
      (r.subVertical || '').toLowerCase().includes(kw) ||
      (r.vertical || '').toLowerCase().includes(kw) ||
      (r.businessName || '').toLowerCase().includes(kw)
    );
  }
  if (targetLines.length > 0) {
    // Normalize UI full names to abbreviations stored in DB (GL, WC)
    const LINE_ALIASES = { 'general liability': 'gl', "workers' compensation": 'wc', 'workers compensation': 'wc' };
    const normLines = targetLines.map(f => LINE_ALIASES[f.toLowerCase()] || f.toLowerCase());
    allResults = allResults.filter(r =>
      (r.targetLines || []).some(l => {
        const ls = l.toLowerCase();
        return normLines.some(f => ls === f || ls.includes(f) || f.includes(ls));
      })
    );
  }
  if (employeesMin) allResults = allResults.filter(r => (r.employeeCount || 0) >= parseInt(employeesMin));
  if (employeesMax) allResults = allResults.filter(r => !r.employeeCount || r.employeeCount <= parseInt(employeesMax));
  if (minScore) allResults = allResults.filter(r => (r.total || 0) >= parseInt(minScore));

  // Re-score after sourceCount merge, then sort
  allResults = allResults.map(r => {
    if (r.sourceCount > 1) {
      const rescored = scoreLead({ ...r, naicsCode: r.naicsCode });
      return { ...r, ...rescored };
    }
    return r;
  });
  allResults.sort((a, b) => (b.total || 0) - (a.total || 0));

  return {
    leads: allResults.slice(0, parseInt(maxResults)),
    total: allResults.length,
    errors,
  };
}

// ─── Source Status ────────────────────────────────────────────────────────────
async function getSourceStatus() {
  await initTables();
  const db = getDB();
  return new Promise((resolve) => {
    const status = { osha: {}, opencorporates: { available: true, type: 'live' }, socrata: { available: true, type: 'configurable' }, google_places: {} };
    db.serialize(() => {
      db.get(`SELECT COUNT(*) as cnt, MAX(pulled_at) as last_ts FROM cl_businesses WHERE source='osha'`, (err, row) => {
        status.osha.count = row ? row.cnt : 0;
        status.osha.lastSync = (row && row.last_ts) ? new Date(row.last_ts * 1000).toLocaleString() : null;
        status.osha.available = (row && row.cnt > 0);
        db.get(`SELECT COUNT(*) as cnt FROM cl_businesses WHERE source='google_places'`, (err2, gpRow) => {
          status.google_places.count = gpRow ? gpRow.cnt : 0;
          status.google_places.available = true;
          db.get(`SELECT records, message, synced_at FROM cl_sync_log WHERE source IN ('osha','osha-api') ORDER BY synced_at DESC LIMIT 1`, (err3, log) => {
            if (log) {
              status.osha.lastMessage = log.message;
              status.osha.lastSyncDate = new Date(log.synced_at * 1000).toLocaleString();
            }
            db.close();
            resolve(status);
          });
        });
      });
    });
  });
}

module.exports = {
  generateCommercialLeads,
  importOSHACSV,
  syncOSHAFromAPI,
  getSourceStatus,
  initTables,
  NAICS_MAP,
  classifyNAICS,
  scoreLead,
};
