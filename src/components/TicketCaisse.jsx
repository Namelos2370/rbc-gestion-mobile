import { numeroFacture } from '../utils/format';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR');

const dateHeure = (valeur) =>
  new Date(valeur || Date.now()).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ligne = { display: 'flex', justifyContent: 'space-between', gap: 8 };

// Ticket de caisse : format étroit (80 mm), sans signature.
export default function TicketCaisse({ facture, lignes, entreprise }) {
  const total = lignes.reduce((s, l) => s + Number(l.total_price ?? Number(l.quantity) * Number(l.unit_price)), 0);

  return (
    <div style={{ width: 280, padding: '8px 4px', background: '#fff', color: '#111827', fontFamily: "'Courier New', Courier, monospace", fontSize: 13, lineHeight: 1.4 }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{entreprise.company_name}</div>
      {entreprise.company_location && <div style={{ textAlign: 'center' }}>{entreprise.company_location}</div>}
      {entreprise.company_address && <div style={{ textAlign: 'center' }}>{entreprise.company_address}</div>}
      {entreprise.company_phone && <div style={{ textAlign: 'center' }}>Tél : {entreprise.company_phone}</div>}

      <div style={{ borderTop: '1px dashed #111827', margin: '8px 0' }} />

      <div style={ligne}><span>Ticket</span><span>{numeroFacture(facture)}</span></div>
      <div style={ligne}><span>Date</span><span>{dateHeure(facture.created_at)}</span></div>
      <div style={ligne}><span>Client</span><span>{facture.client}</span></div>

      <div style={{ borderTop: '1px dashed #111827', margin: '8px 0' }} />

      {lignes.map((l, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div>{l.designation}</div>
          <div style={ligne}>
            <span>{l.quantity} x {fmt(l.unit_price)}</span>
            <span>{fmt(l.total_price ?? Number(l.quantity) * Number(l.unit_price))}</span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #111827', margin: '8px 0' }} />

      <div style={{ ...ligne, fontWeight: 700, fontSize: 15 }}>
        <span>TOTAL</span>
        <span>{fmt(total)} F</span>
      </div>

      {facture.paid_at && (
        <div style={{ textAlign: 'center', marginTop: 8, fontWeight: 700 }}>PAYÉ</div>
      )}

      <div style={{ borderTop: '1px dashed #111827', margin: '10px 0 6px' }} />
      <div style={{ textAlign: 'center' }}>Merci de votre confiance</div>
      {entreprise.company_footer && <div style={{ textAlign: 'center', fontSize: 11 }}>{entreprise.company_footer}</div>}
    </div>
  );
}
