# nomad-client
Full HTTP API support for HashiCorp Nomad
# 🚀 Nomad TypeScript Client

A comprehensive, robust, and type-safe **HashiCorp Nomad** client for TypeScript/Node.js applications. Built following **SOLID principles** and modern design patterns, providing an intuitive API to interact with all Nomad resources.

[![npm version](https://badge.fury.io/js/nomad-client.svg)](https://badge.fury.io/js/nomad-client)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- **🎯 Type-Safe**: Complete TypeScript interfaces for the entire Nomad API
- **🏗️ SOLID Architecture**: Extensible, testable, and maintainable codebase
- **🔐 Advanced Authentication**: Multiple auth methods (Token, Bearer, mTLS) with validation
- **📁 Configuration Loaders**: Native support for HCL, JSON, and YAML formats
- **🔧 Provider Pattern**: Unified interface for all Nomad modules
- **📊 Complete Modules**: Jobs, Tasks, Allocations, Namespaces, Nodes, Node Pools
- **🛡️ Robust Error Handling**: Comprehensive error management and validation
- **⚡ Optimized Performance**: High-performance HTTP client with TLS support
- **📝 Comprehensive Documentation**: Practical examples and complete API reference

---

## 📦 Installation

### Using npm
```bash
npm install nomad-client
```

### Using yarn
```bash
yarn add nomad-client
```

### Using pnpm
```bash
pnpm add nomad-client
```

## 🔧 Prerequisites

- **Node.js**: 14.x or higher
- **TypeScript**: 4.0+ (recommended 4.5+)
- **HashiCorp Nomad**: 1.0+ (tested with 1.4+)

---

## 🚀 Quick Start

### Basic Configuration

```typescript
import { NomadProvider } from 'nomad-client';

// Create provider instance
const nomad = new NomadProvider({
    baseUrl: 'http://localhost:4646',
    token: process.env.NOMAD_TOKEN,
    namespace: 'default'
});

// Test connectivity
const isConnected = await nomad.ping();
console.log('Connected:', isConnected);
```

### Authentication Methods

The client supports multiple authentication methods according to HashiCorp Nomad documentation:

#### Token Authentication (Recommended)
```typescript
const nomad = new NomadProvider({
    baseUrl: 'https://nomad.example.com:4646',
    token: '550e8400-e29b-41d4-a716-446655440000',
    authMethod: 'token' // Uses X-Nomad-Token header (default)
});
```

#### Bearer Authentication
```typescript
const nomad = new NomadProvider({
    baseUrl: 'https://nomad.example.com:4646',
    token: '550e8400-e29b-41d4-a716-446655440000',
    authMethod: 'bearer' // Uses Authorization: Bearer header
});
```

#### Mutual TLS (mTLS)
```typescript
const nomad = new NomadProvider({
    baseUrl: 'https://nomad.example.com:4646',
    authMethod: 'mtls',
    tls: {
        caCertPath: '/etc/nomad/certs/ca.pem',
        clientCertPath: '/etc/nomad/certs/client.pem',
        clientKeyPath: '/etc/nomad/certs/client.key'
    }
});
```

#### Environment Variables
```bash
export NOMAD_ADDR="https://nomad.example.com:4646"
export NOMAD_TOKEN="550e8400-e29b-41d4-a716-446655440000"
export NOMAD_NAMESPACE="production"
export NOMAD_REGION="us-west-1"
```

```typescript
// Auto-configured from environment variables
const nomad = new NomadProvider();
```

### Job Management

```typescript
// Define job specification
const jobSpec = {
    ID: 'my-web-app',
    Name: 'My Web Application',
    Type: 'service',
    Datacenters: ['dc1'],
    TaskGroups: [{
        Name: 'web',
        Count: 3,
        Tasks: [{
            Name: 'nginx',
            Driver: 'docker',
            Config: {
                image: 'nginx:alpine',
                port_map: { http: 80 }
            },
            Resources: {
                CPU: 100,
                MemoryMB: 128,
                DiskMB: 300
            }
        }]
    }]
};

// Deploy job
const result = await nomad.jobs.create(jobSpec);
console.log('Job created:', result.EvalID);

// Wait for deployment completion
const success = await nomad.deployAndWait(jobSpec, 120000);
console.log('Deployment success:', success);

// Get job status
const status = await nomad.jobs.get('my-web-app');
console.log('Status:', status.Status);

// Scale job
await nomad.jobs.scale('my-web-app', 'web', 5);

// Stop job
await nomad.jobs.stop('my-web-app');
```

### Allocation Monitoring

```typescript
// List job allocations
const allocations = await nomad.jobs.allocations('my-web-app');

for (const alloc of allocations) {
    console.log(`Allocation: ${alloc.ID}`);
    console.log(`Status: ${alloc.ClientStatus}`);
    
    // Get task logs
    const logs = await nomad.tasks.getLogs(alloc.ID, 'nginx');
    console.log('Logs:', logs.stdout);
    
    // Get resource metrics
    const stats = await nomad.tasks.getStats(alloc.ID, 'nginx');
    console.log(`CPU: ${stats.ResourceUsage.CPU.Percent}%`);
    
    // Health check
    const isHealthy = await nomad.allocations.isHealthy(alloc.ID);
    console.log(`Healthy: ${isHealthy}`);
}

// Stream logs in real-time
const stopStreaming = await nomad.tasks.streamLogs(
    'alloc-id',
    'nginx',
    'stdout',
    (data) => console.log('LIVE LOG:', data)
);

// Stop streaming after 30 seconds
setTimeout(() => stopStreaming(), 30000);
```

### Configuration Loading

```typescript
import { LoaderFactory } from 'nomad-client';

// Load job from HCL file
const hclLoader = LoaderFactory.getLoader('hcl');
const jobConfig = await hclLoader.load('./my-job.hcl');

// Load from JSON
const jsonLoader = LoaderFactory.getLoader('json');
const jobConfig2 = await jsonLoader.load('./my-job.json');

// Auto-detection by file extension
const autoLoader = LoaderFactory.getLoaderForFile('./my-job.nomad');
const jobConfig3 = await autoLoader.load('./my-job.nomad');

// Parse and validate HCL content
const validatedJob = await nomad.jobs.parseAndValidateHCL(hclContent);

// Validate job specification
const validation = await nomad.jobs.validate({ Job: jobSpec });
if (validation.Valid) {
    console.log('Job specification is valid');
} else {
    console.error('Validation errors:', validation.ValidationErrors);
}
```

---

## 📚 API Reference

### 💼 Jobs Module (`nomad.jobs`)

Complete job lifecycle management with validation, parsing, and monitoring capabilities.

```typescript
// CRUD Operations
await nomad.jobs.list();                    // List all jobs
await nomad.jobs.get('job-id');             // Get specific job
await nomad.jobs.create(jobSpec);           // Create new job
await nomad.jobs.update(jobSpec);           // Update existing job  
await nomad.jobs.delete('job-id');          // Delete job

// Validation & Parsing
await nomad.jobs.parse({ JobHCL: hclString }); // Parse HCL/JSON content
await nomad.jobs.validate({ Job: jobSpec }); // Validate job specification
await nomad.jobs.parseAndValidateHCL(hclContent); // Parse + validate HCL

// Job Operations
await nomad.jobs.plan(jobSpec);             // Plan job deployment
await nomad.jobs.stop('job-id');            // Stop running job
await nomad.jobs.restart('job-id');         // Restart job
await nomad.jobs.scale('job-id', 'web', 5); // Scale task group
await nomad.jobs.dispatch('job-id', payload); // Dispatch parameterized job

// Periodic Jobs
await nomad.jobs.periodicInfo('job-id');    // Get periodic job info
await nomad.jobs.periodicForce('job-id');   // Force periodic job run

// Monitoring & Health
await nomad.jobs.summary('job-id');         // Job summary
await nomad.jobs.versions('job-id');        // Job versions
await nomad.jobs.allocations('job-id');     // Job allocations
await nomad.jobs.evaluations('job-id');     // Job evaluations
await nomad.jobs.deployments('job-id');     // Job deployments
await nomad.jobs.isHealthy('job-id');       // Health status check
await nomad.jobs.getJobInfo('job-id');      // Complete job information

// Version Control
await nomad.jobs.revert('job-id', version); // Revert to specific version
await nomad.jobs.stable('job-id', version); // Mark version as stable
```

### 📦 Allocations Module (`nomad.allocations`)

Comprehensive allocation management with real-time monitoring and control capabilities.

```typescript
// Management Operations
await nomad.allocations.list();                    // List all allocations
await nomad.allocations.list({ job: 'my-job' });   // Filter by job
await nomad.allocations.get('alloc-id');           // Get specific allocation
await nomad.allocations.stop('alloc-id');          // Stop allocation
await nomad.allocations.restart('alloc-id');       // Restart allocation

// Monitoring & Health
await nomad.allocations.stats('alloc-id');         // Raw resource statistics
await nomad.allocations.getFormattedStats('alloc-id'); // Formatted statistics
await nomad.allocations.isHealthy('alloc-id');     // Health check
await nomad.allocations.getSummary('alloc-id');    // Allocation summary

// Logs & Streaming
await nomad.allocations.logs('alloc-id', { task: 'web' }); // Raw log access
await nomad.allocations.getSimpleLogs('alloc-id', 'web', 'stdout'); // Simple log retrieval
const stopStream = await nomad.allocations.streamLogs(
    'alloc-id', 'web', 'stdout', 
    (data) => console.log(data)
); // Real-time log streaming

// Execution Operations
await nomad.allocations.exec('alloc-id', { Task: 'web', Command: ['ls'] }); // Execute command
await nomad.allocations.executeCommand('alloc-id', 'web', ['ls', '-la']); // Simple command execution
await nomad.allocations.signal('alloc-id', { Task: 'web', Signal: 'SIGUSR1' }); // Send signal

// Status & Synchronization
await nomad.allocations.waitForStatus('alloc-id', 'running', 30000); // Wait for status
await nomad.allocations.services('alloc-id');      // List allocation services
```

### 🔧 Tasks Module (`nomad.tasks`)

Task-level operations for fine-grained control and monitoring.

```typescript
// Task Monitoring
await nomad.tasks.getLogs('alloc-id', 'task-name');    // Get task logs
await nomad.tasks.getStats('alloc-id', 'task-name');   // Resource statistics
await nomad.tasks.getStatus('alloc-id', 'task-name');  // Task status

// Task Operations
await nomad.tasks.restart('alloc-id', 'task-name');    // Restart specific task
await nomad.tasks.signal('alloc-id', 'task-name', 'SIGTERM'); // Send signal to task
await nomad.tasks.exec('alloc-id', 'task-name', ['ps', 'aux']); // Execute command in task

// Real-time Streaming
const stopStreaming = await nomad.tasks.streamLogs(
    'alloc-id', 
    'task-name', 
    'stdout',               // 'stdout' or 'stderr'
    (data) => console.log(data)
);

// Stop streaming when done
setTimeout(() => stopStreaming(), 60000);
```

### 📁 Namespaces Module (`nomad.namespaces`)

Multi-tenancy support with namespace management and resource isolation.

```typescript
// CRUD Operations
await nomad.namespaces.list();              // List all namespaces
await nomad.namespaces.get('namespace');    // Get specific namespace
await nomad.namespaces.create({             // Create new namespace
    Name: 'production',
    Description: 'Production environment',
    Quota: 'prod-quota'                     // Optional resource quota
});
await nomad.namespaces.delete('namespace'); // Delete namespace

// Utility Operations
await nomad.namespaces.exists('namespace'); // Check if namespace exists
await nomad.namespaces.getJobs('namespace'); // Get jobs in namespace
await nomad.namespaces.getUsageStats('namespace'); // Resource usage statistics

// Example: Environment-based namespace setup
const environments = ['development', 'staging', 'production'];
for (const env of environments) {
    if (!await nomad.namespaces.exists(env)) {
        await nomad.namespaces.create({
            Name: env,
            Description: `${env.charAt(0).toUpperCase() + env.slice(1)} environment`
        });
    }
}
```

### 🖥️ Nodes Module (`nomad.nodes`)

Complete cluster infrastructure management with advanced drain operations and analytics.

```typescript
// Node Management
await nomad.nodes.list();                   // List all cluster nodes
await nomad.nodes.list({ resources: true }); // Include resource information
await nomad.nodes.get('node-id');           // Get specific node details
await nomad.nodes.purge('node-id');         // Remove node (use with caution!)

// Monitoring & Statistics
await nomad.nodes.stats('node-id');         // Detailed node statistics
await nomad.nodes.allocations('node-id');   // Allocations running on node
await nomad.nodes.isNodeHealthy('node-id'); // Health status check
await nomad.nodes.getNodeSummary('node-id'); // Complete node summary

// Drain Management
await nomad.nodes.drain('node-id', {        // Configure node drain
    DrainSpec: {
        Deadline: 1800000000000,            // 30 minutes in nanoseconds
        IgnoreSystemJobs: false
    }
});
await nomad.nodes.drainSafely('node-id', 30); // Safe drain (30 min timeout)
await nomad.nodes.cancelDrain('node-id');    // Cancel active drain

// Node Eligibility
await nomad.nodes.markIneligible('node-id'); // Mark node as ineligible for scheduling
await nomad.nodes.markEligible('node-id');   // Mark node as eligible for scheduling
await nomad.nodes.toggleEligibility('node-id'); // Toggle eligibility status

// Cluster Analytics
await nomad.nodes.getClusterStats();        // Cluster-wide statistics
await nomad.nodes.getHealthyNodes();        // List of healthy nodes
await nomad.nodes.getNodesByClass('gpu');   // Filter nodes by node class
await nomad.nodes.getNodesByPool('prod');   // Filter nodes by node pool

// Example: Cluster maintenance workflow
async function performMaintenanceCheck() {
    const clusterStats = await nomad.nodes.getClusterStats();
    console.log(`Cluster: ${clusterStats.totalNodes} nodes, ${clusterStats.healthyNodes} healthy`);
    
    const nodes = await nomad.nodes.list({ resources: true });
    for (const node of nodes) {
        const isHealthy = await nomad.nodes.isNodeHealthy(node.ID);
        if (!isHealthy) {
            console.log(`⚠️ Node ${node.Name} requires attention`);
            await nomad.nodes.drainSafely(node.ID, 30);
        }
    }
}
```

### 🏊‍♂️ Node Pools Module (`nomad.nodePools`)

Advanced node pool management for multi-tenancy, resource allocation, and workload organization.

```typescript
// CRUD Operations
await nomad.nodePools.list();               // List all node pools
await nomad.nodePools.get('pool-name');     // Get specific node pool
await nomad.nodePools.create({              // Create custom node pool
    Name: 'production',
    Description: 'Production workload pool',
    Meta: {
        'environment': 'prod',
        'tier': 'critical'
    }
});
await nomad.nodePools.update('pool-name', { // Update pool configuration
    Description: 'Updated pool description'
});
await nomad.nodePools.delete('pool-name');  // Delete node pool

// Specialized Pool Creation
await nomad.nodePools.createHAPool(         // High availability pool
    'ha-production',
    'HA pool for critical production workloads'
);
await nomad.nodePools.createDensePool(      // High density pool
    'development',
    'Development and testing pool',
    true                                    // Enable memory oversubscription
);
await nomad.nodePools.createWithScheduler(  // Custom scheduler configuration
    'gpu-workloads',
    'GPU-optimized workload pool',
    {
        SchedulerAlgorithm: 'spread',
        MemoryOversubscriptionEnabled: false
    }
);

// Analytics & Monitoring
await nomad.nodePools.getPoolUtilization('prod'); // Pool resource utilization
await nomad.nodePools.getPoolsOverview();   // Overview of all pools
await nomad.nodePools.getNodesInPool('prod'); // Nodes assigned to pool
await nomad.nodePools.getJobsInPool('prod'); // Jobs running in pool

// Pool Resource Management
await nomad.nodePools.listNodes('pool-name'); // List pool nodes
await nomad.nodePools.listJobs('pool-name');  // List pool jobs

// Example: Environment-based pool setup
async function setupEnvironmentPools() {
    const pools = [
        { name: 'production', description: 'Production workloads', ha: true },
        { name: 'staging', description: 'Staging environment', ha: false },
        { name: 'development', description: 'Development workloads', dense: true }
    ];
    
    for (const pool of pools) {
        const exists = await nomad.nodePools.get(pool.name).catch(() => null);
        if (!exists) {
            if (pool.ha) {
                await nomad.nodePools.createHAPool(pool.name, pool.description);
            } else if (pool.dense) {
                await nomad.nodePools.createDensePool(pool.name, pool.description, true);
            } else {
                await nomad.nodePools.create({
                    Name: pool.name,
                    Description: pool.description
                });
            }
            console.log(`✅ Created pool: ${pool.name}`);
        }
    }
}
```

---

## 🔧 Advanced Configuration

### TLS/SSL Configuration

```typescript
// Production TLS setup with certificates
const nomad = new NomadProvider({
    baseUrl: 'https://nomad.example.com:4646',
    token: 'secure-token',
    tls: {
        caCertPath: '/etc/nomad/certs/ca.pem',
        clientCertPath: '/etc/nomad/certs/client.pem',
        clientKeyPath: '/etc/nomad/certs/client.key'
    }
});

// mTLS authentication (no token required)
const nomadMTLS = new NomadProvider({
    baseUrl: 'https://nomad.example.com:4646',
    authMethod: 'mtls',
    tls: {
        caCertPath: '/etc/nomad/certs/ca.pem',
        clientCertPath: '/etc/nomad/certs/client.pem',
        clientKeyPath: '/etc/nomad/certs/client.key'
    }
});
```

### Development Configuration

```typescript
// Insecure configuration for development
const nomadDev = new NomadProvider({
    baseUrl: 'https://nomad-dev:4646',
    token: 'dev-token',
    isTLSInsecure: true,  // Skip certificate validation
    namespace: 'development'
});
```

### Timeouts and HTTP Configuration

```typescript
const nomad = new NomadProvider({
    baseUrl: 'http://nomad:4646',
    token: 'my-token',
    timeout: 60000,       // 60 seconds timeout
    namespace: 'production',
    region: 'us-west-1'
});
```

### Factory Pattern Usage

```typescript
import { NomadHttpClientFactory } from 'nomad-client';

// Create HTTP client with Bearer authentication
const httpClient = NomadHttpClientFactory.createWithBearer(
    'https://nomad.example.com:4646',
    'bearer-token-here'
);

// Create client with full authentication configuration
const httpClient2 = NomadHttpClientFactory.createWithAuth(
    'https://nomad.example.com:4646',
    'auth-token',
    'token',        // auth method: 'token' | 'bearer' | 'mtls'
    'production',   // namespace
    'us-west-1'     // region
);
```

---

## 📊 Monitoring and Observability

### Health Checks and Status

```typescript
// Cluster health verification
const health = await nomad.healthCheck();
console.log('Cluster healthy:', health.healthy);
console.log('Issues:', health.issues);

// Cluster information
const info = await nomad.getClusterInfo();
console.log('Nomad version:', info.version);
console.log('Region:', info.region);
console.log('Datacenter:', info.datacenter);

// Simple connectivity test
const isConnected = await nomad.ping();
console.log('Connection status:', isConnected);
```

### Metrics and Statistics

```typescript
// Cluster-wide metrics
const metrics = await nomad.getMetrics();
console.log('Resource utilization:', metrics);

// Detailed cluster status
const status = await nomad.getStatus();
console.log('Leader:', status.leader);
console.log('Servers:', status.servers.length);
console.log('Clients:', status.clients.length);

// Node pool statistics
const poolStats = await nomad.nodePools.getPoolsOverview();
console.log('Pools:', poolStats.pools.length);

// Job health monitoring
const jobHealth = await nomad.jobs.isHealthy('my-job');
console.log('Job is healthy:', jobHealth);
```

### Real-time Monitoring Setup

```typescript
async function setupMonitoring() {
    // Monitor job deployments
    const deployments = await nomad.jobs.deployments('web-app');
    for (const deployment of deployments) {
        if (deployment.Status === 'running') {
            console.log(`Deployment ${deployment.ID} is active`);
        }
    }
    
    // Monitor allocation health
    const allocations = await nomad.jobs.allocations('web-app');
    const healthyAllocs = [];
    
    for (const alloc of allocations) {
        const isHealthy = await nomad.allocations.isHealthy(alloc.ID);
        if (isHealthy) {
            healthyAllocs.push(alloc);
        } else {
            console.log(`⚠️ Allocation ${alloc.ID} is unhealthy`);
        }
    }
    
    console.log(`${healthyAllocs.length}/${allocations.length} allocations are healthy`);
}
```

---

## 🎯 Production Examples

### Complete Deployment with Monitoring

```typescript
async function deployWithMonitoring() {
    const nomad = new NomadProvider({
        baseUrl: process.env.NOMAD_ADDR,
        token: process.env.NOMAD_TOKEN,
        namespace: process.env.NOMAD_NAMESPACE
    });
    
    // 1. Validate job specification
    const validation = await nomad.jobs.validate({ Job: jobSpec });
    if (!validation.Valid) {
        console.error('Job validation failed:', validation.ValidationErrors);
        return;
    }
    
    // 2. Plan deployment
    const plan = await nomad.jobs.plan(jobSpec);
    console.log(`Deployment will create ${plan.CreatedIndex} allocations`);
    
    // 3. Deploy and wait for completion
    const result = await nomad.deployAndWait(jobSpec, 300000);
    
    if (result.success) {
        console.log('✅ Deployment completed successfully!');
        
        // 4. Monitor allocation health
        for (const alloc of result.allocations || []) {
            const isHealthy = await nomad.allocations.isHealthy(alloc.ID);
            const stats = await nomad.allocations.getFormattedStats(alloc.ID);
            
            console.log(`Allocation ${alloc.ID}: ${isHealthy ? '✅' : '❌'}`);
            console.log(`  CPU: ${stats.cpu}%, Memory: ${stats.memory}%`);
        }
        
        // 5. Stream logs for monitoring
        const runningAlloc = result.allocations?.find(a => a.ClientStatus === 'running');
        if (runningAlloc) {
            const stopLogging = await nomad.tasks.streamLogs(
                runningAlloc.ID,
                'app',
                'stdout',
                (data) => console.log('APP LOG:', data)
            );
            
            // Stop logging after 5 minutes
            setTimeout(stopLogging, 300000);
        }
    } else {
        console.error('❌ Deployment failed:', result.error);
    }
}
```

### Auto-scaling Implementation

```typescript
interface ScalingConfig {
    minInstances: number;
    maxInstances: number;
    cpuThreshold: number;
    memoryThreshold: number;
    scaleUpBy: number;
    scaleDownBy: number;
}

async function autoScale(jobId: string, taskGroup: string, config: ScalingConfig) {
    const nomad = new NomadProvider();
    
    // Get current allocations and metrics
    const allocations = await nomad.jobs.allocations(jobId);
    const runningAllocs = allocations.filter(a => a.ClientStatus === 'running');
    const currentCount = runningAllocs.length;
    
    console.log(`Current running instances: ${currentCount}`);
    
    // Calculate resource utilization
    let totalCPU = 0;
    let totalMemory = 0;
    let healthyInstances = 0;
    
    for (const alloc of runningAllocs) {
        const isHealthy = await nomad.allocations.isHealthy(alloc.ID);
        if (isHealthy) {
            const stats = await nomad.allocations.getFormattedStats(alloc.ID);
            totalCPU += stats.cpuPercent || 0;
            totalMemory += stats.memoryPercent || 0;
            healthyInstances++;
        }
    }
    
    if (healthyInstances === 0) {
        console.log('⚠️ No healthy instances found, skipping scaling');
        return;
    }
    
    const avgCPU = totalCPU / healthyInstances;
    const avgMemory = totalMemory / healthyInstances;
    
    console.log(`Average CPU: ${avgCPU.toFixed(1)}%, Memory: ${avgMemory.toFixed(1)}%`);
    
    // Determine scaling action
    let newCount = currentCount;
    
    if (avgCPU > config.cpuThreshold || avgMemory > config.memoryThreshold) {
        // Scale up
        newCount = Math.min(currentCount + config.scaleUpBy, config.maxInstances);
        console.log(`🔼 Scaling up due to high resource usage`);
    } else if (avgCPU < config.cpuThreshold * 0.5 && avgMemory < config.memoryThreshold * 0.5) {
        // Scale down (only when both CPU and memory are low)
        newCount = Math.max(currentCount - config.scaleDownBy, config.minInstances);
        console.log(`🔽 Scaling down due to low resource usage`);
    }
    
    if (newCount !== currentCount) {
        console.log(`Scaling from ${currentCount} to ${newCount} instances`);
        
        try {
            await nomad.jobs.scale(jobId, taskGroup, newCount);
            console.log(`✅ Successfully scaled ${jobId} to ${newCount} instances`);
        } catch (error) {
            console.error(`❌ Failed to scale ${jobId}:`, error);
        }
    } else {
        console.log('No scaling action needed');
    }
}

// Usage example
const scalingConfig: ScalingConfig = {
    minInstances: 2,
    maxInstances: 10,
    cpuThreshold: 75,
    memoryThreshold: 80,
    scaleUpBy: 2,
    scaleDownBy: 1
};

// Run auto-scaling every 5 minutes
setInterval(() => {
    autoScale('web-app', 'web', scalingConfig);
}, 300000);
```

### Cluster Management and Health Monitoring

```typescript
interface ClusterHealthReport {
    totalNodes: number;
    healthyNodes: number;
    drainingNodes: number;
    ineligibleNodes: number;
    issues: Array<{
        nodeId: string;
        nodeName: string;
        issue: string;
        severity: 'warning' | 'critical';
    }>;
}

async function comprehensiveClusterCheck(): Promise<ClusterHealthReport> {
    const nomad = new NomadProvider();
    
    // 1. Get cluster overview
    const clusterStats = await nomad.nodes.getClusterStats();
    console.log(`\n📊 Cluster Overview:`);
    console.log(`  Total nodes: ${clusterStats.totalNodes}`);
    console.log(`  Healthy nodes: ${clusterStats.healthyNodes}`);
    
    const report: ClusterHealthReport = {
        totalNodes: clusterStats.totalNodes,
        healthyNodes: clusterStats.healthyNodes,
        drainingNodes: 0,
        ineligibleNodes: 0,
        issues: []
    };
    
    // 2. Detailed node analysis
    const nodes = await nomad.nodes.list({ resources: true });
    console.log(`\n🔍 Node Health Analysis:`);
    
    for (const node of nodes) {
        const isHealthy = await nomad.nodes.isNodeHealthy(node.ID);
        const nodeDetails = await nomad.nodes.get(node.ID);
        
        // Track node states
        if (nodeDetails.Drain) report.drainingNodes++;
        if (nodeDetails.SchedulingEligibility === 'ineligible') report.ineligibleNodes++;
        
        if (!isHealthy) {
            console.log(`  ⚠️ Node ${node.Name} (${node.ID.slice(0, 8)}) - UNHEALTHY`);
            
            report.issues.push({
                nodeId: node.ID,
                nodeName: node.Name,
                issue: 'Node health check failed',
                severity: 'critical'
            });
            
            // Check if we should drain the node
            const allocations = await nomad.nodes.allocations(node.ID);
            const runningAllocs = allocations.filter(a => a.ClientStatus === 'running');
            
            if (runningAllocs.length > 0 && !nodeDetails.Drain) {
                console.log(`    🚰 Initiating safe drain (${runningAllocs.length} allocations)`);
                await nomad.nodes.drainSafely(node.ID, 30); // 30 min deadline
            }
        } else {
            console.log(`  ✅ Node ${node.Name} (${node.ID.slice(0, 8)}) - HEALTHY`);
        }
    }
    
    // 3. Node pool balancing
    console.log(`\n🏊‍♂️ Node Pool Analysis:`);
    const poolsOverview = await nomad.nodePools.getPoolsOverview();
    
    for (const pool of poolsOverview.pools) {
        const utilization = await nomad.nodePools.getPoolUtilization(pool.name);
        console.log(`  Pool ${pool.name}:`);
        console.log(`    Nodes: ${pool.nodeCount}`);
        console.log(`    CPU utilization: ${utilization.capacityUtilization.cpu.toFixed(1)}%`);
        console.log(`    Memory utilization: ${utilization.capacityUtilization.memory.toFixed(1)}%`);
        
        // Alert on high utilization
        if (utilization.capacityUtilization.cpu > 85) {
            report.issues.push({
                nodeId: '',
                nodeName: pool.name,
                issue: `High CPU utilization in pool: ${utilization.capacityUtilization.cpu.toFixed(1)}%`,
                severity: 'warning'
            });
        }
    }
    
    // 4. Auto-create HA pool if production is under-provisioned
    const prodNodes = await nomad.nodes.getNodesByPool('production');
    if (prodNodes.length < 3) {
        console.log(`\n⚡ Creating HA pool for production (only ${prodNodes.length} nodes)`);
        
        try {
            await nomad.nodePools.createHAPool(
                'production-ha',
                'High availability pool for critical production workloads'
            );
            console.log('✅ HA production pool created successfully');
        } catch (error) {
            console.log('⚠️ HA pool already exists or creation failed');
        }
    }
    
    // 5. Generate summary
    console.log(`\n📋 Health Report Summary:`);
    console.log(`  Healthy: ${report.healthyNodes}/${report.totalNodes} nodes`);
    console.log(`  Draining: ${report.drainingNodes} nodes`);
    console.log(`  Ineligible: ${report.ineligibleNodes} nodes`);
    console.log(`  Issues found: ${report.issues.length}`);
    
    report.issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`    ${icon} ${issue.issue}`);
    });
    
    return report;
}

// Schedule regular cluster health checks
setInterval(async () => {
    console.log(`\n🔄 Starting scheduled cluster health check - ${new Date().toISOString()}`);
    await comprehensiveClusterCheck();
}, 600000); // Every 10 minutes
```

### Advanced Pool Analytics and Capacity Management

```typescript
interface PoolAnalytics {
    name: string;
    nodeCount: number;
    jobCount: number;
    utilization: {
        cpu: number;
        memory: number;
        disk: number;
    };
    recommendations: string[];
    status: 'healthy' | 'warning' | 'critical';
}

async function advancedPoolAnalytics(): Promise<PoolAnalytics[]> {
    const nomad = new NomadProvider();
    const results: PoolAnalytics[] = [];
    
    // Get comprehensive pool overview
    const overview = await nomad.nodePools.getPoolsOverview();
    console.log('📊 Advanced Pool Analytics Report:');
    console.log('=' .repeat(50));
    
    for (const pool of overview.pools) {
        console.log(`\n🏊‍♂️ Analyzing Pool: ${pool.name}`);
        
        // Get detailed utilization metrics
        const utilization = await nomad.nodePools.getPoolUtilization(pool.name);
        const nodes = await nomad.nodePools.getNodesInPool(pool.name);
        const jobs = await nomad.nodePools.getJobsInPool(pool.name);
        
        const analytics: PoolAnalytics = {
            name: pool.name,
            nodeCount: nodes.length,
            jobCount: jobs.length,
            utilization: {
                cpu: utilization.capacityUtilization.cpu,
                memory: utilization.capacityUtilization.memory,
                disk: utilization.capacityUtilization.disk
            },
            recommendations: [],
            status: 'healthy'
        };
        
        // Resource utilization analysis
        console.log(`  📈 Resource Utilization:`);
        console.log(`    CPU: ${analytics.utilization.cpu.toFixed(1)}%`);
        console.log(`    Memory: ${analytics.utilization.memory.toFixed(1)}%`);
        console.log(`    Disk: ${analytics.utilization.disk.toFixed(1)}%`);
        console.log(`  📊 Workload Distribution:`);
        console.log(`    Active Nodes: ${analytics.nodeCount}`);
        console.log(`    Running Jobs: ${analytics.jobCount}`);
        
        // Generate recommendations and status
        if (analytics.utilization.cpu > 90 || analytics.utilization.memory > 90) {
            analytics.status = 'critical';
            analytics.recommendations.push('Immediate capacity expansion required');
            
            // Auto-create overflow pool for critical pools
            if (pool.name === 'production') {
                console.log(`  🚨 CRITICAL: Creating emergency overflow pool`);
                try {
                    await nomad.nodePools.createDensePool(
                        `${pool.name}-emergency`,
                        `Emergency overflow pool for ${pool.name}`,
                        true // Enable memory oversubscription for emergency capacity
                    );
                    console.log(`  ✅ Emergency pool created: ${pool.name}-emergency`);
                } catch (error) {
                    console.log(`  ⚠️ Emergency pool creation failed: ${error}`);
                }
            }
        } else if (analytics.utilization.cpu > 75 || analytics.utilization.memory > 80) {
            analytics.status = 'warning';
            analytics.recommendations.push('Consider adding more nodes to this pool');
            
            if (analytics.utilization.cpu > 85) {
                console.log(`  ⚠️ High CPU utilization - consider scaling`);
            }
            if (analytics.utilization.memory > 85) {
                console.log(`  ⚠️ High memory utilization - monitor closely`);
            }
        } else if (analytics.utilization.cpu < 25 && analytics.utilization.memory < 30) {
            analytics.recommendations.push('Pool may be over-provisioned');
            console.log(`  💡 Low utilization - consider consolidating workloads`);
        }
        
        // Node health analysis within pool
        let healthyNodes = 0;
        for (const node of nodes) {
            const isHealthy = await nomad.nodes.isNodeHealthy(node.ID);
            if (isHealthy) healthyNodes++;
        }
        
        const healthRatio = healthyNodes / nodes.length;
        console.log(`  🏥 Node Health: ${healthyNodes}/${nodes.length} (${(healthRatio * 100).toFixed(1)}%)`);
        
        if (healthRatio < 0.8) {
            analytics.status = 'critical';
            analytics.recommendations.push('Multiple unhealthy nodes detected');
        } else if (healthRatio < 0.9) {
            analytics.status = 'warning';
            analytics.recommendations.push('Some nodes require attention');
        }
        
        // Display recommendations
        if (analytics.recommendations.length > 0) {
            console.log(`  💡 Recommendations:`);
            analytics.recommendations.forEach(rec => 
                console.log(`    - ${rec}`)
            );
        }
        
        // Status indicator
        const statusIcon = {
            healthy: '✅',
            warning: '⚠️',
            critical: '🚨'
        }[analytics.status];
        
        console.log(`  ${statusIcon} Pool Status: ${analytics.status.toUpperCase()}`);
        
        results.push(analytics);
    }
    
    // Generate executive summary
    console.log(`\n📋 Executive Summary:`);
    console.log('=' .repeat(30));
    
    const healthyPools = results.filter(p => p.status === 'healthy').length;
    const warningPools = results.filter(p => p.status === 'warning').length;
    const criticalPools = results.filter(p => p.status === 'critical').length;
    
    console.log(`Total Pools: ${results.length}`);
    console.log(`✅ Healthy: ${healthyPools}`);
    console.log(`⚠️ Warning: ${warningPools}`);
    console.log(`🚨 Critical: ${criticalPools}`);
    
    const totalNodes = results.reduce((sum, p) => sum + p.nodeCount, 0);
    const totalJobs = results.reduce((sum, p) => sum + p.jobCount, 0);
    const avgCPU = results.reduce((sum, p) => sum + p.utilization.cpu, 0) / results.length;
    
    console.log(`\nCluster Totals:`);
    console.log(`  Nodes: ${totalNodes}`);
    console.log(`  Jobs: ${totalJobs}`);
    console.log(`  Average CPU: ${avgCPU.toFixed(1)}%`);
    
    return results;
}

// Schedule pool analytics every 15 minutes
setInterval(async () => {
    console.log(`\n🔍 Running scheduled pool analytics - ${new Date().toISOString()}`);
    await advancedPoolAnalytics();
}, 900000);
```

---

## 🏗️ Architecture

### SOLID Principles Implementation

- **Single Responsibility**: Each module has a specific, well-defined responsibility
- **Open/Closed**: Extensible through interfaces and factory patterns
- **Liskov Substitution**: All implementations are interchangeable via interfaces
- **Interface Segregation**: Small, focused interfaces prevent unnecessary dependencies
- **Dependency Inversion**: Dependencies are injected abstractions, not concrete implementations

### Project Structure

```
src/
├── modules/                    # Core Nomad API modules
│   ├── job.ts                 # Job lifecycle management
│   ├── allocations.ts         # Allocation monitoring & control
│   ├── task.ts                # Task-level operations
│   ├── namespaces.ts          # Multi-tenancy support
│   ├── nodes.ts               # Cluster node management
│   └── provider.ts            # Main provider interface
├── core/                      # Core infrastructure
│   └── http/                  # HTTP client implementation
│       ├── HttpClient.ts      # Base HTTP client
│       ├── index.ts           # HTTP exports
│       └── factories/         # Client factory patterns
│           └── NomadHttpClientFactory.ts
├── config/                    # Configuration management
│   └── NomadConfig.ts         # Authentication & config
├── types/                     # TypeScript definitions
│   ├── common.ts              # Shared types
│   ├── job.ts                 # Job-specific types
│   └── index.ts               # Type exports
├── data-loaders/              # Configuration loaders
│   ├── hcl-loader.ts          # HCL file support
│   ├── json-loader.ts         # JSON configuration
│   └── yaml-loader.ts         # YAML configuration
└── examples/                  # Usage examples
    └── authentication-examples.ts
```

### Design Patterns Used

- **Provider Pattern**: Unified interface for all Nomad operations
- **Factory Pattern**: HTTP client creation with different auth methods
- **Singleton Pattern**: Configuration manager instance
- **Strategy Pattern**: Multiple authentication strategies (Token, Bearer, mTLS)
- **Observer Pattern**: Real-time log streaming with callbacks

---

## 🧪 Testing

### Unit Testing Setup

```typescript
import { NomadProvider } from 'nomad-client';
import { jest } from '@jest/globals';

// Test configuration
const testConfig = {
    baseUrl: 'http://localhost:4646',
    token: 'test-token',
    namespace: 'test'
};

const testNomad = new NomadProvider(testConfig);

// Mock HTTP client for unit tests
const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    stream: jest.fn()
};

// Example unit test
describe('NomadProvider', () => {
    let nomad: NomadProvider;
    
    beforeEach(() => {
        nomad = new NomadProvider(testConfig);
        // Replace internal httpClient with mock
        (nomad as any).httpClient = mockHttpClient;
    });
    
    it('should create a job successfully', async () => {
        const mockResponse = { EvalID: 'eval-123' };
        mockHttpClient.post.mockResolvedValue({ data: mockResponse });
        
        const jobSpec = { ID: 'test-job', Type: 'service' };
        const result = await nomad.jobs.create(jobSpec);
        
        expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/jobs', jobSpec);
        expect(result.EvalID).toBe('eval-123');
    });
});
```

### Integration Testing

```typescript
import { NomadProvider } from 'nomad-client';

describe('Nomad Integration Tests', () => {
    let nomad: NomadProvider;
    
    beforeAll(() => {
        // Use actual Nomad instance (requires running Nomad)
        nomad = new NomadProvider({
            baseUrl: process.env.NOMAD_ADDR || 'http://localhost:4646',
            token: process.env.NOMAD_TOKEN
        });
    });
    
    it('should connect to Nomad cluster', async () => {
        const connected = await nomad.ping();
        expect(connected).toBe(true);
    });
    
    it('should list jobs', async () => {
        const jobs = await nomad.jobs.list();
        expect(Array.isArray(jobs)).toBe(true);
    });
});
```

### Test Coverage

The library maintains high test coverage across all modules:

- **Jobs Module**: 91.51% coverage
- **Allocations Module**: 91.3% coverage  
- **Tasks Module**: 97.33% coverage
- **Client Module**: 92.06% coverage
- **Nodes Module**: 94.56% coverage
- **Authentication**: 100% coverage

Run tests with:
```bash
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
npm run test:watch         # Watch mode for development
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
   ```bash
   git fork https://github.com/your-org/nomad-client
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/awesome-new-feature
   ```

3. **Make Your Changes**
   - Follow TypeScript and ESLint conventions
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Commit and Push**
   ```bash
   git commit -am 'feat: add awesome new feature'
   git push origin feature/awesome-new-feature
   ```

6. **Open a Pull Request**
   - Provide clear description of changes
   - Include test coverage information
   - Reference any related issues

### Development Setup

```bash
# Clone and setup
git clone https://github.com/your-org/nomad-client
cd nomad-client
npm install

# Run tests
npm test

# Build library
npm run build

# Start development mode
npm run dev
```

---

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

This project is licensed under the MIT License, which means you can use, modify, and distribute it freely for both commercial and non-commercial purposes.

---

## 🔗 Documentation Links

### Official HashiCorp Resources
- [HashiCorp Nomad Documentation](https://developer.hashicorp.com/nomad/docs)
- [Nomad API Reference](https://developer.hashicorp.com/nomad/api-docs)
- [Nomad Tutorials](https://developer.hashicorp.com/nomad/tutorials)
- [Nomad Community](https://discuss.hashicorp.com/c/nomad)

### Library Resources
- [Complete Examples](./examples/)
- [Authentication Guide](./docs/AUTHENTICATION_IMPROVEMENTS.md)
- [Change Log](./CHANGELOG.md)
- [API Documentation](./docs/API.md)

---

## 💡 Support & Community

### Getting Help
- � **Bug Reports**: [GitHub Issues](https://github.com/your-org/nomad-client/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-org/nomad-client/discussions)
- 📚 **Documentation**: [GitHub Wiki](https://github.com/your-org/nomad-client/wiki)
- 💌 **Email**: support@nomad-client.dev

### Community Guidelines
- Be respectful and inclusive
- Search existing issues before creating new ones
- Provide minimal reproducible examples for bugs
- Follow our [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## 🏆 Acknowledgments

- **HashiCorp Team** - For creating and maintaining Nomad
- **TypeScript Community** - For excellent tooling and ecosystem
- **Contributors** - Everyone who has contributed to this project

---

## 📊 Project Status

[![npm version](https://badge.fury.io/js/nomad-client.svg)](https://npmjs.com/package/nomad-client)
[![Build Status](https://github.com/your-org/nomad-client/workflows/CI/badge.svg)](https://github.com/your-org/nomad-client/actions)
[![Test Coverage](https://codecov.io/gh/your-org/nomad-client/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/nomad-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Built with ❤️ for the HashiCorp Nomad community**
