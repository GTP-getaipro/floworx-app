# 🔧 FloWorx Logging System Upgrade Guide

## 🎯 **PROBLEM SOLVED: Container Memory Monitoring**

**Issue**: FloWorx was using v8 heap statistics that only reported ~57MB instead of actual container memory (1GB)
**Solution**: Implemented container-aware memory monitoring with cgroup v2/v1 support
**Result**: Accurate memory reporting for containerized environments

---

## 🚀 **NEW FEATURES IMPLEMENTED**

### **✅ Container-Aware Memory Monitor**
- **Cgroup v2/v1 Support**: Reads actual container limits from `/sys/fs/cgroup/memory.max`
- **Multi-Level Monitoring**: Process RSS, V8 heap, system memory, and container limits
- **Intelligent Reporting**: Automatically selects most relevant memory metric
- **Trend Analysis**: 5-minute memory usage trend tracking
- **Emergency Actions**: Automatic garbage collection on critical usage

### **✅ Enhanced Logging Infrastructure**
- **Structured Logging**: JSON-formatted logs with comprehensive context
- **Memory Context**: Every log entry includes current memory status
- **Event-Driven Alerts**: Memory threshold events integrated with Winston
- **Health Check Integration**: Memory status available via `/api/health/memory`

---

## 📊 **BEFORE vs AFTER COMPARISON**

### **❌ BEFORE (Inaccurate)**
```javascript
// Old v8-only monitoring
const memUsage = process.memoryUsage();
const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
console.log(`Memory: ${heapUsedMB}MB/${heapTotalMB}MB`); // Only ~57MB limit!
```

### **✅ AFTER (Container-Aware)**
```javascript
// New container-aware monitoring
const stats = memoryMonitor.getMemoryStats();
console.log(`Container: ${stats.container.usageMB}MB/${stats.container.limitMB}MB`); // Real 1GB limit!
console.log(`Process RSS: ${stats.process.rssMB}MB`); // Actual memory used
console.log(`V8 Heap: ${stats.heap.usedHeapSizeMB}MB/${stats.heap.heapSizeLimitMB}MB`); // Heap details
```

---

## 🔍 **MEMORY MONITORING HIERARCHY**

The new system intelligently selects the most relevant memory metric:

1. **Container Memory** (Highest Priority)
   - Source: `/sys/fs/cgroup/memory.max` (cgroup v2) or `/sys/fs/cgroup/memory/memory.limit_in_bytes` (cgroup v1)
   - Shows: Actual container limit (1GB in your case)
   - Best for: Production containerized environments

2. **Process RSS** (Medium Priority)
   - Source: `process.memoryUsage().rss`
   - Shows: Real physical memory used by Node.js process
   - Best for: Understanding actual memory consumption

3. **V8 Heap** (Fallback)
   - Source: `v8.getHeapStatistics()`
   - Shows: JavaScript heap usage
   - Best for: Development and heap-specific debugging

---

## 🛠️ **CONFIGURATION OPTIONS**

### **Environment Variables**
```bash
# Memory monitoring thresholds (percentages)
MEMORY_WARNING_THRESHOLD=70
MEMORY_CRITICAL_THRESHOLD=85
MEMORY_EMERGENCY_THRESHOLD=95

# Monitoring intervals (milliseconds)
MEMORY_MONITOR_INTERVAL=30000
MEMORY_LOG_INTERVAL=300000

# Node.js heap size (if needed)
NODE_OPTIONS=--max-old-space-size=1024
```

### **Logger Configuration**
```javascript
const logger = new Logger({
  enableMemoryMonitoring: true, // Enable container-aware monitoring
  level: 'info',
  logDir: 'logs'
});
```

---

## 📊 **NEW HEALTH CHECK ENDPOINTS**

### **Memory Health Check**
```bash
curl https://app.floworx-iq.com/api/health/memory
```

**Response Example**:
```json
{
  "status": "healthy",
  "service": "memory",
  "usage": {
    "type": "container",
    "percent": 45,
    "used": 450,
    "limit": 1024,
    "description": "Container: 450MB/1024MB (45%)"
  },
  "trend": {
    "trend": "stable",
    "change": 2.1
  },
  "details": {
    "environment": {
      "container": true,
      "cgroup_version": "v2"
    },
    "memory_breakdown": {
      "process_rss": "380MB",
      "heap_used": "120MB",
      "heap_limit": "1024MB",
      "container_limit": "1024MB",
      "system_total": "2048MB"
    },
    "recommendations": []
  }
}
```

---

## 🚨 **ALERT LEVELS & ACTIONS**

### **Warning (70%)**
- **Action**: Log warning message
- **Frequency**: Every 5 minutes
- **Impact**: Monitoring only

### **Critical (85%)**
- **Action**: Error logging + alerts
- **Frequency**: Every 5 minutes
- **Impact**: Consider scaling

### **Emergency (95%)**
- **Action**: Immediate logging + force GC
- **Frequency**: Every occurrence
- **Impact**: System may become unstable

---

## 🔧 **DEPLOYMENT STEPS**

### **1. Update Environment Variables**
Add to your Coolify environment:
```bash
NODE_OPTIONS=--max-old-space-size=1024
MEMORY_WARNING_THRESHOLD=70
MEMORY_CRITICAL_THRESHOLD=85
MEMORY_EMERGENCY_THRESHOLD=95
```

### **2. Test Memory Monitoring**
```bash
# Test memory health endpoint
curl https://app.floworx-iq.com/api/health/memory

# Check logs for container detection
tail -f logs/app.log | grep "memory monitoring initialized"
```

### **3. Verify Container Detection**
Look for log entries like:
```json
{
  "message": "Container-aware memory monitoring initialized",
  "container": true,
  "cgroup_version": "v2",
  "thresholds": {
    "warning": 70,
    "critical": 85,
    "emergency": 95
  }
}
```

---

## 📈 **EXPECTED IMPROVEMENTS**

### **✅ Accurate Memory Reporting**
- Before: "High memory usage 53/57 MB" (misleading)
- After: "Container: 450MB/1024MB (45%)" (accurate)

### **✅ Better Alerting**
- Container-aware thresholds
- Trend analysis
- Intelligent recommendations

### **✅ Enhanced Debugging**
- Multi-level memory breakdown
- Container environment detection
- Comprehensive health checks

---

## 🎯 **NEXT STEPS**

1. **Deploy Updates**: Push the logging improvements to production
2. **Monitor Logs**: Watch for accurate container memory reporting
3. **Set Alerts**: Configure monitoring based on new memory metrics
4. **Optimize**: Use insights to right-size container resources

---

## 📞 **TROUBLESHOOTING**

### **If Container Not Detected**
- Check if `/sys/fs/cgroup/memory.max` exists
- Verify cgroup v2 is enabled
- Look for "container: false" in logs

### **If Memory Limits Show as Unlimited**
- Container may not have memory limits set
- Check Coolify resource limits
- Fallback to process RSS monitoring

---

**🎉 Result: FloWorx now has production-ready, container-aware memory monitoring with accurate reporting!**
