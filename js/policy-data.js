// Policy Data Management System - Server-Side API Implementation
// Updated to use server storage instead of localStorage

class PolicyDataManager {
    constructor() {
        console.log('💾 PolicyDataManager constructor called - Updated flattening logic v2.0 - ' + new Date().toISOString());
        this.apiBase = 'https://162-220-14-239.nip.io';  // Use working HTTPS endpoint
        console.log('💾 Starting database initialization...');
        this.initializeDatabase();
    }

    // Initialize database with sample data if empty
    async initializeDatabase() {
        try {
            console.log('💾 Checking if policies exist on server...');
            const response = await fetch(`${this.apiBase}/api/policies`);
            console.log('💾 Server response status:', response.status);
            const data = await response.json();
            console.log('💾 Server response data:', data);

            // Handle both response formats: direct array or {success, policies} object
            let policies = [];
            if (Array.isArray(data)) {
                // Direct array response
                policies = data;
                console.log('✅ Found', policies.length, 'existing policies on server (direct array)');
            } else if (data.success && data.policies) {
                // Object with success and policies
                policies = data.policies;
                console.log('✅ Found', policies.length, 'existing policies on server (object format)');
            } else if (data.success && data.policies && data.policies.length === 0) {
                console.log('📋 Initializing policy database with sample data...');
                await this.createSampleData();
            }

            // If we found policies, they're already loaded on the server
            if (policies.length > 0) {
                console.log('💾 Server already has', policies.length, 'policies loaded');
            }
        } catch (error) {
            console.error('❌ Error checking policy database:', error);
            console.error('❌ Error details:', error.stack);
        }
    }

    // Create sample data
    async createSampleData() {
        const samplePolicies = [
            {
                id: 'policy-001',
                policy_number: 'VIG-2024-001',
                type: 'Commercial Auto Insurance',
                status: 'Active',
                premium: 12450,
                effective_date: '2024-01-15',
                expiration_date: '2025-01-15',
                carrier: 'Progressive Commercial',
                insured_name: 'ABC Trucking LLC',
                client_phone: '(555) 123-4567',
                client_email: 'john@abctrucking.com',
                address: '1234 Main St, Columbus, OH 43215',
                vehicles: [
                    {
                        year: 2020,
                        make: 'Freightliner',
                        model: 'Cascadia',
                        vin: '1FUJGBDV5LLBXXXXX',
                        weight: '80,000 lbs',
                        body_type: 'Tractor',
                        use: 'Commercial Transportation',
                        radius: 'Interstate',
                        vehicle_cost: '$125,000',
                        lien_holder: 'Freightliner Financial'
                    }
                ],
                coverage: {
                    auto_liability: {
                        combined_single_limit: '$1,000,000',
                        medical_payments: '$5,000',
                        uninsured_motorist: '$1,000,000',
                        underinsured_motorist: '$1,000,000'
                    },
                    physical_damage: {
                        comprehensive: 'Actual Cash Value',
                        collision: 'Actual Cash Value',
                        comprehensive_deductible: '$1,000',
                        collision_deductible: '$1,000'
                    }
                }
            }
        ];

        try {
            const response = await fetch(`${this.apiBase}/api/policies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ policies: samplePolicies })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Sample policies created successfully');
            } else {
                console.error('❌ Failed to create sample policies:', result.error);
            }
        } catch (error) {
            console.error('❌ Error creating sample data:', error);
        }
    }

    // Get all policies
    async getAllPolicies() {
        try {
            console.log('🔍 getAllPolicies: Making request to', `${this.apiBase}/api/policies`);
            const response = await fetch(`${this.apiBase}/api/policies`);
            console.log('🔍 getAllPolicies: Response status:', response.status);
            const data = await response.json();
            console.log('🔍 getAllPolicies: Response data:', data);

            // Handle response formats - now expecting direct array from normalized server
            console.log('🔍 getAllPolicies: Checking data format...');
            console.log('🔍 getAllPolicies: data is array?', Array.isArray(data));
            console.log('🔍 getAllPolicies: data type:', typeof data);

            if (Array.isArray(data)) {
                console.log('🔍 getAllPolicies: FLATTENING LOGIC EXECUTING - Processing array with', data.length, 'items');

                // Check if this is nested format: [{policies: [...]}, {policies: [...]}]
                let flattenedPolicies = [];

                for (let i = 0; i < data.length; i++) {
                    const item = data[i];
                    console.log(`🔍 getAllPolicies: Processing item ${i}:`, {
                        hasId: !!(item?.id),
                        hasPolicyNumber: !!(item?.policy_number),
                        hasPolicyNumberAlt: !!(item?.policyNumber),
                        hasPoliciesArray: !!(item?.policies && Array.isArray(item.policies)),
                        policiesCount: item?.policies?.length || 0,
                        itemKeys: Object.keys(item || {})
                    });

                    if (item && item.policies && Array.isArray(item.policies)) {
                        console.log(`🔍 getAllPolicies: EXTRACTING ${item.policies.length} policies from nested container ${i}`);
                        // This is nested format - extract the policies
                        flattenedPolicies.push(...item.policies);
                    } else if (item && (item.id || item.policy_number || item.policyNumber)) {
                        console.log(`🔍 getAllPolicies: Adding direct policy object ${i}`);
                        // This is already a policy object
                        flattenedPolicies.push(item);
                    } else {
                        console.log(`🔍 getAllPolicies: Skipping unknown item format ${i}:`, item);
                    }
                }

                console.log('🔍 getAllPolicies: FLATTENING COMPLETE - Flattened', data.length, 'containers into', flattenedPolicies.length, 'policies');

                // VERY VISIBLE SUCCESS MESSAGE
                if (flattenedPolicies.length > 0) {
                    console.log('🎉🎉🎉 FLATTENING SUCCESS: Found', flattenedPolicies.length, 'policies after flattening! 🎉🎉🎉');
                    flattenedPolicies.forEach((policy, i) => {
                        console.log(`✅ Flattened Policy ${i+1}: ${policy.policy_number} - ${policy.insured_name}`);
                    });
                }

                // Log policy structures for debugging specific policies
                flattenedPolicies.forEach(policy => {
                    if (policy.id === 'POL966740' || policy.policyNumber === 'POL966740') {
                        console.log('🚨 CLIENT DEBUG - POL966740 structure from server:', {
                            id: policy.id,
                            policy_number: policy.policy_number,
                            insured_name: policy.insured_name,
                            client_phone: policy.client_phone,
                            client_email: policy.client_email,
                            normalized_at: policy.normalized_at
                        });
                    }
                });

                return flattenedPolicies;
            } else if (data && data.success && data.policies) {
                // Legacy format fallback
                console.log('🔍 getAllPolicies: Returning legacy object.policies with', data.policies.length, 'policies');
                return data.policies;
            } else {
                console.warn('🔍 getAllPolicies: Unexpected response format from /api/policies:');
                console.warn('  - data:', data);
                console.warn('  - data.success:', data?.success);
                console.warn('  - data.policies:', data?.policies);
                return [];
            }
        } catch (error) {
            console.error('❌ getAllPolicies: Error fetching policies:', error);
            return [];
        }
    }

    // Get policy by ID
    async getPolicyById(policyId) {
        try {
            const policies = await this.getAllPolicies();
            console.log('🔍 getPolicyById: Looking for policy:', policyId);
            console.log('🔍 getPolicyById: Available policies:', policies.length);

            // Enhanced policy matching - check multiple ID formats and policy number
            const policy = policies.find(p => {
                const matches = p.id === policyId ||
                       p.id === `policy-${policyId}` ||
                       p.policy_number === policyId ||
                       p.policyNumber === policyId ||
                       (p.id && p.id.includes(policyId)) ||
                       (policyId.includes('policy-') && p.policy_number === policyId.replace('policy-', ''));

                if (matches) {
                    console.log('✅ getPolicyById: Found matching policy:', p.id, p.policy_number);
                }
                return matches;
            });

            if (!policy) {
                console.warn('⚠️ getPolicyById: No policy found for ID:', policyId);
            }

            return policy || null;
        } catch (error) {
            console.error('❌ Error fetching policy:', error);
            return null;
        }
    }

    // Get policy by number
    async getPolicyByNumber(policyNumber) {
        try {
            const policies = await this.getAllPolicies();
            return policies.find(p => p.policy_number === policyNumber) || null;
        } catch (error) {
            console.error('❌ Error fetching policy:', error);
            return null;
        }
    }

    // Add new policy
    async addPolicy(policyData) {
        try {
            const response = await fetch(`${this.apiBase}/api/policies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ policies: [policyData] })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Policy added successfully');
                return policyData;
            } else {
                console.error('❌ Failed to add policy:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error adding policy:', error);
            return null;
        }
    }

    // Update policy
    async updatePolicy(policyId, updates) {
        try {
            console.log('🚨 UPDATEPOLICY DEBUG - Starting update process');
            console.log('🚨 UPDATEPOLICY DEBUG - policyId:', policyId);
            console.log('🚨 UPDATEPOLICY DEBUG - updates object:', updates);
            console.log('🚨 UPDATEPOLICY DEBUG - updates keys:', Object.keys(updates));
            console.log('🚨 UPDATEPOLICY DEBUG - updates phone:', updates.client_phone);
            console.log('🚨 UPDATEPOLICY DEBUG - updates email:', updates.client_email);

            // Use efficient single-policy PUT endpoint instead of sending all policies
            console.log('🚨 UPDATEPOLICY DEBUG - Using efficient PUT endpoint for single policy update');

            const response = await fetch(`${this.apiBase}/api/policies/${policyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            console.log('🚨 UPDATEPOLICY DEBUG - Server response status:', response.status);
            console.log('🚨 UPDATEPOLICY DEBUG - Response headers:', [...response.headers.entries()]);

            const result = await response.json();
            console.log('🚨 UPDATEPOLICY DEBUG - Server response data:', result);

            if (result.success) {
                console.log('✅ Policy updated successfully using PUT endpoint');
                // Get the updated policy to return
                const updatedPolicy = await this.getPolicyById(policyId);
                console.log('🚨 UPDATEPOLICY DEBUG - Returning updated policy:', updatedPolicy);
                return updatedPolicy;
            } else {
                console.error('❌ Failed to update policy:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error updating policy:', error);
            console.error('❌ Error stack:', error.stack);
            return null;
        }
    }

    // Delete policy
    async deletePolicy(policyId) {
        try {
            const response = await fetch(`${this.apiBase}/api/policies/${policyId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Policy deleted successfully');
                return true;
            } else {
                console.error('❌ Failed to delete policy:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Error deleting policy:', error);
            return false;
        }
    }

    // Authentication methods (local implementation)
    async authenticateUser(policyNumber, phoneNumber) {
        try {
            console.log('🔐 AUTHENTICATEUSER DEBUG - Starting authentication process');
            console.log('🔐 INPUT - Policy Number:', policyNumber);
            console.log('🔐 INPUT - Phone Number:', phoneNumber);
            console.log('🔐 INPUT - Phone Number (clean):', phoneNumber.replace(/\D/g, ''));

            const policies = await this.getAllPolicies();
            console.log('🔐 POLICIES LOADED - Total count:', policies.length);

            // Log first few policy IDs and phone numbers for debugging
            console.log('🔐 SAMPLE POLICIES:');
            policies.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i+1}. ID: ${p.id}, Policy: ${p.policy_number}, Phone: ${p.client_phone} (clean: ${p.client_phone?.replace(/\D/g, '') || 'N/A'})`);
            });

            // Look for the specific policy
            const targetPolicy = policies.find(p => p.policy_number === policyNumber);
            if (targetPolicy) {
                console.log('🔐 TARGET POLICY FOUND:', {
                    id: targetPolicy.id,
                    policy_number: targetPolicy.policy_number,
                    client_phone: targetPolicy.client_phone,
                    client_phone_clean: targetPolicy.client_phone?.replace(/\D/g, ''),
                    insured_name: targetPolicy.insured_name
                });
            } else {
                console.log('🔐 TARGET POLICY NOT FOUND for policy number:', policyNumber);
                console.log('🔐 Available policy numbers:', policies.map(p => p.policy_number));
            }

            const policy = policies.find(p =>
                p.policy_number === policyNumber &&
                p.client_phone.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')
            );

            console.log('🔐 AUTHENTICATION RESULT:');
            console.log('  - Policy found:', !!policy);
            console.log('  - Policy match details:', policy ? {
                id: policy.id,
                policy_number: policy.policy_number,
                client_phone: policy.client_phone,
                insured_name: policy.insured_name
            } : 'None');

            if (policy) {
                // Check if policy is active (defaults to true if not specified)
                const isActive = policy.active !== false;
                console.log('🔐 POLICY ACTIVE CHECK:', {
                    active: policy.active,
                    activeType: typeof policy.active,
                    activeValue: policy.active,
                    isActive: isActive,
                    policyObject: policy
                });

                if (!isActive) {
                    console.log('❌ AUTHENTICATION FAILED - Policy is inactive');
                    console.log('❌ BLOCKING LOGIN for policy:', policy.policy_number);
                    return {
                        success: false,
                        error: 'Your policy is currently inactive. Please contact your agent for assistance.',
                        blocked: true
                    };
                }

                console.log('✅ AUTHENTICATION SUCCESS - Policy is active and login allowed');
                return {
                    success: true,
                    user: {
                        name: policy.insured_name,
                        email: policy.client_email,
                        phone: policy.client_phone,
                        policy_number: policy.policy_number
                    },
                    policy: policy,
                    token: 'client_token_' + policy.id
                };
            }

            console.log('❌ AUTHENTICATION FAILED - No matching policy found');
            return {
                success: false,
                error: 'Invalid policy number or phone number'
            };
        } catch (error) {
            console.error('❌ Authentication error:', error);
            console.error('❌ Error stack:', error.stack);
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }

    // Get user policies
    async getUserPolicies(policyNumber) {
        try {
            const policies = await this.getAllPolicies();
            console.log('🔍 getUserPolicies: Looking for policy number:', policyNumber);
            console.log('🔍 getUserPolicies: Total policies to search:', policies.length);

            const matchingPolicies = policies.filter(p => {
                const matches = p.policy_number === policyNumber || p.id === policyNumber;
                if (matches) {
                    console.log('✅ getUserPolicies: Found matching policy:', p.policy_number || p.id);
                }
                return matches;
            });

            console.log('🔍 getUserPolicies: Found', matchingPolicies.length, 'matching policies');
            return matchingPolicies;
        } catch (error) {
            console.error('❌ Error fetching user policies:', error);
            return [];
        }
    }

    // Get policies by client ID (for CRM integration)
    async getUserPoliciesByClientId(clientId) {
        try {
            console.log('🔍 getUserPoliciesByClientId: Looking for client ID:', clientId);

            // Get all policies from the policies API
            const response = await fetch(`${this.apiBase}/api/policies`);
            const allPolicies = await response.json();
            console.log('🔍 getUserPoliciesByClientId: Found', allPolicies.length, 'total policies');

            // Filter policies that belong to this client
            const clientPolicies = allPolicies.filter(policy => {
                // Check if policy is associated with this client
                const matches = policy.clientId === clientId ||
                               policy.client_id === clientId ||
                               (policy.policies && policy.policies.some(p => p.clientId === clientId));

                if (matches) {
                    console.log('✅ getUserPoliciesByClientId: Found policy for client:', policy.policy_number || policy.policyNumber);
                }
                return matches;
            });

            console.log('🔍 getUserPoliciesByClientId: Found', clientPolicies.length, 'policies for client', clientId);
            return clientPolicies;
        } catch (error) {
            console.error('❌ Error fetching client policies:', error);
            return [];
        }
    }

    // Clear database and reinitialize
    async clearAll() {
        try {
            // Get all policies and delete them
            const policies = await this.getAllPolicies();
            for (const policy of policies) {
                await this.deletePolicy(policy.id);
            }
            console.log('🔄 Policy database cleared');
        } catch (error) {
            console.error('❌ Error clearing database:', error);
        }
    }

    // Search functionality
    async searchPolicies(searchTerm) {
        try {
            const policies = await this.getAllPolicies();
            const term = searchTerm.toLowerCase();

            return policies.filter(policy =>
                policy.policy_number.toLowerCase().includes(term) ||
                policy.insured_name.toLowerCase().includes(term) ||
                policy.client_email.toLowerCase().includes(term) ||
                policy.client_phone.includes(term) ||
                policy.carrier.toLowerCase().includes(term) ||
                policy.type.toLowerCase().includes(term)
            );
        } catch (error) {
            console.error('❌ Error searching policies:', error);
            return [];
        }
    }

    // Statistics
    async getStatistics() {
        try {
            const policies = await this.getAllPolicies();

            const totalPolicies = policies.length;
            const activePolicies = policies.filter(p => p.status === 'Active').length;
            const uniqueClients = new Set(policies.map(p => p.insured_name)).size;

            // Calculate expiring soon (next 60 days)
            const today = new Date();
            const expiringSoon = policies.filter(p => {
                const expDate = new Date(p.expiration_date);
                const diffTime = expDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 60 && diffDays >= 0;
            }).length;

            return {
                totalPolicies,
                activePolicies,
                uniqueClients,
                expiringSoon
            };
        } catch (error) {
            console.error('❌ Error getting statistics:', error);
            return {
                totalPolicies: 0,
                activePolicies: 0,
                uniqueClients: 0,
                expiringSoon: 0
            };
        }
    }

    // Refresh display (compatibility method)
    async refreshDisplay() {
        // This method exists for compatibility with existing code
        // The actual display refresh should be handled by the UI components
        console.log('🔄 Policy display refresh requested');
    }

    // Email/Password functionality - connects to CRM clients
    async checkEmailExists(email) {
        try {
            console.log('🔍 checkEmailExists: Checking email in CRM clients:', email);

            // Get clients from CRM API
            const response = await fetch(`${this.apiBase}/api/clients`);
            const data = await response.json();
            console.log('🔍 checkEmailExists: CRM response:', data);

            // Extract clients array from response
            const clients = data.clients || [];
            console.log('🔍 checkEmailExists: Found', clients.length, 'clients in CRM');

            // Check if email exists in any client record
            const emailExists = clients.some(client => {
                // Check multiple email fields that might exist
                const clientEmail = client.email || client.client_email || client.contact_email;
                const match = clientEmail && clientEmail.toLowerCase() === email.toLowerCase();
                if (match) {
                    console.log('✅ checkEmailExists: Found email match in client:', client.name || client.client_name);
                }
                return match;
            });

            console.log('🔍 checkEmailExists: Email exists in CRM:', emailExists);
            return emailExists;
        } catch (error) {
            console.error('❌ Error checking email in CRM:', error);
            return false;
        }
    }

    async checkPasswordExists(email) {
        try {
            console.log('🔍 checkPasswordExists: Checking password for email in CRM:', email);

            // Get clients from CRM API
            const response = await fetch(`${this.apiBase}/api/clients`);
            const data = await response.json();

            // Extract clients array from response
            const clients = data.clients || [];

            // Find client by email
            const client = clients.find(c => {
                const clientEmail = c.email || c.client_email || c.contact_email;
                return clientEmail && clientEmail.toLowerCase() === email.toLowerCase();
            });

            const hasPassword = client && client.password;
            console.log('🔍 checkPasswordExists: Password exists in CRM:', hasPassword);
            return hasPassword;
        } catch (error) {
            console.error('❌ Error checking password in CRM:', error);
            return false;
        }
    }

    async createPassword(email, password) {
        try {
            console.log('🔐 createPassword: Creating password for email in CRM:', email);

            // Get clients from CRM API
            const response = await fetch(`${this.apiBase}/api/clients`);
            const data = await response.json();

            // Extract clients array from response
            const clients = data.clients || [];

            // Find client by email
            const client = clients.find(c => {
                const clientEmail = c.email || c.client_email || c.contact_email;
                return clientEmail && clientEmail.toLowerCase() === email.toLowerCase();
            });

            if (!client) {
                return {
                    success: false,
                    error: 'Email not found in system'
                };
            }

            if (client.password) {
                return {
                    success: false,
                    error: 'Password already exists for this email'
                };
            }

            // Update client with password via CRM API - use POST with full client object
            const updatedClient = {
                ...client,
                password: password,
                portalPassword: password  // Sync both fields
            };

            const updateResponse = await fetch(`${this.apiBase}/api/clients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedClient)
            });

            const result = await updateResponse.json();

            if (result.success || updateResponse.ok) {
                console.log('✅ Password created successfully in CRM');
                return {
                    success: true,
                    message: 'Password created successfully'
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to save password'
                };
            }
        } catch (error) {
            console.error('❌ Error creating password in CRM:', error);
            return {
                success: false,
                error: 'System error occurred'
            };
        }
    }

    async authenticateUserByEmail(email, password) {
        try {
            console.log('🔐 authenticateUserByEmail: Starting email authentication with CRM');
            console.log('🔐 INPUT - Email:', email);

            // Get clients from CRM API
            const response = await fetch(`${this.apiBase}/api/clients`);
            const data = await response.json();

            // Extract clients array from response
            const clients = data.clients || [];

            // Find client by email
            const client = clients.find(c => {
                const clientEmail = c.email || c.client_email || c.contact_email;
                return clientEmail && clientEmail.toLowerCase() === email.toLowerCase();
            });

            if (!client) {
                console.log('❌ Email not found in CRM clients');
                return {
                    success: false,
                    error: 'Email not found in system'
                };
            }

            // Check password
            if (!client.password || client.password !== password) {
                console.log('❌ Invalid password for email');
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }

            // Check if client is active
            const isActive = client.status !== 'Inactive';
            if (!isActive) {
                return {
                    success: false,
                    error: 'Your account is currently inactive. Please contact your agent for assistance.',
                    blocked: true
                };
            }

            console.log('✅ CRM email authentication successful');
            return {
                success: true,
                user: {
                    name: client.name || client.client_name,
                    email: client.email || client.client_email || client.contact_email,
                    phone: client.phone || client.client_phone || client.contact_phone,
                    client_id: client.id
                },
                client: client,
                token: 'client_token_' + client.id
            };
        } catch (error) {
            console.error('❌ CRM email authentication error:', error);
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }
}

// Global instance
try {
    console.log('🚀 Initializing PolicyDataManager v2.0 with enhanced flattening...');
    window.policyDB = new PolicyDataManager();
    console.log('✅ Policy Data Manager initialized - Server-side storage ready');
    console.log('💾 PolicyDataManager available at window.policyDB:', !!window.policyDB);
    console.log('🔧 Policy-data.js loaded at:', new Date().toISOString());
} catch (error) {
    console.error('❌ Failed to initialize PolicyDataManager:', error);
    console.error('❌ Error stack:', error.stack);
}