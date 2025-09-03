import axios from 'axios';
import React, { useState, useEffect } from 'react';
import './StepStyles.css';

const TeamSetupStep = ({ data, onComplete, onBack, canGoBack }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', email: '', categoryName: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize with existing data if available
    if (data.stepData && data.stepData['team-setup']) {
      setTeamMembers(data.stepData['team-setup'].teamMembers || []);
    }
  }, [data]);

  const addTeamMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      setError('Please enter both name and email');
      return;
    }

    if (teamMembers.find(member => member.email === newMember.email)) {
      setError('Team member with this email already exists');
      return;
    }

    setTeamMembers([...teamMembers, { ...newMember, notificationEnabled: true }]);
    setNewMember({ name: '', email: '', categoryName: '' });
    setError(null);
  };

  const removeTeamMember = index => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index, field, value) => {
    setTeamMembers(prev =>
      prev.map((member, i) => (i === index ? { ...member, [field]: value } : member))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/onboarding/step/team-setup`,
        { teamMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onComplete({ teamMembers });
    } catch (error) {
      console.error('Error saving team setup:', error);
      setError(error.response?.data?.message || 'Failed to save team setup');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete({ teamMembers: [] });
  };

  return (
    <div className='step-content'>
      <div className='step-description'>
        <h3>Set Up Team Notifications</h3>
        <p>
          Add team members who should be notified when specific types of emails arrive. This is
          optional - you can always add team members later.
        </p>
      </div>

      <div className='team-setup-section'>
        <div className='add-member-section'>
          <h4>Add Team Member</h4>
          <div className='member-form'>
            <div className='form-row'>
              <input
                type='text'
                placeholder='Team member name'
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                className='form-input'
              />
              <input
                type='email'
                placeholder='Email address'
                value={newMember.email}
                onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                className='form-input'
              />
            </div>

            <div className='form-row'>
              <select
                value={newMember.categoryName}
                onChange={e => setNewMember({ ...newMember, categoryName: e.target.value })}
                className='form-select'
              >
                <option value=''>All categories (optional)</option>
                {data.businessCategories?.map(category => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>

              <button
                onClick={addTeamMember}
                className='add-button'
                disabled={!newMember.name.trim() || !newMember.email.trim()}
              >
                Add Member
              </button>
            </div>
          </div>
        </div>

        <div className='team-members-section'>
          <h4>Team Members ({teamMembers.length})</h4>

          {teamMembers.length === 0 ? (
            <div className='empty-state'>
              <p>No team members added yet. Add team members above or skip this step.</p>
            </div>
          ) : (
            <div className='members-list'>
              {teamMembers.map((member, index) => (
                <div key={index} className='member-item'>
                  <div className='member-info'>
                    <div className='member-name'>{member.name}</div>
                    <div className='member-email'>{member.email}</div>
                    <div className='member-category'>
                      {member.categoryName
                        ? `Notified for: ${member.categoryName}`
                        : 'Notified for: All categories'}
                    </div>
                  </div>

                  <div className='member-controls'>
                    <label className='notification-toggle'>
                      <input
                        type='checkbox'
                        checked={member.notificationEnabled}
                        onChange={e =>
                          updateTeamMember(index, 'notificationEnabled', e.target.checked)
                        }
                      />
                      <span className='toggle-slider' />
                      <span className='toggle-label'>Notifications</span>
                    </label>

                    <button
                      onClick={() => removeTeamMember(index)}
                      className='remove-button'
                      title='Remove team member'
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className='error-message'>
          <span className='error-icon'>⚠️</span>
          {error}
        </div>
      )}

      <div className='step-actions'>
        {canGoBack && (
          <button onClick={onBack} className='secondary-button'>
            Back
          </button>
        )}

        <button onClick={handleSkip} className='secondary-button' disabled={saving}>
          Skip for Now
        </button>

        <button onClick={handleSave} disabled={saving} className='primary-button'>
          {saving ? (
            <>
              <div className='button-spinner' />
              Saving...
            </>
          ) : (
            'Continue to Review'
          )}
        </button>
      </div>

      <div className='step-help'>
        <h5>💡 Team notification tips:</h5>
        <ul>
          <li>Team members will receive email alerts when new emails arrive</li>
          <li>You can assign specific categories to team members</li>
          <li>Notifications can be enabled/disabled per team member</li>
          <li>You can add more team members after setup is complete</li>
        </ul>
      </div>
    </div>
  );
};

export default TeamSetupStep;
