import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Plus, Trash2 } from 'lucide-react';

export default function Invoices({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    service: '',
    amount: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setError('');
      const { data, error: err } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (err) throw err;
      setInvoices(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase
        .from('invoices')
        .insert([
          {
            client: formData.client,
            service: formData.service,
            amount: parseFloat(formData.amount),
            status: 'pending',
            created_by: user?.id,
          },
        ]);

      if (err) throw err;
      
      setFormData({ client: '', service: '', amount: '' });
      setShowForm(false);
      await fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette facture ?')) return;
    
    try {
      const { error: err } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (err) throw err;
      await fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des factures</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Nouvelle facture
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Client"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="Service"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="number"
              placeholder="Montant"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              step="0.01"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune facture créée</p>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{invoice.client}</h3>
                  <p className="text-sm text-gray-600">{invoice.service}</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">{invoice.amount.toFixed(2)} €</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'validated'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status === 'validated' ? 'Validée' : 'En attente'}
                  </span>
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="ml-2 text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
