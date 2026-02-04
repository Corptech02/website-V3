const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middleware for JSON and file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Note: CORS middleware not needed for COI emails since they use existing /api/ proxy

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const ext = path.extname(file.originalname);
        cb(null, docId + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle nginx proxy gap - serve admin dashboard directly from vigagency server
app.get('/pages/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'admin-dashboard.html'));
});

// Policy Detail API - MUST be before CRM proxy middleware to catch specific routes
app.get('/api/crm/policies/:policyNumber', async (req, res) => {
    const http = require('http');
    const policyNumber = req.params.policyNumber;

    console.log('🔗 CRM Policy detail request for:', policyNumber);

    const options = {
        hostname: '162.220.14.239',
        port: 80,
        path: `/api/policies/${encodeURIComponent(policyNumber)}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            console.log('✅ CRM Policy detail response received for:', policyNumber);
            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Content-Type', 'application/json');
            res.status(proxyRes.statusCode).send(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('❌ CRM Policy detail error for', policyNumber, ':', error.message);
        res.status(500).json({
            success: false,
            error: 'Policy detail fetch failed',
            policy_number: policyNumber,
            proxy_info: {
                source: 'vigagency CRM policy proxy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    });

    proxyReq.end();
});

// Policy Detail Proxy specifically for detailed data
app.get('/api/crm/policy-detail/:policyNumber', async (req, res) => {
    const http = require('http');
    const policyNumber = req.params.policyNumber;

    console.log('🔗 CRM Policy detail proxy request for:', policyNumber);

    const options = {
        hostname: '162.220.14.239',
        port: 80,
        path: `/api/policies/${encodeURIComponent(policyNumber)}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            console.log('✅ CRM Policy detail proxy response received for:', policyNumber);
            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Content-Type', 'application/json');
            res.status(proxyRes.statusCode).send(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('❌ CRM Policy detail proxy error for', policyNumber, ':', error.message);
        res.status(500).json({
            success: false,
            error: 'Policy detail fetch failed',
            policy_number: policyNumber,
            proxy_info: {
                source: 'vigagency CRM policy detail proxy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    });

    proxyReq.end();
});

// Enhanced CRM API proxy that enriches data with detailed policy info
// Alternative endpoint to bypass caching issues
app.get('/api/crm-enriched-data', async (req, res) => {
    const http = require('http');

    console.log('🔗 Alternative Enhanced CRM leads request with detail enrichment');

    try {
        // First, get the basic leads data
        const basicLeadsData = await new Promise((resolve, reject) => {
            const options = {
                hostname: '127.0.0.1',
                port: 3001,
                path: '/api/vigagency/crm/leads',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const proxyReq = http.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', (chunk) => data += chunk);
                proxyRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            proxyReq.on('error', (error) => {
                console.error('Error fetching basic leads:', error);
                reject(error);
            });

            proxyReq.end();
        });

        console.log('✅ Basic leads data received:', basicLeadsData.leads ? basicLeadsData.leads.length : 0, 'policies');

        // Return the enriched data with existing logic...
        if (basicLeadsData.leads && Array.isArray(basicLeadsData.leads)) {
            // Use the existing enrichment logic
            const enrichedLeads = await Promise.all(basicLeadsData.leads.map(async (lead) => {
                try {
                    const detailedData = await new Promise((resolve, reject) => {
                        const detailOptions = {
                            hostname: '127.0.0.1',
                            port: 3001,
                            path: `/api/policies/${encodeURIComponent(lead.policy_number || lead.original_id)}`,
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        };

                        const detailReq = http.request(detailOptions, (detailRes) => {
                            let detailData = '';
                            detailRes.on('data', (chunk) => detailData += chunk);
                            detailRes.on('end', () => {
                                try {
                                    const detailJson = JSON.parse(detailData);
                                    resolve(detailJson);
                                } catch (error) {
                                    resolve(null);
                                }
                            });
                        });

                        detailReq.on('error', () => resolve(null));
                        detailReq.setTimeout(5000, () => {
                            detailReq.destroy();
                            resolve(null);
                        });
                        detailReq.end();
                    });

                    // Enhanced mapping logic
                    const enrichedLead = {
                        ...lead,
                        vehicles: [],
                        trailers: [],
                        drivers: [],
                        coverage: {},
                        detailed_crm_data: detailedData
                    };

                    // Extract vehicles and trailers from nested data structure
                    if (detailedData && detailedData.data && detailedData.data.vehicles) {
                        console.log(`🔍 Processing ${detailedData.data.vehicles.length} vehicles for policy ${lead.policy_number}`);
                        detailedData.data.vehicles.forEach(vehicle => {
                            if (vehicle.Type === 'Vehicle' || vehicle.type === 'Vehicle' || (!vehicle.Type && !vehicle.type)) {
                                enrichedLead.vehicles.push(vehicle);
                                console.log(`  ✅ Added vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
                            } else if (vehicle.Type === 'Trailer' || vehicle.type === 'Trailer') {
                                enrichedLead.trailers.push(vehicle);
                                console.log(`  🚛 Added trailer: ${vehicle.Year || vehicle.year} ${vehicle.Make || vehicle.make} ${vehicle['Trailer Type'] || vehicle.trailer_type}`);
                            }
                        });
                    }

                    // Extract drivers from nested data structure
                    if (detailedData && detailedData.data && detailedData.data.drivers) {
                        enrichedLead.drivers = detailedData.data.drivers;
                        console.log(`👥 Added ${detailedData.data.drivers.length} drivers for policy ${lead.policy_number}`);
                    }

                    // Extract coverage from nested data structure
                    if (detailedData && detailedData.data && detailedData.data.coverage) {
                        enrichedLead.coverage = detailedData.data.coverage;
                        console.log(`📋 Added coverage data for policy ${lead.policy_number}`);
                    }

                    return enrichedLead;
                } catch (error) {
                    console.error('Error enriching lead:', lead.policy_number, error);
                    return {
                        ...lead,
                        vehicles: [],
                        trailers: [],
                        drivers: [],
                        coverage: {}
                    };
                }
            }));

            res.json({
                success: true,
                leads: enrichedLeads
            });
        } else {
            throw new Error('No leads data received');
        }

    } catch (error) {
        console.error('Enhanced CRM Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            leads: []
        });
    }
});

app.get('/vigagency-internal/enriched-policies', async (req, res) => {
    const http = require('http');

    console.log('🔗 Enhanced CRM leads request with detail enrichment');

    try {
        // First, get the basic leads data
        const basicLeadsData = await new Promise((resolve, reject) => {
            const options = {
                hostname: '127.0.0.1',
                port: 3001,
                path: '/api/vigagency/crm/leads',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const proxyReq = http.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', (chunk) => { data += chunk; });
                proxyRes.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            proxyReq.on('error', reject);
            proxyReq.end();
        });

        console.log('✅ Basic leads data received:', basicLeadsData?.leads?.length || 0, 'policies');

        // Enrich each policy with detailed data
        if (basicLeadsData?.leads) {
            const enrichedLeads = await Promise.all(
                basicLeadsData.leads.map(async (basicPolicy) => {
                    try {
                        // Fetch detailed policy data
                        const detailedData = await new Promise((resolve) => {
                            const detailOptions = {
                                hostname: '162.220.14.239',
                                port: 80,
                                path: `/api/policies/${encodeURIComponent(basicPolicy.policy_number)}`,
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' }
                            };

                            const detailReq = http.request(detailOptions, (detailRes) => {
                                let detailData = '';
                                detailRes.on('data', (chunk) => { detailData += chunk; });
                                detailRes.on('end', () => {
                                    try {
                                        resolve(JSON.parse(detailData));
                                    } catch (e) {
                                        resolve(null);
                                    }
                                });
                            });

                            detailReq.on('error', () => resolve(null));
                            detailReq.end();
                        });

                        if (detailedData?.data) {
                            // Merge basic and detailed data
                            return {
                                ...basicPolicy,
                                vehicles: (detailedData.data.vehicles || [])
                                    .filter(vehicle => vehicle.type !== 'Trailer' && vehicle.Type !== 'Trailer')
                                    .map(vehicle => ({
                                        year: vehicle.year || vehicle.Year,
                                        make: vehicle.make || vehicle.Make,
                                        model: vehicle.model || vehicle.Model,
                                        vin: vehicle.vin || vehicle.VIN
                                    })),
                                trailers: (detailedData.data.vehicles || [])
                                    .filter(vehicle => vehicle.type === 'Trailer' || vehicle.Type === 'Trailer')
                                    .map(trailer => ({
                                        year: trailer.year || trailer.Year,
                                        make: trailer.make || trailer.Make,
                                        trailer_type: trailer['Trailer Type'] || trailer.trailer_type,
                                        vin: trailer.vin || trailer.VIN
                                    })),
                                drivers: (detailedData.data.drivers || []).map(driver => ({
                                    name: driver['Full Name'],
                                    license_number: driver['License Number']
                                })),
                                detailed_crm_data: detailedData.data
                            };
                        }

                        return basicPolicy;
                    } catch (error) {
                        console.log('⚠️ Error enriching policy', basicPolicy.policy_number, ':', error.message);
                        return basicPolicy;
                    }
                })
            );

            basicLeadsData.leads = enrichedLeads;
        }

        // Add CORS headers and return enriched data
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.json(basicLeadsData);

    } catch (error) {
        console.error('❌ Enhanced CRM leads error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            leads: [],
            total: 0
        });
    }
});

// VigAgency internal policy detail endpoint
app.get('/vigagency-internal/policy-detail/:policyNumber', async (req, res) => {
    const http = require('http');
    const policyNumber = req.params.policyNumber;
    console.log('🔗 VigAgency internal policy detail request for:', policyNumber);

    const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: `/api/policies/${encodeURIComponent(policyNumber)}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            console.log('✅ VigAgency internal policy detail response received for:', policyNumber);
            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Content-Type', 'application/json');
            res.status(proxyRes.statusCode).send(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('❌ VigAgency internal policy detail error for', policyNumber, ':', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            policy_number: policyNumber
        });
    });

    proxyReq.setTimeout(10000, () => {
        console.log('⏰ VigAgency internal policy detail timeout for:', policyNumber);
        proxyReq.destroy();
        res.status(408).json({
            success: false,
            error: 'Request timeout',
            policy_number: policyNumber
        });
    });

    proxyReq.end();
});

// Direct CRM API route - clients endpoint
app.get('/api/crm/clients', async (req, res) => {
    const http = require('http');

    console.log('🔗 VigAgency CRM clients proxy request:', req.query);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    try {
        // Build query string from request
        const queryString = new URLSearchParams(req.query).toString();
        const backendPath = `/api/vigagency/crm/clients${queryString ? '?' + queryString : ''}`;

        const data = await new Promise((resolve, reject) => {
            const options = {
                hostname: '127.0.0.1',
                port: 3001,
                path: backendPath,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const proxyReq = http.request(options, (proxyRes) => {
                let responseData = '';
                proxyRes.on('data', (chunk) => responseData += chunk);
                proxyRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        resolve(jsonData);
                    } catch (parseErr) {
                        reject(new Error('Invalid JSON response from backend'));
                    }
                });
            });

            proxyReq.on('error', (err) => {
                reject(new Error(`Backend connection failed: ${err.message}`));
            });

            proxyReq.on('timeout', () => {
                proxyReq.destroy();
                reject(new Error('Backend request timeout'));
            });

            proxyReq.setTimeout(10000);
            proxyReq.end();
        });

        console.log(`✅ VigAgency CRM clients proxy success: ${data.clients?.length || 0} clients`);
        res.json(data);

    } catch (error) {
        console.error('❌ VigAgency CRM clients proxy error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            clients: []
        });
    }
});

// Direct CRM API route - leads endpoint
app.get('/api/crm/leads', async (req, res) => {
    const http = require('http');

    console.log('🔗 VigAgency CRM leads proxy request:', req.query);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    try {
        // Build query string from request
        const queryString = new URLSearchParams(req.query).toString();
        const backendPath = `/api/vigagency/crm/leads${queryString ? '?' + queryString : ''}`;

        const data = await new Promise((resolve, reject) => {
            const options = {
                hostname: '127.0.0.1',
                port: 3001,
                path: backendPath,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const proxyReq = http.request(options, (proxyRes) => {
                let responseData = '';
                proxyRes.on('data', (chunk) => responseData += chunk);
                proxyRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        resolve(jsonData);
                    } catch (parseErr) {
                        reject(new Error('Invalid JSON response from backend'));
                    }
                });
            });

            proxyReq.on('error', (err) => {
                reject(new Error(`Backend connection failed: ${err.message}`));
            });

            proxyReq.on('timeout', () => {
                proxyReq.destroy();
                reject(new Error('Backend request timeout'));
            });

            proxyReq.setTimeout(10000);
            proxyReq.end();
        });

        console.log(`✅ VigAgency CRM leads proxy success: ${data.leads?.length || 0} leads`);
        res.json(data);

    } catch (error) {
        console.error('❌ VigAgency CRM leads proxy error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            leads: [],
            total: 0
        });
    }
});


// Document upload endpoint
app.post('/api/documents', upload.single('file'), (req, res) => {
    console.log('📤 Document upload request received');

    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    const { policyId, policyNumber, uploadedBy } = req.body;

    if (!policyNumber) {
        // Clean up uploaded file
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
            success: false,
            error: 'Missing policyNumber parameter'
        });
    }

    // For vigagency, we'll store documents locally and track them in a simple JSON file
    const documentData = {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        policy_id: policyId,
        policy_number: policyNumber,
        original_name: req.file.originalname,
        filename: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        uploaded_by: uploadedBy || 'Admin User',
        created_at: new Date().toISOString()
    };

    // Store document metadata in JSON file
    const documentsFile = path.join(__dirname, 'documents.json');
    let documents = [];

    try {
        if (fs.existsSync(documentsFile)) {
            documents = JSON.parse(fs.readFileSync(documentsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading documents file:', error);
    }

    documents.push(documentData);

    try {
        fs.writeFileSync(documentsFile, JSON.stringify(documents, null, 2));
        console.log('✅ Document uploaded and saved:', documentData.original_name);

        res.json({
            success: true,
            document: {
                id: documentData.id,
                name: documentData.original_name,
                type: documentData.file_type,
                size: documentData.file_size,
                uploadDate: documentData.created_at,
                uploadedBy: documentData.uploaded_by
            }
        });
    } catch (error) {
        // Clean up uploaded file on error
        fs.unlink(req.file.path, () => {});
        console.error('Error saving document metadata:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save document metadata'
        });
    }
});

// Get documents for a policy
app.get('/api/policies/:policyId/documents', (req, res) => {
    const policyId = req.params.policyId;
    const { type } = req.query;

    console.log('📋 Getting documents for policy:', policyId, 'type:', type);

    const documentsFile = path.join(__dirname, 'documents.json');
    let documents = [];

    try {
        if (fs.existsSync(documentsFile)) {
            documents = JSON.parse(fs.readFileSync(documentsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading documents file:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to read documents'
        });
    }

    // Filter documents by policy
    let policyDocs = documents.filter(doc =>
        doc.policy_id === policyId ||
        doc.policy_number === policyId
    );

    // Filter by type if specified (for COI documents)
    if (type === 'coi') {
        policyDocs = policyDocs.filter(doc =>
            doc.original_name.toLowerCase().includes('coi') ||
            doc.original_name.toLowerCase().includes('certificate') ||
            doc.original_name.toLowerCase().includes('acord')
        );
    }

    res.json({
        success: true,
        documents: policyDocs,
        count: policyDocs.length
    });
});

// Download document
app.get('/api/documents/:docId/download', (req, res) => {
    const docId = req.params.docId;

    console.log('📥 Download request for document:', docId);

    const documentsFile = path.join(__dirname, 'documents.json');
    let documents = [];

    try {
        if (fs.existsSync(documentsFile)) {
            documents = JSON.parse(fs.readFileSync(documentsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading documents file:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to read documents'
        });
    }

    const document = documents.find(doc => doc.id === docId);

    if (!document) {
        return res.status(404).json({
            success: false,
            error: 'Document not found'
        });
    }

    if (!fs.existsSync(document.file_path)) {
        return res.status(404).json({
            success: false,
            error: 'File not found on server'
        });
    }

    // Set headers for download
    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);
});

// Delete document
app.delete('/api/documents/:docId', (req, res) => {
    const docId = req.params.docId;

    console.log('🗑️ Delete request for document:', docId);

    const documentsFile = path.join(__dirname, 'documents.json');
    let documents = [];

    try {
        if (fs.existsSync(documentsFile)) {
            documents = JSON.parse(fs.readFileSync(documentsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading documents file:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to read documents'
        });
    }

    const documentIndex = documents.findIndex(doc => doc.id === docId);

    if (documentIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'Document not found'
        });
    }

    const document = documents[documentIndex];

    // Delete the file
    if (fs.existsSync(document.file_path)) {
        fs.unlink(document.file_path, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            }
        });
    }

    // Remove from documents array
    documents.splice(documentIndex, 1);

    try {
        fs.writeFileSync(documentsFile, JSON.stringify(documents, null, 2));
        console.log('✅ Document deleted:', document.original_name);

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Error updating documents file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update document metadata'
        });
    }
});

// CRM Proxy endpoint - forwards to local CRM proxy on port 8084
app.get('/api/crm-proxy-endpoint', async (req, res) => {
    const http = require('http');

    console.log('🔗 CRM proxy request received');

    const options = {
        hostname: 'localhost',
        port: 8085,
        path: '/api/crm/leads',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            console.log('✅ CRM proxy response received');
            res.setHeader('Content-Type', 'application/json');
            res.status(proxyRes.statusCode).send(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('❌ CRM proxy error:', error.message);
        res.status(500).json({
            success: false,
            error: 'CRM connection failed',
            leads: [],
            proxy_info: {
                source: 'vigagency server proxy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    });

    proxyReq.end();
});


// Note: COI email sending now uses existing /api/coi/send-request endpoint
// configured with contact@vigagency.com SMTP in the vanguard backend

// Policy Management API - Server-side storage for imported policies
const policiesFile = path.join(__dirname, 'policies.json');

// Ensure policies file exists
if (!fs.existsSync(policiesFile)) {
    fs.writeFileSync(policiesFile, JSON.stringify([], null, 2));
}

// Certificate Holder Management API - Server-side storage
const certificateHoldersFile = path.join(__dirname, 'certificate-holders.json');

// Ensure certificate holders file exists
if (!fs.existsSync(certificateHoldersFile)) {
    fs.writeFileSync(certificateHoldersFile, JSON.stringify([], null, 2));
}

// Get all policies
app.get('/api/policies', (req, res) => {
    console.log('📋 Getting all policies from server storage');

    try {
        let policies = [];
        if (fs.existsSync(policiesFile)) {
            policies = JSON.parse(fs.readFileSync(policiesFile, 'utf8'));
        }

        // Normalize all policies on read to ensure consistent structure
        const normalizedPolicies = policies.map(policy => {
            // Check if policy is already normalized
            if (policy.normalized_at) {
                return policy; // Already normalized
            } else {
                console.log('🔧 SERVER GET: Normalizing legacy policy on read:', policy.id || policy.policyNumber);
                return normalizePolicy(policy);
            }
        });

        // If we had to normalize any policies, save them back
        if (normalizedPolicies.some((p, i) => !policies[i].normalized_at)) {
            console.log('💾 SERVER GET: Saving normalized policies back to storage');
            fs.writeFileSync(policiesFile, JSON.stringify(normalizedPolicies, null, 2));
        }

        console.log(`✅ Found ${normalizedPolicies.length} normalized policies in server storage`);

        // Return as a direct array for simpler client-side handling
        res.json(normalizedPolicies);
    } catch (error) {
        console.error('❌ Error reading policies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read policies'
        });
    }
});

// Data normalization function for consistent policy structure
function normalizePolicy(policy) {
    console.log('🔧 SERVER: Normalizing policy structure for:', policy.id || policy.policyNumber || 'unknown');

    // Create normalized policy object with consistent field names
    const normalized = {
        // Primary identifiers - prefer standard names, fall back to alternatives
        id: policy.id || policy.policyNumber || policy.policy_number || `policy-${Date.now()}`,
        policy_number: policy.policy_number || policy.policyNumber || policy.id,

        // Client/Insured information - normalize to standard names
        insured_name: policy.insured_name || policy.clientName || policy.insured || '',
        client_phone: policy.client_phone || policy.phone || policy.clientPhone || '',
        client_email: policy.client_email || policy.email || policy.clientEmail || '',

        // Policy details
        type: policy.type || policy.policyType || 'Commercial Auto',
        carrier: policy.carrier || '',
        agency: policy.agency || '',
        status: policy.status || 'Active',
        premium: policy.premium || 0,

        // Dates - normalize format
        effective_date: policy.effective_date || policy.effectiveDate || '',
        expiration_date: policy.expiration_date || policy.expirationDate || policy.expiryDate || '',

        // Address
        address: policy.address || '',

        // Preserve all other data
        ...policy,

        // Server metadata
        server_stored: true,
        server_stored_at: new Date().toISOString(),
        normalized_at: new Date().toISOString()
    };

    // Ensure we have the standard field names set correctly
    if (!normalized.insured_name && normalized.clientName) {
        normalized.insured_name = normalized.clientName;
    }
    if (!normalized.policy_number && normalized.policyNumber) {
        normalized.policy_number = normalized.policyNumber;
    }

    console.log('🔧 SERVER: Normalized policy fields:', {
        id: normalized.id,
        policy_number: normalized.policy_number,
        insured_name: normalized.insured_name,
        client_phone: normalized.client_phone,
        client_email: normalized.client_email
    });

    return normalized;
}

// Add/Import policies
app.post('/api/policies', (req, res) => {
    console.log('💾 Saving policies to server storage with normalization');

    try {
        const newPolicies = req.body.policies || [];

        if (!Array.isArray(newPolicies) || newPolicies.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No policies provided or invalid format'
            });
        }

        // Read existing policies
        let existingPolicies = [];
        if (fs.existsSync(policiesFile)) {
            existingPolicies = JSON.parse(fs.readFileSync(policiesFile, 'utf8'));
        }

        // Clear demo policies on first import
        const demoPatterns = ['VIG-2024-', 'TEST-UI-DEMO', 'DEMO-'];
        const originalCount = existingPolicies.length;
        existingPolicies = existingPolicies.filter(p => {
            const policyNum = p.policy_number || p.policyNumber || '';
            return !demoPatterns.some(pattern => policyNum.includes(pattern));
        });

        if (existingPolicies.length < originalCount) {
            console.log(`🧹 Removed ${originalCount - existingPolicies.length} demo policies from server storage`);
        }

        console.log(`🔧 SERVER: Processing ${newPolicies.length} policies for save/update`);

        // Check if this is a complete replacement (all policies being sent)
        const isFullReplacement = newPolicies.length === existingPolicies.length + 1 ||
                                 newPolicies.length > 10; // Likely a full replacement if many policies

        if (isFullReplacement) {
            console.log(`🔄 SERVER: Detected full policy replacement - replacing all ${existingPolicies.length} existing policies with ${newPolicies.length} normalized policies`);

            // Normalize all incoming policies
            const normalizedPolicies = newPolicies.map(policy => normalizePolicy(policy));

            // Replace entire policy array
            fs.writeFileSync(policiesFile, JSON.stringify(normalizedPolicies, null, 2));

            console.log(`✅ SERVER: Replaced all policies with ${normalizedPolicies.length} normalized policies`);

            res.json({
                success: true,
                replaced: normalizedPolicies.length,
                total: normalizedPolicies.length,
                message: `Successfully replaced with ${normalizedPolicies.length} normalized policies`
            });
        } else {
            // Add new policies (avoid duplicates) - original logic but with normalization
            const existingNumbers = existingPolicies.map(p => p.policy_number || p.policyNumber);
            let addedCount = 0;
            let updatedCount = 0;

            newPolicies.forEach(policy => {
                const normalizedPolicy = normalizePolicy(policy);
                const policyNumber = normalizedPolicy.policy_number;

                if (policyNumber) {
                    const existingIndex = existingPolicies.findIndex(p =>
                        (p.policy_number === policyNumber) ||
                        (p.policyNumber === policyNumber) ||
                        (p.id === normalizedPolicy.id)
                    );

                    if (existingIndex >= 0) {
                        // Update existing policy
                        existingPolicies[existingIndex] = normalizedPolicy;
                        updatedCount++;
                        console.log(`🔄 SERVER: Updated existing policy: ${policyNumber}`);
                    } else if (!existingNumbers.includes(policyNumber)) {
                        // Add new policy
                        existingPolicies.push(normalizedPolicy);
                        addedCount++;
                        console.log(`➕ SERVER: Added new policy: ${policyNumber}`);
                    }
                }
            });

            // Save back to file
            fs.writeFileSync(policiesFile, JSON.stringify(existingPolicies, null, 2));

            console.log(`✅ SERVER: Added ${addedCount}, updated ${updatedCount} policies. Total: ${existingPolicies.length}`);

            res.json({
                success: true,
                added: addedCount,
                updated: updatedCount,
                total: existingPolicies.length,
                message: `Successfully added ${addedCount} and updated ${updatedCount} policies`
            });
        }

    } catch (error) {
        console.error('❌ Error saving policies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save policies'
        });
    }
});

// Delete a policy
app.delete('/api/policies/:id', (req, res) => {
    console.log('🗑️ Deleting policy:', req.params.id);

    try {
        let policies = [];
        if (fs.existsSync(policiesFile)) {
            policies = JSON.parse(fs.readFileSync(policiesFile, 'utf8'));
        }

        const originalCount = policies.length;
        policies = policies.filter(p => p.id !== req.params.id);

        if (policies.length < originalCount) {
            fs.writeFileSync(policiesFile, JSON.stringify(policies, null, 2));
            console.log('✅ Policy deleted successfully');
            res.json({
                success: true,
                message: 'Policy deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Policy not found'
            });
        }
    } catch (error) {
        console.error('❌ Error deleting policy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete policy'
        });
    }
});

// Certificate Holder Management API

// Get all certificate holders
app.get('/api/certificate-holders', (req, res) => {
    console.log('📋 Getting all certificate holders from server storage');

    try {
        let holders = [];
        if (fs.existsSync(certificateHoldersFile)) {
            holders = JSON.parse(fs.readFileSync(certificateHoldersFile, 'utf8'));
        }

        console.log(`✅ Found ${holders.length} certificate holders in server storage`);
        res.json({
            success: true,
            holders: holders,
            count: holders.length
        });
    } catch (error) {
        console.error('❌ Error reading certificate holders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read certificate holders'
        });
    }
});

// Save certificate holder
app.post('/api/certificate-holders', (req, res) => {
    console.log('💾 Saving certificate holder to server storage');

    try {
        const newHolder = req.body;

        if (!newHolder || !newHolder.name || !newHolder.streetAddress || !newHolder.cityStateZip) {
            return res.status(400).json({
                success: false,
                error: 'Missing required certificate holder fields'
            });
        }

        // Read existing certificate holders
        let existingHolders = [];
        if (fs.existsSync(certificateHoldersFile)) {
            existingHolders = JSON.parse(fs.readFileSync(certificateHoldersFile, 'utf8'));
        }

        // Check if holder already exists by name
        const existing = existingHolders.find(h => h.name.toLowerCase() === newHolder.name.toLowerCase());
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Certificate holder with this name already exists'
            });
        }

        // Add new holder
        newHolder.id = Date.now().toString();
        newHolder.isGlobal = false;
        newHolder.createdAt = new Date().toISOString();
        existingHolders.push(newHolder);

        // Write back to file
        fs.writeFileSync(certificateHoldersFile, JSON.stringify(existingHolders, null, 2));

        console.log(`✅ Certificate holder saved: ${newHolder.name}`);
        res.json({
            success: true,
            holder: newHolder,
            message: 'Certificate holder saved successfully'
        });
    } catch (error) {
        console.error('❌ Error saving certificate holder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save certificate holder'
        });
    }
});

// Delete certificate holder
app.delete('/api/certificate-holders/:id', (req, res) => {
    console.log('🗑️ Deleting certificate holder:', req.params.id);

    try {
        const holderId = req.params.id;

        // Read existing certificate holders
        let holders = [];
        if (fs.existsSync(certificateHoldersFile)) {
            holders = JSON.parse(fs.readFileSync(certificateHoldersFile, 'utf8'));
        }

        // Find and remove the holder
        const originalLength = holders.length;
        holders = holders.filter(h => h.id !== holderId);

        if (holders.length === originalLength) {
            return res.status(404).json({
                success: false,
                error: 'Certificate holder not found'
            });
        }

        // Write back to file
        fs.writeFileSync(certificateHoldersFile, JSON.stringify(holders, null, 2));

        console.log(`✅ Certificate holder deleted: ${holderId}`);
        res.json({
            success: true,
            message: 'Certificate holder deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting certificate holder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete certificate holder'
        });
    }
});

// Fallback to serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`🚀 VigAgency server with CRM proxy running on port ${PORT}`);
    console.log('📡 CRM proxy route: /api/crm/* -> http://127.0.0.1:3001/api/vigagency/crm/*');
});

module.exports = app;