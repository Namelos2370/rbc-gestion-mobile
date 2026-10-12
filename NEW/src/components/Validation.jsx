import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Check, Edit2 } from 'lucide-react';

export default function Validation({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  const fetchPendingInvoices = async () => {
    try {
      setError('');
      const { data, error: err } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (err) throw err;
      setInvoices(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleValidate = async (invoiceId) => {
    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase
        .from('invoices')
        .update({ status: 'validated' })
        .eq('id', invoiceId);

      if (err) throw err;

      // Log in audit
      await supabase
        .from('audit_logs')
        .insert([
          {
            user_id: user?.id,
            action: 'validate_invoice',
            details: `Facture ${invoiceId} validée`,
          },
        ]);

      await fetchPendingInvoices();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEditSubmit = async (invoiceId) => {
    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase
        .from('invoices')
        .update(editData)
        .eq('id', invoiceId);

      if (err) throw err;

      // Log in audit
      await supabase
        .from('audit_logs')
        .insert([
          {
            user_id: user?.id,
            action: 'edit_validated_invoice',
            details: `Facture ${invoiceId} modifiée après validation`,
          },
        ]);

      setEditingId(null);
      setEditData({});
      await fetchPendingInvoices();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Validation des factures</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune facture à valider</p>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition"
            >
              {editingId === invoice.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={editData.client || invoice.client}
                      onChange={(e) =>
                        setEditData({ ...editData, client: e.target.value })
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    />
                    <input
                      type="text"
                      value={editData.service || invoice.service}
                      onChange={(e) =>
                        setEditData({ ...editData, service: e.target.value })
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    />
                    <input
                      type="number"
                      value={editData.amount || invoice.amount}
                      onChange={(e) =>
                        setEditData({ ...editData, amount: parseFloat(e.target.value) })
                      }
                      step="0.01"
                      className="px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSubmit(invoice.id)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditData({});
                      }}
                      className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{invoice.client}</h3>
                    <p className="text-sm text-gray-600">{invoice.service}</p>
                    <p className="text-lg font-bold text-blue-600 mt-2">
                      {invoice.amount.toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(invoice.id);
                        setEditData(invoice);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                      <Edit2 size={16} />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleValidate(invoice.id)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                      <Check size={16} />
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
