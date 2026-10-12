import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Download } from 'lucide-react';

export default function Batches({ user }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError('');
      // Fetch batches
      const { data: batchData, error: batchErr } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (batchErr) throw batchErr;
      setBatches(batchData || []);

      // Fetch validated invoices
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'validated');
      
      if (invoiceErr) throw invoiceErr;
      setAllInvoices(invoiceData || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateBatch = async () => {
    if (selectedInvoices.length === 0) {
      setError('Sélectionnez au moins une facture');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create batch
      const { data: batchData, error: batchErr } = await supabase
        .from('batches')
        .insert([
          {
            name: `Proforma Batch ${new Date().toLocaleDateString()}`,
            total_amount: selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0),
            invoice_count: selectedInvoices.length,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (batchErr) throw batchErr;

      // Log in audit
      await supabase
        .from('audit_logs')
        .insert([
          {
            user_id: user?.id,
            action: 'create_batch',
            details: `Batch créé avec ${selectedInvoices.length} factures`,
          },
        ]);

      setSelectedInvoices([]);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const toggleInvoice = (invoiceId) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Génération de Proformas</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Batch Generator Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Créer un nouveau Proforma Batch
        </h3>

        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-3">Factures validées à inclure :</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {allInvoices.length === 0 ? (
              <p className="text-gray-500">Aucune facture validée</p>
            ) : (
              allInvoices.map((invoice) => (
                <label key={invoice.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={() => toggleInvoice(invoice.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">
                    {invoice.client} - {invoice.service} ({invoice.amount.toFixed(2)} €)
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <button
          onClick={handleGenerateBatch}
          disabled={loading || selectedInvoices.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
        >
          {loading ? 'Génération...' : 'Générer Proforma'}
        </button>
      </div>

      {/* Batches History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des Proformas</h3>
        <div className="grid gap-4">
          {batches.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun proforma généré</p>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{batch.name}</h4>
                    <p className="text-sm text-gray-600">
                      {batch.invoice_count} facture(s) • Total : {batch.total_amount.toFixed(2)} €
                    </p>
                  </div>
                  <button className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1 rounded-lg text-sm flex items-center gap-2 transition">
                    <Download size={16} />
                    Télécharger
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
