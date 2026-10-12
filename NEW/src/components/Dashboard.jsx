import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FileText, Plus, CheckCircle, Box, FileUp } from 'lucide-react';
import Invoices from './Invoices';
import Validation from './Validation';
import Batches from './Batches';
import AuditLog from './AuditLog';

const TAB_ITEMS = [
  { id: 'invoices', label: 'Factures', icon: FileText },
  { id: 'validation', label: 'Validation', icon: CheckCircle },
  { id: 'batches', label: 'Proformas', icon: Box },
  { id: 'audit', label: 'Audit', icon: FileUp },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices');

  const handleLogout = async () => {
    await logout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'invoices':
        return <Invoices user={user} />;
      case 'validation':
        return <Validation user={user} />;
      case 'batches':
        return user?.role === 'super_admin' ? <Batches user={user} /> : <div className="p-4 text-red-600">Accès réservé aux super administrateurs</div>;
      case 'audit':
        return <AuditLog user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">RBC Gestion</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition ${
                    activeTab === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
