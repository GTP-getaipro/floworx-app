import axios from 'axios';
import { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
  });
  const [_refreshInterval, setRefreshInterval] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/analytics/dashboard`, {
        params: dateRange,
        headers: { Authorization: `Bearer ${token}` },
      });

      setDashboardData(response.data.dashboard);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateRange]);

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderMetricCard = (title, value, subtitle, trend, icon) => (
    <div className='metric-card'>
      <div className='metric-header'>
        <div className='metric-icon'>{icon}</div>
        <div className='metric-info'>
          <h3>{title}</h3>
          <div className='metric-value'>{value}</div>
          {subtitle && <div className='metric-subtitle'>{subtitle}</div>}
        </div>
      </div>
      {trend && (
        <div className={`metric-trend ${trend.direction}`}>
          <span className='trend-arrow'>{trend.direction === 'up' ? '↗' : '↘'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );

  const renderFunnelChart = funnel => (
    <div className='funnel-chart'>
      <h3>Onboarding Funnel</h3>
      <div className='funnel-steps'>
        {funnel.map((step, _index) => {
          const width = Math.max((step.completions / funnel[0]?.completions) * 100 || 0, 10);
          return (
            <div key={step.step} className='funnel-step'>
              <div className='step-info'>
                <div className='step-name'>{step.step.replace('-', ' ').toUpperCase()}</div>
                <div className='step-stats'>
                  <span className='completions'>{step.completions} users</span>
                  <span className='conversion-rate'>{step.conversionRate}% conversion</span>
                  <span className='avg-duration'>Avg: {step.averageDuration}</span>
                </div>
              </div>
              <div className='funnel-bar'>
                <div className='funnel-fill' style={{ width: `${width}%` }} />
              </div>
              {step.dropOffs > 0 && <div className='drop-offs'>{step.dropOffs} drop-offs</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFailureAnalysis = failures => (
    <div className='failure-analysis'>
      <h3>Common Failure Points</h3>
      <div className='failure-list'>
        {failures.map((failure, index) => (
          <div key={index} className='failure-item'>
            <div className='failure-step'>{failure.step.replace('-', ' ').toUpperCase()}</div>
            <div className='failure-stats'>
              <span className='failure-count'>{failure.count} failures</span>
              <span className='failure-percentage'>{failure.percentage}%</span>
            </div>
            <div className='failure-bar'>
              <div className='failure-fill' style={{ width: `${failure.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRealTimeMetrics = realtime => (
    <div className='realtime-metrics'>
      <h3>Real-Time Activity</h3>
      <div className='realtime-grid'>
        <div className='realtime-period'>
          <h4>Last Hour</h4>
          <div className='realtime-stats'>
            <div className='stat'>
              <span className='stat-label'>Started</span>
              <span className='stat-value'>{realtime.lastHour.started}</span>
            </div>
            <div className='stat'>
              <span className='stat-label'>Completed</span>
              <span className='stat-value'>{realtime.lastHour.completed}</span>
            </div>
            <div className='stat'>
              <span className='stat-label'>Success Rate</span>
              <span className='stat-value'>{realtime.lastHour.completionRate}%</span>
            </div>
          </div>
        </div>

        <div className='realtime-period'>
          <h4>Last 24 Hours</h4>
          <div className='realtime-stats'>
            <div className='stat'>
              <span className='stat-label'>Started</span>
              <span className='stat-value'>{realtime.last24Hours.started}</span>
            </div>
            <div className='stat'>
              <span className='stat-label'>Completed</span>
              <span className='stat-value'>{realtime.last24Hours.completed}</span>
            </div>
            <div className='stat'>
              <span className='stat-label'>Success Rate</span>
              <span className='stat-value'>{realtime.last24Hours.completionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !dashboardData) {
    return (
      <div className='analytics-dashboard loading'>
        <div className='loading-spinner' />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='analytics-dashboard error'>
        <div className='error-message'>
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className='retry-button'>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { funnel, conversion, behavior, realtime } = dashboardData || {};

  return (
    <div className='analytics-dashboard'>
      <div className='dashboard-header'>
        <h1>Onboarding Analytics Dashboard</h1>
        <div className='dashboard-controls'>
          <div className='date-range-picker'>
            <label>
              From:
              <input
                type='date'
                value={dateRange.startDate}
                onChange={e => handleDateRangeChange('startDate', e.target.value)}
              />
            </label>
            <label>
              To:
              <input
                type='date'
                value={dateRange.endDate}
                onChange={e => handleDateRangeChange('endDate', e.target.value)}
              />
            </label>
          </div>
          <button onClick={fetchDashboardData} className='refresh-button'>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className='dashboard-content'>
        {/* Key Metrics */}
        <div className='metrics-grid'>
          {conversion && (
            <>
              {renderMetricCard(
                'Completion Rate',
                `${conversion.completionRate}%`,
                `${conversion.completed} of ${conversion.started} users`,
                null,
                '✅'
              )}
              {renderMetricCard(
                'Conversion Rate',
                `${conversion.conversionRate}%`,
                `${conversion.converted} converted users`,
                null,
                '💰'
              )}
            </>
          )}

          {behavior && (
            <>
              {renderMetricCard(
                'Avg. Completion Time',
                behavior.averageCompletionTime.formatted,
                `${behavior.completedUsers} completed users`,
                null,
                '⏱️'
              )}
              {renderMetricCard(
                'Median Time',
                behavior.medianCompletionTime.formatted,
                'Typical user experience',
                null,
                '📊'
              )}
            </>
          )}
        </div>

        {/* Real-time Metrics */}
        {realtime && renderRealTimeMetrics(realtime)}

        {/* Funnel Analysis */}
        {funnel && renderFunnelChart(funnel)}

        {/* Failure Analysis */}
        {behavior &&
          behavior.commonFailurePoints &&
          behavior.commonFailurePoints.length > 0 &&
          renderFailureAnalysis(behavior.commonFailurePoints)}

        {/* Browser/Device Analytics */}
        {behavior && behavior.topUserAgents && (
          <div className='device-analytics'>
            <h3>Top Browsers</h3>
            <div className='browser-list'>
              {behavior.topUserAgents.map((browser, index) => (
                <div key={index} className='browser-item'>
                  <span className='browser-name'>{browser.userAgent}</span>
                  <span className='browser-count'>{browser.count} users</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='dashboard-footer'>
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p>Auto-refresh: Every 5 minutes</p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
