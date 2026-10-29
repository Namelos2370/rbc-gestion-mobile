import logoRbc from '../assets/logo-rbc.jpeg';
import { montantEnLettres } from '../utils/montantEnLettres';
import { numeroFacture } from '../utils/format';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR');

const dateFacture = (valeur) =>
  new Date(valeur || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Mise en page de la facture imprimée, d'après le modèle validé.
// Les coordonnées viennent de « Mon profil » ; le numéro, la date et le total sont calculés.
export default function FactureImprimable({ facture, lignes: lignesRecues, entreprise, titre = 'FACTURE', avecSignatureClient = false }) {
  // Anciennes factures sans lignes détaillées : on affiche une ligne à partir du libellé et du montant enregistrés
  const lignes = lignesRecues.length > 0
    ? lignesRecues
    : [{ designation: facture.service || 'Prestation', quantity: 1, unit_price: facture.amount }];
  const total = lignes.reduce((s, l) => s + Number(l.total_price ?? Number(l.quantity) * Number(l.unit_price)), 0);
  // Seules les lignes réelles sont affichées : pas de lignes vides ajoutées, pour tenir sur une page
  const lignesAffichees = lignes;
  const ville = (entreprise.company_location || '').split(',')[0] || 'Yaoundé';
  const enTete = { fontFamily: "'Segoe UI', system-ui, sans-serif" };

  return (
    <div style={{ width: 794, height: 1123, boxSizing: 'border-box', padding: '40px 52px', display: 'flex', flexDirection: 'column', background: '#fff', color: '#111827', fontFamily: "'Times New Roman', Georgia, serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <img src={logoRbc} alt="Logo" style={{ width: 170, height: 170, objectFit: 'contain' }} />
        <div style={{ ...enTete, textAlign: 'right', fontSize: 13, color: '#374151', lineHeight: 1.6, paddingTop: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0d47a1' }}>{entreprise.company_name}</div>
          {entreprise.company_address && <div>{entreprise.company_address}</div>}
          {entreprise.company_phone && <div>Tél : {entreprise.company_phone}</div>}
          {entreprise.company_email && <div>Email : {entreprise.company_email}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, fontSize: 16 }}>
        {ville}, le <span style={{ marginLeft: 6, fontWeight: 600 }}>{dateFacture(facture.created_at)}</span>
      </div>

      <h1 style={{ margin: '22px 0 0', textAlign: 'center', fontSize: 24, textDecoration: 'underline', letterSpacing: 1 }}>
        {titre} N° {numeroFacture(facture)}
      </h1>

      <div style={{ marginTop: 26, fontSize: 17 }}>
        <span style={{ fontWeight: 700, textDecoration: 'underline' }}>Doit :</span>
        <span style={{ marginLeft: 8, fontWeight: 700 }}>{facture.client}</span>
        {facture.client_phone && (
          <div style={{ marginLeft: 8, fontSize: 15, marginTop: 4 }}>Tél. : {facture.client_phone}</div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 22, fontSize: 16 }}>
        <thead>
          <tr style={{ background: '#1e6fd9', color: '#fff' }}>
            <th style={{ ...enTete, border: '1px solid #1e6fd9', padding: '10px 12px', textAlign: 'left', fontSize: 15 }}>DÉSIGNATION</th>
            <th style={{ ...enTete, border: '1px solid #1e6fd9', padding: '10px 12px', width: 80, textAlign: 'center', fontSize: 15 }}>QTÉ</th>
            <th style={{ ...enTete, border: '1px solid #1e6fd9', padding: '10px 12px', width: 120, textAlign: 'right', fontSize: 15 }}>P.U</th>
            <th style={{ ...enTete, border: '1px solid #1e6fd9', padding: '10px 12px', width: 130, textAlign: 'right', fontSize: 15 }}>P.T</th>
          </tr>
        </thead>
        <tbody>
          {lignesAffichees.map((l, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #9ca3af', padding: '12px', height: 34 }}>{l?.designation || ''}</td>
              <td style={{ border: '1px solid #9ca3af', padding: 12, textAlign: 'center' }}>{l ? l.quantity : ''}</td>
              <td style={{ border: '1px solid #9ca3af', padding: 12, textAlign: 'right' }}>{l ? fmt(l.unit_price) : ''}</td>
              <td style={{ border: '1px solid #9ca3af', padding: 12, textAlign: 'right' }}>
                {l ? fmt(l.total_price ?? Number(l.quantity) * Number(l.unit_price)) : ''}
              </td>
            </tr>
          ))}
          <tr style={{ background: '#dbeafe', fontWeight: 700 }}>
            <td colSpan={3} style={{ ...enTete, border: '1px solid #1e6fd9', padding: 12, textAlign: 'center' }}>TOTAL</td>
            <td style={{ border: '1px solid #1e6fd9', padding: 12, textAlign: 'right' }}>{fmt(total)}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: '22px 0 0', fontSize: 16, lineHeight: 1.5 }}>
        Arrêté la présente facture à la somme de :{' '}
        <span style={{ fontWeight: 700 }}>{montantEnLettres(total)} francs CFA.</span>
      </p>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: avecSignatureClient ? 'space-between' : 'flex-end', gap: 24 }}>
        {avecSignatureClient && (
          <div style={{ width: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, textDecoration: 'underline' }}>Le client</div>
            <div style={{ height: 120, borderBottom: '1px dashed #9ca3af', marginTop: 8 }} />
            <p style={{ margin: '6px 0 0', ...enTete, fontSize: 11, color: '#6b7280' }}>Lu et approuvé, signature</p>
          </div>
        )}
        <div style={{ width: 260, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, textDecoration: 'underline' }}>
            {entreprise.company_director || 'La Direction'}
          </div>
          <div style={{ height: 120, borderBottom: '1px dashed #9ca3af', marginTop: 8 }} />
          <p style={{ margin: '6px 0 0', ...enTete, fontSize: 11, color: '#6b7280' }}>Cachet et signature</p>
        </div>
      </div>

      {entreprise.company_footer && (
        <footer style={{ marginTop: 20, borderTop: '2px solid #1e6fd9', paddingTop: 8, textAlign: 'center', ...enTete, fontSize: 12, color: '#374151' }}>
          {entreprise.company_footer}
        </footer>
      )}
    </div>
  );
}
