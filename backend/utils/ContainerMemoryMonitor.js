/**
 * Container-Aware Memory Monitor for FloWorx
 * Provides accurate memory reporting for containerized environments
 * Replaces v8 heap-only monitoring with comprehensive memory tracking
 */

const fs = require('fs');
const v8 = require('v8');
const os = require('os');
const EventEmitter = require('events');

class ContainerMemoryMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      // Thresholds (percentages)
      warningThreshold: options.warningThreshold || 70,
      criticalThreshold: options.criticalThreshold || 85,
      emergencyThreshold: options.emergencyThreshold || 95,
      
      // Monitoring intervals
      monitorInterval: options.monitorInterval || 30000, // 30 seconds
      logInterval: options.logInterval || 300000, // 5 minutes
      
      // Logging options
      enableLogging: options.enableLogging !== false,
      logLevel: options.logLevel || 'info',
      
      ...options
    };

    this.lastLogTime = 0;
    this.memoryHistory = [];
    this.maxHistorySize = 100;
    
    // Detect container environment
    this.isContainer = this.detectContainer();
    this.cgroupVersion = this.detectCgroupVersion();
    
    this.startMonitoring();
  }

  /**
   * Detect if running in a container
   */
  detectContainer() {
    try {
      // Check for container indicators
      const indicators = [
        fs.existsSync('/.dockerenv'),
        fs.existsSync('/sys/fs/cgroup/memory.max'),
        fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes'),
        process.env.KUBERNETES_SERVICE_HOST,
        process.env.DOCKER_CONTAINER_ID
      ];
      
      return indicators.some(Boolean);
    } catch {
      return false;
    }
  }

  /**
   * Detect cgroup version
   */
  detectCgroupVersion() {
    try {
      if (fs.existsSync('/sys/fs/cgroup/cgroup.controllers')) {
        return 'v2';
      } else if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
        return 'v1';
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Get container memory limit from cgroup
   */
  getCgroupMemoryLimit() {
    try {
      let limitBytes = null;
      
      if (this.cgroupVersion === 'v2') {
        // cgroup v2
        const limitStr = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
        limitBytes = limitStr === 'max' ? null : parseInt(limitStr, 10);
      } else if (this.cgroupVersion === 'v1') {
        // cgroup v1
        const limitStr = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
        const limit = parseInt(limitStr, 10);
        // cgroup v1 sometimes reports very large numbers for unlimited
        limitBytes = limit > (1024 * 1024 * 1024 * 1024) ? null : limit; // > 1TB = unlimited
      }
      
      return limitBytes;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current memory usage from cgroup
   */
  getCgroupMemoryUsage() {
    try {
      if (this.cgroupVersion === 'v2') {
        const currentStr = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim();
        return parseInt(currentStr, 10);
      } else if (this.cgroupVersion === 'v1') {
        const usageStr = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim();
        return parseInt(usageStr, 10);
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  /**
   * Get comprehensive memory statistics
   */
  getMemoryStats() {
    const timestamp = Date.now();
    
    // Node.js process memory
    const processMemory = process.memoryUsage();
    
    // V8 heap statistics
    const heapStats = v8.getHeapStatistics();
    
    // System memory
    const systemTotal = os.totalmem();
    const systemFree = os.freemem();
    const systemUsed = systemTotal - systemFree;
    
    // Container memory (if available)
    const cgroupLimit = this.getCgroupMemoryLimit();
    const cgroupUsage = this.getCgroupMemoryUsage();
    
    const stats = {
      timestamp,
      
      // Process memory (RSS = Resident Set Size - actual physical memory used)
      process: {
        rss: processMemory.rss,
        rssMB: Math.round(processMemory.rss / 1024 / 1024),
        heapUsed: processMemory.heapUsed,
        heapUsedMB: Math.round(processMemory.heapUsed / 1024 / 1024),
        heapTotal: processMemory.heapTotal,
        heapTotalMB: Math.round(processMemory.heapTotal / 1024 / 1024),
        external: processMemory.external,
        externalMB: Math.round(processMemory.external / 1024 / 1024),
        arrayBuffers: processMemory.arrayBuffers || 0
      },
      
      // V8 heap statistics
      heap: {
        totalHeapSize: heapStats.total_heap_size,
        totalHeapSizeMB: Math.round(heapStats.total_heap_size / 1024 / 1024),
        usedHeapSize: heapStats.used_heap_size,
        usedHeapSizeMB: Math.round(heapStats.used_heap_size / 1024 / 1024),
        heapSizeLimit: heapStats.heap_size_limit,
        heapSizeLimitMB: Math.round(heapStats.heap_size_limit / 1024 / 1024),
        heapUsagePercent: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 100)
      },
      
      // System memory
      system: {
        total: systemTotal,
        totalMB: Math.round(systemTotal / 1024 / 1024),
        used: systemUsed,
        usedMB: Math.round(systemUsed / 1024 / 1024),
        free: systemFree,
        freeMB: Math.round(systemFree / 1024 / 1024),
        usagePercent: Math.round((systemUsed / systemTotal) * 100)
      },
      
      // Container memory (cgroup)
      container: {
        isContainer: this.isContainer,
        cgroupVersion: this.cgroupVersion,
        limit: cgroupLimit,
        limitMB: cgroupLimit ? Math.round(cgroupLimit / 1024 / 1024) : null,
        usage: cgroupUsage,
        usageMB: cgroupUsage ? Math.round(cgroupUsage / 1024 / 1024) : null,
        usagePercent: (cgroupLimit && cgroupUsage) ? 
          Math.round((cgroupUsage / cgroupLimit) * 100) : null
      }
    };
    
    // Calculate the most relevant memory usage percentage
    stats.relevantUsage = this.getRelevantUsage(stats);
    
    return stats;
  }

  /**
   * Determine the most relevant memory usage metric
   */
  getRelevantUsage(stats) {
    // Priority: Container limit > System memory > Heap limit
    if (stats.container.usagePercent !== null) {
      return {
        type: 'container',
        percent: stats.container.usagePercent,
        used: stats.container.usageMB,
        limit: stats.container.limitMB,
        description: `Container: ${stats.container.usageMB}MB/${stats.container.limitMB}MB (${stats.container.usagePercent}%)`
      };
    } else if (stats.process.rssMB > 0) {
      const rssPercent = Math.round((stats.process.rss / stats.system.total) * 100);
      return {
        type: 'process_rss',
        percent: rssPercent,
        used: stats.process.rssMB,
        limit: stats.system.totalMB,
        description: `Process RSS: ${stats.process.rssMB}MB/${stats.system.totalMB}MB (${rssPercent}%)`
      };
    } else {
      return {
        type: 'heap',
        percent: stats.heap.heapUsagePercent,
        used: stats.heap.usedHeapSizeMB,
        limit: stats.heap.heapSizeLimitMB,
        description: `V8 Heap: ${stats.heap.usedHeapSizeMB}MB/${stats.heap.heapSizeLimitMB}MB (${stats.heap.heapUsagePercent}%)`
      };
    }
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.options.monitorInterval);

    // Initial check
    this.checkMemory();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Check memory and emit alerts if needed
   */
  checkMemory() {
    const stats = this.getMemoryStats();
    const relevantUsage = stats.relevantUsage;
    
    // Store in history
    this.memoryHistory.push({
      timestamp: stats.timestamp,
      usage: relevantUsage
    });
    
    // Trim history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Check thresholds and log/alert
    this.checkThresholds(stats, relevantUsage);
    
    // Emit metrics event
    this.emit('metrics', stats);
    
    return stats;
  }

  /**
   * Check memory thresholds and log appropriately
   */
  checkThresholds(stats, relevantUsage) {
    const now = Date.now();
    const percent = relevantUsage.percent;
    
    let logLevel = null;
    let message = null;
    let shouldLog = false;
    
    if (percent >= this.options.emergencyThreshold) {
      logLevel = 'error';
      message = `🚨 EMERGENCY: Memory usage critical at ${relevantUsage.description}`;
      shouldLog = true;
      this.emit('emergency', { stats, relevantUsage });
    } else if (percent >= this.options.criticalThreshold) {
      logLevel = 'error';
      message = `❌ CRITICAL: High memory usage at ${relevantUsage.description}`;
      shouldLog = now - this.lastLogTime > this.options.logInterval;
      this.emit('critical', { stats, relevantUsage });
    } else if (percent >= this.options.warningThreshold) {
      logLevel = 'warn';
      message = `⚠️ WARNING: Elevated memory usage at ${relevantUsage.description}`;
      shouldLog = now - this.lastLogTime > this.options.logInterval;
      this.emit('warning', { stats, relevantUsage });
    } else {
      // Normal usage - log detailed info less frequently
      if (now - this.lastLogTime > this.options.logInterval * 2) {
        logLevel = 'info';
        message = `✅ Memory usage normal: ${relevantUsage.description}`;
        shouldLog = true;
      }
    }
    
    if (shouldLog && this.options.enableLogging) {
      this.logMemoryStats(logLevel, message, stats);
      this.lastLogTime = now;
    }
  }

  /**
   * Log comprehensive memory statistics
   */
  logMemoryStats(level, message, stats) {
    const logData = {
      message,
      memory: {
        relevant: stats.relevantUsage,
        process_rss: `${stats.process.rssMB}MB`,
        heap_used: `${stats.heap.usedHeapSizeMB}MB/${stats.heap.heapSizeLimitMB}MB`,
        container: stats.container.limitMB ? 
          `${stats.container.usageMB}MB/${stats.container.limitMB}MB` : 'not_detected',
        environment: {
          is_container: stats.container.isContainer,
          cgroup_version: stats.container.cgroupVersion || 'none'
        }
      }
    };
    
    // Use console for now, can be integrated with Winston logger
    if (level === 'error') {
      console.error(JSON.stringify(logData, null, 2));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logData, null, 2));
    } else {
      console.log(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Get memory trend analysis
   */
  getMemoryTrend(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentHistory = this.memoryHistory.filter(h => h.timestamp > cutoff);
    
    if (recentHistory.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }
    
    const first = recentHistory[0].usage.percent;
    const last = recentHistory[recentHistory.length - 1].usage.percent;
    const change = last - first;
    
    let trend = 'stable';
    if (change > 5) {
      trend = 'increasing';
    } else if (change < -5) {
      trend = 'decreasing';
    }
    
    return { trend, change: Math.round(change * 10) / 10 };
  }

  /**
   * Force garbage collection if available
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Get current memory summary for health checks
   */
  getMemorySummary() {
    const stats = this.getMemoryStats();
    const trend = this.getMemoryTrend();
    
    return {
      status: stats.relevantUsage.percent < this.options.warningThreshold ? 'healthy' : 
              stats.relevantUsage.percent < this.options.criticalThreshold ? 'warning' : 'critical',
      usage: stats.relevantUsage,
      trend,
      environment: {
        container: stats.container.isContainer,
        cgroup_version: stats.container.cgroupVersion
      },
      recommendations: this.getRecommendations(stats)
    };
  }

  /**
   * Get memory optimization recommendations
   */
  getRecommendations(stats) {
    const recommendations = [];
    
    if (stats.heap.heapUsagePercent > 80) {
      recommendations.push('Consider increasing --max-old-space-size');
    }
    
    if (stats.container.isContainer && stats.container.usagePercent > 80) {
      recommendations.push('Consider increasing container memory limit');
    }
    
    if (stats.process.rssMB > stats.heap.heapSizeLimitMB * 2) {
      recommendations.push('High RSS vs heap ratio - check for memory leaks');
    }
    
    return recommendations;
  }
}

module.exports = ContainerMemoryMonitor;
