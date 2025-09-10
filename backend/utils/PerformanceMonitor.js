const EventEmitter = require('events');
const os = require('os');
const { performance } = require('perf_hooks');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      sampleInterval: options.sampleInterval || 5000, // 5 seconds
      memoryThreshold: options.memoryThreshold || 0.8, // 80%
      cpuThreshold: options.cpuThreshold || 0.8, // 80%
      logLevel: options.logLevel || 'info',
      ...options
    };

    this.metrics = {
      memory: [],
      cpu: [],
      requests: new Map(),
      errors: new Map()
    };

    this.startTime = Date.now();
    this.lastCPUUsage = process.cpuUsage();
    this.lastSampleTime = performance.now();
  }

  /**
   * Start monitoring
   */
  start() {
    this.interval = setInterval(() => this.sample(), this.options.sampleInterval);
    this.emit('start');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.emit('stop');
  }

  /**
   * Take a sample of system metrics
   */
  sample() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCPUUsage);
    const now = performance.now();
    const elapsedTime = now - this.lastSampleTime;

    // Calculate CPU usage percentage
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / (elapsedTime * 1000);

    // Calculate memory usage percentage
    const totalMemory = os.totalmem();
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    const memoryPercent = usedMemory / totalMemory;

    // Store metrics
    this.metrics.memory.push({
      timestamp: Date.now(),
      used: usedMemory,
      total: totalMemory,
      percent: memoryPercent
    });

    this.metrics.cpu.push({
      timestamp: Date.now(),
      percent: cpuPercent
    });

    // Keep only last hour of metrics
    const oneHourAgo = Date.now() - 3600000;
    this.metrics.memory = this.metrics.memory.filter(m => m.timestamp > oneHourAgo);
    this.metrics.cpu = this.metrics.cpu.filter(m => m.timestamp > oneHourAgo);

    // Check thresholds
    if (memoryPercent > this.options.memoryThreshold) {
      this.emit('memory-warning', {
        used: usedMemory,
        total: totalMemory,
        percent: memoryPercent
      });
    }

    if (cpuPercent > this.options.cpuThreshold) {
      this.emit('cpu-warning', {
        percent: cpuPercent
      });
    }

    // Update last sample values
    this.lastCPUUsage = process.cpuUsage();
    this.lastSampleTime = now;

    // Emit metrics
    this.emit('sample', {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percent: memoryPercent
      },
      cpu: {
        percent: cpuPercent
      },
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  }

  /**
   * Track request timing
   */
  trackRequest(req, res, next) {
    const start = performance.now();
    const path = req.path;

    // Update request count
    const requestCount = this.metrics.requests.get(path) || 0;
    this.metrics.requests.set(path, requestCount + 1);

    // Track response time
    res.on('finish', () => {
      const duration = performance.now() - start;

      // Emit timing metric
      this.emit('request', {
        path,
        method: req.method,
        status: res.statusCode,
        duration,
        timestamp: Date.now()
      });

      // Track errors
      if (res.statusCode >= 400) {
        const errorCount = this.metrics.errors.get(path) || 0;
        this.metrics.errors.set(path, errorCount + 1);
      }
    });

    next();
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      memory: this.metrics.memory,
      cpu: this.metrics.cpu,
      requests: Object.fromEntries(this.metrics.requests),
      errors: Object.fromEntries(this.metrics.errors),
      uptime: process.uptime(),
      startTime: this.startTime
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      memory: [],
      cpu: [],
      requests: new Map(),
      errors: new Map()
    };
    this.startTime = Date.now();
    this.lastCPUUsage = process.cpuUsage();
    this.lastSampleTime = performance.now();
    this.emit('reset');
  }
}

module.exports = PerformanceMonitor;
