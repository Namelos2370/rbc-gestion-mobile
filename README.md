# RBC Gestion - Phase 2 Mobile

Mobile version of RBC Gestion application with Batch Proforma Generation, Post-Validation Invoice Editing, and complete Audit Trail.

## Features

✅ **Mobile-Responsive Design** - Optimized for all screen sizes  
✅ **Batch Proforma Generation** - Create multiple invoices at once  
✅ **Post-Validation Editing** - Modify invoices after validation  
✅ **Complete Audit Trail** - Track all changes with timestamps  
✅ **Role-Based Access Control** - Super Admin, Admin, Employee roles  
✅ **Dark Theme UI** - Professional dark interface with Tailwind CSS  

## Quick Start

Simply open `index.html` in a web browser or visit the deployed URL on Netlify.

### Default Login
- **Email:** `super@rbc.local`
- **Password:** `password123`

> ⚠️ Change these credentials in your Supabase dashboard before production use!

## Deployment

This is a static single-page application with no build step required.

### Deploy to Netlify
1. Push this repository to GitHub
2. Connect your GitHub repo to Netlify
3. Set Supabase environment variables in Netlify settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Local Development
Simply open `index.html` in your browser. For development, use a local server:
```bash
python -m http.server 8000
# or
npx http-server
```

## Configuration

The application uses Supabase for backend services. Update the credentials in `index.html`:

```javascript
const SUPABASE_URL = 'your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
```

## Database Schema

Required Supabase tables:
- `profiles` - User profiles with roles
- `invoices` - Invoice data
- `proforma_batches` - Batch records
- `invoice_audit_log` - Audit trail

See the main RBC Gestion project documentation for full schema details.

## Technologies

- **Frontend:** HTML5, Vanilla JavaScript, Tailwind CSS
- **Icons:** Lucide Icons (CDN)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Hosting:** Netlify (static deployment)

## Support

For issues or questions, refer to the main RBC Gestion project documentation.

---

**Version:** 3.1.0  
**Status:** Production Ready  
**Last Updated:** 2026-10-07
