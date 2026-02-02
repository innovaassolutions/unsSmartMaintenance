'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  User,
  Calendar,
  CheckCircle,
  X,
  Save,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'technician' | 'operator' | 'viewer';
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  avatar?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

const mockUsers: UserData[] = [
  {
    id: '1',
    name: 'John Rodriguez',
    email: 'j.rodriguez@company.com',
    role: 'admin',
    department: 'IT Administration',
    status: 'active',
    lastLogin: '2024-01-15 14:30',
    createdAt: '2023-08-15',
    permissions: ['all'],
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 's.chen@company.com',
    role: 'manager',
    department: 'Production',
    status: 'active',
    lastLogin: '2024-01-15 12:15',
    createdAt: '2023-09-22',
    permissions: ['view_all_dashboards', 'manage_production', 'create_reports'],
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'm.johnson@company.com',
    role: 'technician',
    department: 'Maintenance',
    status: 'active',
    lastLogin: '2024-01-15 10:45',
    createdAt: '2023-10-05',
    permissions: [
      'view_maintenance',
      'create_work_orders',
      'update_equipment_status',
    ],
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'e.davis@company.com',
    role: 'operator',
    department: 'Production',
    status: 'active',
    lastLogin: '2024-01-15 08:20',
    createdAt: '2023-11-12',
    permissions: ['view_production', 'update_machine_status'],
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'd.wilson@company.com',
    role: 'manager',
    department: 'Quality Control',
    status: 'inactive',
    lastLogin: '2024-01-10 16:30',
    createdAt: '2023-07-20',
    permissions: ['view_quality', 'manage_inspections', 'create_reports'],
  },
];

const roles: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access and user management',
    permissions: ['all'],
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Department management and reporting access',
    permissions: [
      'view_all_dashboards',
      'manage_department',
      'create_reports',
      'manage_schedules',
    ],
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'technician',
    name: 'Technician',
    description: 'Maintenance and equipment management',
    permissions: [
      'view_maintenance',
      'create_work_orders',
      'update_equipment_status',
      'access_image_library',
    ],
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Production monitoring and basic updates',
    permissions: ['view_production', 'update_machine_status', 'view_schedules'],
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboards',
    permissions: ['view_dashboards'],
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserData | null>(
    null
  );

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus =
      selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleInfo = (roleId: string) =>
    roles.find(r => r.id === roleId) || roles[4];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user: UserData) => {
    setUsers(prev => prev.filter(u => u.id !== user.id));
    setShowDeleteConfirm(null);
  };

  const handleSaveUser = (userData: Partial<UserData>) => {
    if (editingUser) {
      // Update existing user
      setUsers(prev =>
        prev.map(u => (u.id === editingUser.id ? { ...u, ...userData } : u))
      );
    } else {
      // Create new user
      const newUser: UserData = {
        id: Date.now().toString(),
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'viewer',
        department: userData.department || '',
        status: 'pending',
        lastLogin: 'Never',
        createdAt: new Date().toISOString().split('T')[0],
        permissions: getRoleInfo(userData.role || 'viewer').permissions,
      };
      setUsers(prev => [...prev, newUser]);
    }
    setShowUserModal(false);
    setEditingUser(null);
  };

  return (
    <ProtectedRoute>
      <Layout
        title="User Management"
        status={{
          message: 'User System Active',
          isHealthy: true,
        }}
      >
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  User Management
                </h1>
                <p className="text-gray-600">
                  Manage users, roles, and permissions
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Administrators</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl p-6 shadow-card mb-6">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex space-x-3">
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Roles</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Users ({filteredUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    User
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    Role
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    Department
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    Last Login
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${roleInfo.color}`}
                        >
                          {roleInfo.name}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-700">
                        {user.department}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(user.status)}`}
                        >
                          {user.status.charAt(0).toUpperCase() +
                            user.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-700">
                        {user.lastLogin}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Modal */}
        {showUserModal && (
          <UserModal
            user={editingUser}
            roles={roles}
            onSave={handleSaveUser}
            onClose={() => {
              setShowUserModal(false);
              setEditingUser(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete User
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete{' '}
                <strong>{showDeleteConfirm.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}

// User Modal Component
function UserModal({
  user,
  roles,
  onSave,
  onClose,
}: {
  user: UserData | null;
  roles: Role[];
  onSave: (userData: Partial<UserData>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    department: user?.department || '',
    status: user?.status || 'pending',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    role: e.target.value as UserData['role'],
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={e =>
                  setFormData(prev => ({ ...prev, department: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      status: e.target.value as UserData['status'],
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            )}
          </div>

          {/* Role Permissions Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Role Permissions</h4>
            <div className="text-sm text-gray-600">
              {roles.find(r => r.id === formData.role)?.description}
            </div>
          </div>

          <div className="flex space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{user ? 'Update User' : 'Create User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
