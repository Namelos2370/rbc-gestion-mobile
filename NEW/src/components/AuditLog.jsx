import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Calendar, User } from 'lucide-react';

export default function AuditLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      setError('');
      const { data, error: err } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (err) throw err;
      setLogs(data || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const getActionLabel = (action) => {
    const labels = {
      validate_invoice: 'Validation de facture',
      edit_validated_invoice: 'Édition post-validation',
      create_batch: 'Création de batch',
      login: 'Connexion',
      logout: 'Déconnexion',
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition text-sm"
        >
          {loading ? 'Chargement...' : 'Rafraîchir'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun log d'audit</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition border-l-4 border-blue-500"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {getActionLabel(log.action)}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                </div>
                <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar size={14} />
                    {new Date(log.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
