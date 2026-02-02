'use client';

import React, { useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Search,
  Filter,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Truck
} from 'lucide-react';

// Mock inventory data for relay assembly plant parts
const inventoryItems = [
  {
    id: 1,
    partNumber: 'CW-ELECTRODE-001',
    description: 'Copper Welding Electrode - Contact Welder',
    category: 'Consumables',
    currentStock: 8,
    minimumStock: 15,
    maximumStock: 50,
    unitCost: 24.50,
    supplier: 'Industrial Components Ltd',
    leadTimeDays: 3,
    lastOrderDate: '2024-01-08',
    usageRate: 2.5, // per week
    status: 'Low Stock',
    location: 'A-12-3',
    reorderPoint: 15,
    machinesUsed: ['cw-l1-01']
  },
  {
    id: 2,
    partNumber: 'WIND-BEARING-002',
    description: 'Spindle Bearing Assembly - Coil Winder',
    category: 'Mechanical',
    currentStock: 3,
    minimumStock: 2,
    maximumStock: 8,
    unitCost: 185.00,
    supplier: 'Precision Bearings Inc',
    leadTimeDays: 7,
    lastOrderDate: '2024-01-05',
    usageRate: 0.3, // per week
    status: 'In Stock',
    location: 'B-05-1',
    reorderPoint: 2,
    machinesUsed: ['wind-l1-01']
  },
  {
    id: 3,
    partNumber: 'PRESS-SEAL-002',
    description: 'Hydraulic Seal Kit - Assembly Press',
    category: 'Hydraulics',
    currentStock: 0,
    minimumStock: 3,
    maximumStock: 12,
    unitCost: 67.50,
    supplier: 'HydroSeal Solutions',
    leadTimeDays: 5,
    lastOrderDate: '2024-01-10',
    usageRate: 1.2, // per week
    status: 'Out of Stock',
    location: 'C-08-2',
    reorderPoint: 3,
    machinesUsed: ['press-l1-01'],
    orderStatus: 'Ordered - Expected Jan 16'
  },
  {
    id: 4,
    partNumber: 'HYD-FLUID-001',
    description: 'Hydraulic Fluid ISO 32 (5L Container)',
    category: 'Fluids',
    currentStock: 12,
    minimumStock: 6,
    maximumStock: 24,
    unitCost: 45.00,
    supplier: 'FluidTech Supply',
    leadTimeDays: 2,
    lastOrderDate: '2024-01-09',
    usageRate: 3.0, // per week
    status: 'In Stock',
    location: 'D-03-1',
    reorderPoint: 6,
    machinesUsed: ['press-l1-01', 'mold-l1-01']
  },
  {
    id: 5,
    partNumber: 'MOLD-HEATER-003',
    description: 'Injection Mold Heater Element',
    category: 'Electrical',
    currentStock: 2,
    minimumStock: 4,
    maximumStock: 16,
    unitCost: 125.00,
    supplier: 'ThermoControl Systems',
    leadTimeDays: 10,
    lastOrderDate: '2024-01-03',
    usageRate: 0.8, // per week
    status: 'Low Stock',
    location: 'E-07-4',
    reorderPoint: 4,
    machinesUsed: ['mold-l1-01']
  },
  {
    id: 6,
    partNumber: 'TEST-PROBE-001',
    description: 'Test Probe Assembly - Final Tester',
    category: 'Electrical',
    currentStock: 6,
    minimumStock: 3,
    maximumStock: 12,
    unitCost: 89.00,
    supplier: 'TestEquip Pro',
    leadTimeDays: 4,
    lastOrderDate: '2024-01-07',
    usageRate: 0.5, // per week
    status: 'In Stock',
    location: 'F-02-1',
    reorderPoint: 3,
    machinesUsed: ['test-l1-01']
  },
  {
    id: 7,
    partNumber: 'INSERT-TERMINAL-005',
    description: 'Terminal Insert Components (Pack of 100)',
    category: 'Consumables',
    currentStock: 450,
    minimumStock: 200,
    maximumStock: 1000,
    unitCost: 0.85,
    supplier: 'ConnectorParts Direct',
    leadTimeDays: 1,
    lastOrderDate: '2024-01-11',
    usageRate: 75, // per week
    status: 'In Stock',
    location: 'G-01-2',
    reorderPoint: 200,
    machinesUsed: ['insert-l1-01']
  }
];

// Mock supplier data
const suppliers = [
  {
    id: 1,
    name: 'Industrial Components Ltd',
    performanceScore: 0.94,
    averageLeadTime: 3.2,
    onTimeDelivery: 0.96,
    qualityRating: 0.92,
    totalOrders: 45,
    contact: 'orders@industrialcomp.com'
  },
  {
    id: 2,
    name: 'Precision Bearings Inc',
    performanceScore: 0.89,
    averageLeadTime: 6.8,
    onTimeDelivery: 0.91,
    qualityRating: 0.95,
    totalOrders: 23,
    contact: 'sales@precisionbearings.com'
  },
  {
    id: 3,
    name: 'HydroSeal Solutions',
    performanceScore: 0.87,
    averageLeadTime: 5.4,
    onTimeDelivery: 0.88,
    qualityRating: 0.89,
    totalOrders: 31,
    contact: 'support@hydroseal.com'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'In Stock':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Low Stock':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Out of Stock':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Consumables':
      return 'bg-blue-100 text-blue-800';
    case 'Mechanical':
      return 'bg-purple-100 text-purple-800';
    case 'Hydraulics':
      return 'bg-orange-100 text-orange-800';
    case 'Electrical':
      return 'bg-green-100 text-green-800';
    case 'Fluids':
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface InventoryManagementProps {
  className?: string;
}

export default function InventoryManagement({ className = '' }: InventoryManagementProps) {
  const [selectedTab, setSelectedTab] = useState<'inventory' | 'suppliers'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filteredInventory = inventoryItems.filter(item => {
    const matchesSearch = item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(inventoryItems.map(item => item.category))];

  const lowStockItems = inventoryItems.filter(item => item.currentStock <= item.minimumStock);
  const outOfStockItems = inventoryItems.filter(item => item.currentStock === 0);

  const handleReorder = (item: any) => {
    setSelectedItem(item);
    setShowReorderModal(true);
  };

  const handleConfirmReorder = () => {
    if (selectedItem) {
      console.log(`Reordering ${selectedItem.partNumber}`);
      alert(`Reorder request submitted for ${selectedItem.partNumber}!\nSupplier: ${selectedItem.supplier}\nLead Time: ${selectedItem.leadTimeDays} days`);
      setShowReorderModal(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-card ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Inventory Management</h2>
              <p className="text-gray-600 mt-1">Parts, supplies, and supplier performance tracking</p>
            </div>
          </div>
          
          {/* Alert Summary */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span>{outOfStockItems.length} Out of Stock</span>
            </div>
            <div className="flex items-center space-x-1 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{lowStockItems.length} Low Stock</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('inventory')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'inventory'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Inventory Items
          </button>
          <button
            onClick={() => setSelectedTab('suppliers')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'suppliers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Supplier Performance
          </button>
        </div>
      </div>

      {selectedTab === 'inventory' && (
        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search parts by number or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="pl-3 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Part</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Stock Level</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Usage Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Supplier</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Lead Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.partNumber}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-xs text-gray-500">Location: {item.location}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{item.currentStock}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                item.currentStock <= item.minimumStock
                                  ? 'bg-red-500'
                                  : item.currentStock <= item.minimumStock * 1.5
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min((item.currentStock / item.maximumStock) * 100, 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">Min: {item.minimumStock}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        {item.usageRate > 5 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm text-gray-700">{item.usageRate}/week</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-900">{item.supplier}</p>
                      <p className="text-xs text-gray-500">${item.unitCost}/unit</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{item.leadTimeDays} days</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      {item.orderStatus && (
                        <p className="text-xs text-blue-600 mt-1">{item.orderStatus}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.currentStock <= item.reorderPoint && (
                        <button
                          onClick={() => handleReorder(item)}
                          className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>Reorder</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'suppliers' && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(supplier => (
              <div key={supplier.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-gray-700">
                      {Math.round(supplier.performanceScore * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Lead Time:</span>
                    <span className="font-medium">{supplier.averageLeadTime} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">On-Time Delivery:</span>
                    <span className="font-medium">{Math.round(supplier.onTimeDelivery * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quality Rating:</span>
                    <span className="font-medium">{Math.round(supplier.qualityRating * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-medium">{supplier.totalOrders}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-600">{supplier.contact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      {showReorderModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reorder Part</h3>
                  <p className="text-sm text-gray-600">Submit automatic reorder request</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">Part Number</p>
                  <p className="text-gray-900">{selectedItem.partNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-gray-900">{selectedItem.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Current Stock</p>
                    <p className="text-gray-900">{selectedItem.currentStock}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Suggested Qty</p>
                    <p className="text-gray-900">{selectedItem.maximumStock - selectedItem.currentStock}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Supplier</p>
                    <p className="text-gray-900">{selectedItem.supplier}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Lead Time</p>
                    <p className="text-gray-900">{selectedItem.leadTimeDays} days</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Estimated Cost</p>
                  <p className="text-gray-900">
                    ${((selectedItem.maximumStock - selectedItem.currentStock) * selectedItem.unitCost).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleConfirmReorder}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Confirm Reorder
                </button>
                <button
                  onClick={() => setShowReorderModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}