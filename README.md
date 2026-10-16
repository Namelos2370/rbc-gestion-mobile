# RBC Gestion - React PWA

Application de gestion des factures pour RBC (Business Center) construite avec React et Supabase.

## Fonctionnalités

### Phase 2 - Complète
- ✅ Gestion des factures (création, lecture, suppression)
- ✅ Validation des factures
- ✅ Édition post-validation avec enregistrement de l'audit
- ✅ Génération de Proformas en batch (super_admin uniquement)
- ✅ Audit trail complet
- ✅ Rôles utilisateur (super_admin, admin, employe)

### PWA (Progressive Web App)
- ✅ Installation sur mobile/desktop
- ✅ Fonctionnalité offline
- ✅ Service Worker intégré
- ✅ Manifest.json configuré

## Technologie

- **Frontend**: React 18 + Vite
- **CSS**: Tailwind CSS
- **Base de données**: Supabase (PostgreSQL + JWT)
- **Déploiement**: Vercel
- **PWA**: vite-plugin-pwa

## Installation locale

```bash
# Cloner le repo
git clone https://github.com/Namelos2370/rbc-gestion-react.git
cd rbc-gestion-react

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour production
npm run build

# Aperçu du build
npm run preview
```

## Configuration Supabase

Les paramètres Supabase sont configurés dans `src/config/supabase.js`.

**Comptes de test** :
- super@rbc.local / password123 (super_admin)
- admin@rbc.local / password123 (admin)
- employe@rbc.local / password123 (employe)

## Déploiement sur Vercel

1. Connecter le repo GitHub à Vercel
2. Variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel déploiera automatiquement à chaque push sur `main`

## Structure du projet

```
src/
├── components/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Invoices.jsx
│   ├── Validation.jsx
│   ├── Batches.jsx
│   └── AuditLog.jsx
├── hooks/
│   └── useAuth.js
├── config/
│   └── supabase.js
├── App.jsx
├── main.jsx
└── index.css
```

## Fonctionnalités futures

- Export PDF des factures
- Génération PDF des proformas
- Notifications en temps réel
- Dashboard avec statistiques
- Multi-langue (FR/EN)
