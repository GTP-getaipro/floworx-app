import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const EmailAutomationSettings = ({ clientId }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (clientId) {
      loadConfig();
    }
  }, [clientId]);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await apiService.getClientConfig(clientId);
      if (result.success) {
        setConfig(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiService.updateClientConfig(clientId, config);
      if (result.success) {
        setSuccess('Configuration saved successfully!');
        // Reload to get updated version
        await loadConfig();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleProvision = async () => {
    setProvisioning(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiService.provisionClient(clientId);
      if (result.success) {
        setSuccess('Email provisioning completed successfully!');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to provision email infrastructure');
    } finally {
      setProvisioning(false);
    }
  };

  const handleRedeploy = async () => {
    setRedeploying(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiService.redeployClient(clientId);
      if (result.success) {
        setSuccess('Workflow redeployed successfully!');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to redeploy workflow');
    } finally {
      setRedeploying(false);
    }
  };

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const addManager = () => {
    const newManagers = [...(config.people?.managers || []), { name: '', email: '' }];
    updateConfig('people.managers', newManagers);
  };

  const updateManager = (index, field, value) => {
    const newManagers = [...(config.people?.managers || [])];
    newManagers[index] = { ...newManagers[index], [field]: value };
    updateConfig('people.managers', newManagers);
  };

  const removeManager = (index) => {
    const newManagers = (config.people?.managers || []).filter((_, i) => i !== index);
    updateConfig('people.managers', newManagers);
  };

  const addSupplier = () => {
    const newSuppliers = [...(config.suppliers || []), { name: '', domains: [''] }];
    updateConfig('suppliers', newSuppliers);
  };

  const updateSupplier = (index, field, value) => {
    const newSuppliers = [...(config.suppliers || [])];
    newSuppliers[index] = { ...newSuppliers[index], [field]: value };
    updateConfig('suppliers', newSuppliers);
  };

  const removeSupplier = (index) => {
    const newSuppliers = (config.suppliers || []).filter((_, i) => i !== index);
    updateConfig('suppliers', newSuppliers);
  };

  const updateSupplierDomain = (supplierIndex, domainIndex, value) => {
    const newSuppliers = [...(config.suppliers || [])];
    const newDomains = [...(newSuppliers[supplierIndex]?.domains || [])];
    newDomains[domainIndex] = value;
    newSuppliers[supplierIndex] = { ...newSuppliers[supplierIndex], domains: newDomains };
    updateConfig('suppliers', newSuppliers);
  };

  const addSupplierDomain = (supplierIndex) => {
    const newSuppliers = [...(config.suppliers || [])];
    const newDomains = [...(newSuppliers[supplierIndex]?.domains || []), ''];
    newSuppliers[supplierIndex] = { ...newSuppliers[supplierIndex], domains: newDomains };
    updateConfig('suppliers', newSuppliers);
  };

  const removeSupplierDomain = (supplierIndex, domainIndex) => {
    const newSuppliers = [...(config.suppliers || [])];
    const newDomains = (newSuppliers[supplierIndex]?.domains || []).filter((_, i) => i !== domainIndex);
    newSuppliers[supplierIndex] = { ...newSuppliers[supplierIndex], domains: newDomains };
    updateConfig('suppliers', newSuppliers);
  };

  const updateLabelMap = (key, value) => {
    const newLabelMap = { ...(config.channels?.email?.label_map || {}) };
    newLabelMap[key] = value;
    updateConfig('channels.email.label_map', newLabelMap);
  };

  const addLabelMapping = () => {
    const newLabelMap = { ...(config.channels?.email?.label_map || {}), '': '' };
    updateConfig('channels.email.label_map', newLabelMap);
  };

  const removeLabelMapping = (key) => {
    const newLabelMap = { ...(config.channels?.email?.label_map || {}) };
    delete newLabelMap[key];
    updateConfig('channels.email.label_map', newLabelMap);
  };

  if (loading) {
    return (
      <div className="email-automation-settings">
        <div className="loading">⏳ Loading configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="email-automation-settings">
        <div className="error">❌ Failed to load configuration</div>
      </div>
    );
  }

  const isAiLocked = config.ai?.locked === true;

  return (
    <div className="email-automation-settings">
      <div className="settings-header">
        <h1>📧 Email Automation Settings</h1>
        <p>Configure your email automation preferences and business information</p>
        {isAiLocked && (
          <div className="ai-locked-indicator">
            🔒 AI settings are locked and managed by the system
          </div>
        )}
      </div>

      {error && (
        <div className="message error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="message success">
          ✅ {success}
        </div>
      )}

      <div className="settings-sections">
        {/* Managers Section */}
        <section className="settings-section">
          <h3>👥 Managers</h3>
          <p className="section-description">Add team members who will receive notifications and manage responses</p>
          
          {(config.people?.managers || []).map((manager, index) => (
            <div key={index} className="manager-item">
              <input
                type="text"
                placeholder="Manager Name"
                value={manager.name || ''}
                onChange={(e) => updateManager(index, 'name', e.target.value)}
                className="manager-name"
              />
              <input
                type="email"
                placeholder="manager@company.com"
                value={manager.email || ''}
                onChange={(e) => updateManager(index, 'email', e.target.value)}
                className="manager-email"
              />
              <button
                type="button"
                onClick={() => removeManager(index)}
                className="btn remove-btn"
                title="Remove Manager"
              >
                🗑️
              </button>
            </div>
          ))}
          
          <button type="button" onClick={addManager} className="btn add-btn">
            ➕ Add Manager
          </button>
        </section>

        {/* Suppliers Section */}
        <section className="settings-section">
          <h3>🏪 Suppliers</h3>
          <p className="section-description">Configure supplier information for automatic email classification</p>
          
          {(config.suppliers || []).map((supplier, supplierIndex) => (
            <div key={supplierIndex} className="supplier-item">
              <div className="supplier-header">
                <input
                  type="text"
                  placeholder="Supplier Name"
                  value={supplier.name || ''}
                  onChange={(e) => updateSupplier(supplierIndex, 'name', e.target.value)}
                  className="supplier-name"
                />
                <button
                  type="button"
                  onClick={() => removeSupplier(supplierIndex)}
                  className="btn remove-btn"
                  title="Remove Supplier"
                >
                  🗑️
                </button>
              </div>
              
              <div className="supplier-domains">
                <label>Email Domains:</label>
                {(supplier.domains || []).map((domain, domainIndex) => (
                  <div key={domainIndex} className="domain-item">
                    <input
                      type="text"
                      placeholder="example.com"
                      value={domain}
                      onChange={(e) => updateSupplierDomain(supplierIndex, domainIndex, e.target.value)}
                      className="domain-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeSupplierDomain(supplierIndex, domainIndex)}
                      className="btn remove-btn small"
                      title="Remove Domain"
                    >
                      ❌
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSupplierDomain(supplierIndex)}
                  className="btn add-btn small"
                >
                  ➕ Add Domain
                </button>
              </div>
            </div>
          ))}
          
          <button type="button" onClick={addSupplier} className="btn add-btn">
            ➕ Add Supplier
          </button>
        </section>

        {/* Label Map Section */}
        <section className="settings-section">
          <h3>🏷️ Label Mapping</h3>
          <p className="section-description">Map email categories to your Gmail labels or Outlook folders</p>

          {Object.entries(config.channels?.email?.label_map || {}).map(([key, value]) => (
            <div key={key} className="label-mapping-item">
              <input
                type="text"
                placeholder="Category"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  const newLabelMap = { ...(config.channels?.email?.label_map || {}) };
                  delete newLabelMap[key];
                  if (newKey) newLabelMap[newKey] = value;
                  updateConfig('channels.email.label_map', newLabelMap);
                }}
                className="label-key"
              />
              <span className="arrow">→</span>
              <input
                type="text"
                placeholder="Label/Folder Name"
                value={value}
                onChange={(e) => updateLabelMap(key, e.target.value)}
                className="label-value"
              />
              <button
                type="button"
                onClick={() => removeLabelMapping(key)}
                className="btn remove-btn"
                title="Remove Mapping"
              >
                🗑️
              </button>
            </div>
          ))}

          <button type="button" onClick={addLabelMapping} className="btn add-btn">
            ➕ Add Label Mapping
          </button>
        </section>

        {/* Signature Section */}
        <section className="settings-section">
          <h3>✍️ Email Signature</h3>
          <p className="section-description">Configure how signatures are added to automated email responses</p>

          <div className="signature-options">
            <label className="radio-label">
              <input
                type="radio"
                name="signature-mode"
                value="default"
                checked={config.signature?.mode === 'default'}
                onChange={(e) => updateConfig('signature.mode', e.target.value)}
              />
              <span className="radio-text">Default Signature</span>
              <p className="option-description">Use the standard company signature</p>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="signature-mode"
                value="custom"
                checked={config.signature?.mode === 'custom'}
                onChange={(e) => updateConfig('signature.mode', e.target.value)}
              />
              <span className="radio-text">Custom Signature</span>
              <p className="option-description">Use a custom signature text</p>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="signature-mode"
                value="none"
                checked={config.signature?.mode === 'none'}
                onChange={(e) => updateConfig('signature.mode', e.target.value)}
              />
              <span className="radio-text">No Signature</span>
              <p className="option-description">Do not append any signature</p>
            </label>
          </div>

          {config.signature?.mode === 'custom' && (
            <div className="custom-signature">
              <label htmlFor="custom-signature-text">Custom Signature Text:</label>
              <textarea
                id="custom-signature-text"
                placeholder="Enter your custom signature..."
                value={config.signature?.custom_text || ''}
                onChange={(e) => updateConfig('signature.custom_text', e.target.value)}
                rows={4}
                className="signature-textarea"
              />
            </div>
          )}
        </section>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn primary"
        >
          {saving ? '⏳ Saving...' : '💾 Save Configuration'}
        </button>

        <button
          onClick={handleProvision}
          disabled={provisioning}
          className="btn secondary"
        >
          {provisioning ? '⏳ Provisioning...' : '🏗️ Provision Email'}
        </button>

        <button
          onClick={handleRedeploy}
          disabled={redeploying}
          className="btn secondary"
        >
          {redeploying ? '⏳ Redeploying...' : '🚀 Redeploy Workflow'}
        </button>
      </div>

      <style jsx="true">{`
        .email-automation-settings {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .settings-header {
          margin-bottom: 2rem;
        }

        .settings-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .settings-header p {
          color: #666;
          margin-bottom: 1rem;
        }

        .ai-locked-indicator {
          background: #fff3cd;
          color: #856404;
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid #ffeaa7;
          font-size: 0.9rem;
        }

        .loading, .error {
          text-align: center;
          padding: 2rem;
          font-size: 1.1rem;
        }

        .message {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .settings-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 1px solid #e9ecef;
        }

        .settings-section h3 {
          margin-bottom: 0.5rem;
          color: #333;
          font-size: 1.3rem;
        }

        .section-description {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }

        .manager-item, .supplier-item, .label-mapping-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .supplier-item {
          flex-direction: column;
          align-items: stretch;
        }

        .supplier-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .supplier-domains {
          margin-left: 1rem;
        }

        .supplier-domains label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #555;
        }

        .domain-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .manager-name, .manager-email, .supplier-name, .domain-input, .label-key, .label-value {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .manager-name, .supplier-name {
          flex: 1;
        }

        .manager-email {
          flex: 1.5;
        }

        .domain-input, .label-key, .label-value {
          flex: 1;
        }

        .arrow {
          color: #666;
          font-weight: bold;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #667eea;
          color: white;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        .btn.primary:hover:not(:disabled) {
          background: #5a6fd8;
        }

        .btn.secondary {
          background: #6c757d;
          color: white;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        .btn.secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn.add-btn {
          background: #28a745;
          color: white;
        }

        .btn.add-btn:hover:not(:disabled) {
          background: #218838;
        }

        .btn.add-btn.small {
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }

        .btn.remove-btn {
          background: #dc3545;
          color: white;
          padding: 0.25rem 0.5rem;
        }

        .btn.remove-btn:hover:not(:disabled) {
          background: #c82333;
        }

        .btn.remove-btn.small {
          padding: 0.2rem 0.4rem;
          font-size: 0.7rem;
        }

        .signature-options {
          margin-bottom: 1rem;
        }

        .radio-label {
          display: block;
          margin-bottom: 1rem;
          cursor: pointer;
        }

        .radio-label input[type="radio"] {
          margin-right: 0.5rem;
        }

        .radio-text {
          font-weight: 500;
          color: #333;
        }

        .option-description {
          color: #666;
          font-size: 0.85rem;
          margin: 0.25rem 0 0 1.5rem;
        }

        .custom-signature {
          margin-top: 1rem;
        }

        .custom-signature label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .signature-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.9rem;
          resize: vertical;
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .email-automation-settings {
            padding: 1rem;
          }

          .manager-item, .label-mapping-item {
            flex-direction: column;
            align-items: stretch;
          }

          .settings-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default EmailAutomationSettings;
