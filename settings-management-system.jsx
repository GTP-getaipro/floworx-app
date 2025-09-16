/**
 * Settings Management System
 * Allows clients to modify managers, suppliers, and business rules
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Modal, Badge, ListGroup } from 'react-bootstrap';

export const SettingsManagement = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/client-dashboard/current-settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      setError('Failed to load current settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/client-dashboard/update-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Settings updated successfully! Redeploy your automation to apply changes.');
        setHasChanges(false);
      } else {
        setError(data.message || 'Failed to update settings');
      }
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccess(null);
  };

  if (loading) return <div>Loading settings...</div>;
  if (!settings) return <div>Error loading settings</div>;

  return (
    <div className="settings-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>⚙️ Automation Settings</h2>
        <div>
          {hasChanges && (
            <Badge bg="warning" className="me-2">Unsaved Changes</Badge>
          )}
          <Button 
            variant="primary" 
            onClick={handleSaveSettings}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="row">
        <div className="col-md-6">
          <ManagersSettings 
            managers={settings.managers || []}
            onChange={(managers) => updateSettings('managers', managers)}
          />
        </div>
        <div className="col-md-6">
          <SuppliersSettings 
            suppliers={settings.suppliers || []}
            onChange={(suppliers) => updateSettings('suppliers', suppliers)}
          />
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <EmailCategoriesSettings 
            categories={settings.emailCategories || []}
            onChange={(categories) => updateSettings('emailCategories', categories)}
          />
        </div>
        <div className="col-md-6">
          <BusinessRulesSettings 
            rules={settings.businessRules || {}}
            onChange={(rules) => updateSettings('businessRules', rules)}
          />
        </div>
      </div>
    </div>
  );
};

// Managers Settings Component
const ManagersSettings = ({ managers, onChange }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newManager, setNewManager] = useState({ name: '', email: '', role: '' });

  const addManager = () => {
    if (newManager.name && newManager.email) {
      onChange([...managers, { ...newManager, id: Date.now() }]);
      setNewManager({ name: '', email: '', role: '' });
      setShowAddModal(false);
    }
  };

  const removeManager = (id) => {
    onChange(managers.filter(m => m.id !== id));
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5>👥 Managers</h5>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          + Add Manager
        </Button>
      </Card.Header>
      <Card.Body>
        {managers.length === 0 ? (
          <p className="text-muted">No managers configured</p>
        ) : (
          <ListGroup variant="flush">
            {managers.map((manager) => (
              <ListGroup.Item key={manager.id} className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{manager.name}</strong>
                  <br />
                  <small className="text-muted">{manager.email}</small>
                  {manager.role && <Badge bg="secondary" className="ms-2">{manager.role}</Badge>}
                </div>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => removeManager(manager.id)}
                >
                  Remove
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Add New Manager</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  value={newManager.name}
                  onChange={(e) => setNewManager({...newManager, name: e.target.value})}
                  placeholder="Manager name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={newManager.email}
                  onChange={(e) => setNewManager({...newManager, email: e.target.value})}
                  placeholder="manager@company.com"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Role (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={newManager.role}
                  onChange={(e) => setNewManager({...newManager, role: e.target.value})}
                  placeholder="Sales Manager, Service Manager, etc."
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addManager}>
              Add Manager
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

// Suppliers Settings Component
const SuppliersSettings = ({ suppliers, onChange }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', category: '' });

  const addSupplier = () => {
    if (newSupplier.name && newSupplier.email) {
      onChange([...suppliers, { ...newSupplier, id: Date.now() }]);
      setNewSupplier({ name: '', email: '', category: '' });
      setShowAddModal(false);
    }
  };

  const removeSupplier = (id) => {
    onChange(suppliers.filter(s => s.id !== id));
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5>🏭 Suppliers</h5>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          + Add Supplier
        </Button>
      </Card.Header>
      <Card.Body>
        {suppliers.length === 0 ? (
          <p className="text-muted">No suppliers configured</p>
        ) : (
          <ListGroup variant="flush">
            {suppliers.map((supplier) => (
              <ListGroup.Item key={supplier.id} className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{supplier.name}</strong>
                  <br />
                  <small className="text-muted">{supplier.email}</small>
                  {supplier.category && <Badge bg="info" className="ms-2">{supplier.category}</Badge>}
                </div>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => removeSupplier(supplier.id)}
                >
                  Remove
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Add New Supplier</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Supplier Name</Form.Label>
                <Form.Control
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  placeholder="Supplier company name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                  placeholder="supplier@company.com"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Category (Optional)</Form.Label>
                <Form.Select
                  value={newSupplier.category}
                  onChange={(e) => setNewSupplier({...newSupplier, category: e.target.value})}
                >
                  <option value="">Select category</option>
                  <option value="Parts">Parts Supplier</option>
                  <option value="Equipment">Equipment Supplier</option>
                  <option value="Service">Service Provider</option>
                  <option value="Materials">Materials Supplier</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addSupplier}>
              Add Supplier
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

// Email Categories Settings
const EmailCategoriesSettings = ({ categories, onChange }) => {
  const [newCategory, setNewCategory] = useState('');

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      onChange([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const removeCategory = (category) => {
    onChange(categories.filter(c => c !== category));
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>📧 Email Categories</h5>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          {categories.map((category) => (
            <Badge 
              key={category} 
              bg="primary" 
              className="me-2 mb-2"
              style={{ cursor: 'pointer' }}
              onClick={() => removeCategory(category)}
            >
              {category} ×
            </Badge>
          ))}
        </div>
        
        <div className="input-group">
          <Form.Control
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add new category"
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
          />
          <Button variant="outline-secondary" onClick={addCategory}>
            Add
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

// Business Rules Settings
const BusinessRulesSettings = ({ rules, onChange }) => {
  const updateRule = (key, value) => {
    onChange({ ...rules, [key]: value });
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>📋 Business Rules</h5>
      </Card.Header>
      <Card.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Response Time (hours)</Form.Label>
            <Form.Control
              type="number"
              value={rules.responseTime || 24}
              onChange={(e) => updateRule('responseTime', parseInt(e.target.value))}
              min="1"
              max="72"
            />
            <Form.Text className="text-muted">
              Target response time for customer emails
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Auto-respond to urgent emails"
              checked={rules.autoRespondUrgent || false}
              onChange={(e) => updateRule('autoRespondUrgent', e.target.checked)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Notify managers of high-value inquiries"
              checked={rules.notifyHighValue || false}
              onChange={(e) => updateRule('notifyHighValue', e.target.checked)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Business Hours</Form.Label>
            <div className="row">
              <div className="col-6">
                <Form.Control
                  type="time"
                  value={rules.businessHoursStart || '09:00'}
                  onChange={(e) => updateRule('businessHoursStart', e.target.value)}
                />
              </div>
              <div className="col-6">
                <Form.Control
                  type="time"
                  value={rules.businessHoursEnd || '17:00'}
                  onChange={(e) => updateRule('businessHoursEnd', e.target.value)}
                />
              </div>
            </div>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default SettingsManagement;
