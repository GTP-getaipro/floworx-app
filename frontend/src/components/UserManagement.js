import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Alert } from './ui';
import useApi from '../hooks/useApi';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user',
  });

  const { apiRequest } = useApi();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/users');
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  const handleAddUser = async e => {
    e.preventDefault();
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setNewUser({ name: '', email: '', role: 'user' });
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setError('Failed to add user');
      console.error('Error adding user:', err);
    }
  };

  const handleDeleteUser = async userId => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiRequest(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user');
        console.error('Error deleting user:', err);
      }
    }
  };

  const filteredUsers = users.filter(
    user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className='user-management-loading'>Loading users...</div>;
  }

  return (
    <div className='user-management'>
      <div className='user-management-header'>
        <h2>User Management</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant='primary'>
          {showAddForm ? 'Cancel' : 'Add User'}
        </Button>
      </div>

      {error && <Alert type='error' message={error} />}

      {showAddForm && (
        <Card className='add-user-form'>
          <h3>Add New User</h3>
          <form onSubmit={handleAddUser}>
            <div className='form-group'>
              <label htmlFor='name'>Name:</label>
              <Input
                id='name'
                type='text'
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='email'>Email:</label>
              <Input
                id='email'
                type='email'
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='role'>Role:</label>
              <select
                id='role'
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className='role-select'
              >
                <option value='user'>User</option>
                <option value='admin'>Admin</option>
                <option value='moderator'>Moderator</option>
              </select>
            </div>
            <div className='form-actions'>
              <Button type='submit' variant='primary'>
                Add User
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className='user-management-controls'>
        <Input
          type='text'
          placeholder='Search users...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='search-input'
        />
      </div>

      <Card className='users-list'>
        <h3>Users ({filteredUsers.length})</h3>
        {filteredUsers.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className='users-table'>
            <div className='table-header'>
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Actions</div>
            </div>
            {filteredUsers.map(user => (
              <div key={user.id} className='table-row'>
                <div>{user.name}</div>
                <div>{user.email}</div>
                <div>
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                </div>
                <div className='user-actions'>
                  <Button
                    variant='secondary'
                    size='small'
                    onClick={() => {
                      /* TODO: Implement edit */
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant='danger' size='small' onClick={() => handleDeleteUser(user.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default UserManagement;
