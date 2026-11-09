import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High body limit to support PDF, image, and Excel base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Data storage directory
const DATA_DIR = path.resolve(__dirname, 'data');
const RFQ_FILE = path.join(DATA_DIR, 'rfq_requests.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial settings with Office Depot branding, bank details, and notification defaults
const DEFAULT_SETTINGS = {
  businessName: 'Office Depot Quotation Portal',
  tagline: 'REQUEST. QUOTE. DELIVER.',
  companyRegistrationNo: 'PV-90481',
  vatTinNumber: '104829104-7000',
  ownerName: 'Procurement Director',
  whatsappNumber: '94771234567',
  email: 'quotes@officedepot.lk',
  city: 'Colombo, Sri Lanka',
  address: 'No. 88, Commercial Avenue, Colombo 03',
  adminPasscode: 'admin123',
  googleSheetsWebhookUrl: '',
  responsePromiseHours: '2 - 4',
  currency: 'LKR',

  // Bank details
  bankName: 'Commercial Bank of Ceylon PLC',
  bankBranch: 'Colombo Corporate Branch',
  bankAccountName: 'Office Depot Lanka (Pvt) Ltd',
  bankAccountNumber: '1000 4829 1002',
  bankSwiftCode: 'CCEYLKLX',

  // Email notifications
  adminNotificationEmail: 'heshpinidiya@gmail.com',
  enableEmailAlerts: true,

  // Promotional Pop-up Announcement / Ad on Visit
  popupAdEnabled: true,
  popupAdTitle: '🎉 Corporate Bulk Supplies Special Offer',
  popupAdSubtitle: 'Get up to 20% discount on Office Stationery, Paper & Toners this month!',
  popupAdAspectRatio: '1:1',
  popupAdMediaType: 'image',
  popupAdMediaUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  popupAdCtaText: 'Request Quotation Now',
  popupAdCtaLink: '#rfq-form',
};

// Initial sample requests for demonstration
const DEFAULT_RFQS = [
  {
    id: 'OD-RFQ-8421',
    referenceNumber: 'OD-RFQ-8421',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'new',
    customer: {
      name: 'Chaminda Rajapakse',
      company: 'Apex Logistics PVT Ltd',
      phone: '0772345678',
      email: 'procurement@apexlogistics.lk',
      deliveryLocation: 'Colombo 03 Office',
      urgency: 'urgent',
      requiredDate: 'Within 48 Hours',
      notes: 'Need official invoice with VAT breakdown. Delivery to 4th floor.'
    },
    items: [
      {
        id: 'it-1',
        name: 'Double A Photocopy Paper (80 GSM)',
        specs: 'Box of 5 Reams, High White, A4 Size',
        quantity: 25,
        unit: 'Boxes',
        targetBudget: 7800,
        remarks: 'Original certified only'
      },
      {
        id: 'it-2',
        name: 'HP LaserJet 85A Toner Cartridge (CE285A)',
        specs: 'Original Black HP Toner',
        quantity: 4,
        unit: 'Pcs',
        targetBudget: 18500,
        remarks: 'Genuine with security seal'
      },
      {
        id: 'it-3',
        name: 'Whiteboard Marker Pens (Chisel Tip)',
        specs: 'Atlas / Pilot Black & Blue Assorted',
        quantity: 12,
        unit: 'Boxes',
        targetBudget: 1950,
        remarks: 'Dry erase'
      }
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'Monthly_Office_Stationery_RFQ.xlsx',
        size: 24500,
        type: 'excel',
        dataUrl: ''
      }
    ],
    ourQuotedTotal: 0,
    ownerNotes: ''
  },
  {
    id: 'OD-RFQ-8395',
    referenceNumber: 'OD-RFQ-8395',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'quoted',
    customer: {
      name: 'Kavindi Senaratne',
      company: 'Innovatech Labs',
      phone: '0719876543',
      email: 'kavindi@innovatech.io',
      deliveryLocation: 'Orion City, Colombo 09',
      urgency: 'normal',
      requiredDate: 'This Friday',
      notes: 'Please quote delivery charges separately if applicable.'
    },
    items: [
      {
        id: 'it-4',
        name: 'Ergonomic Mesh High-Back Office Chair',
        specs: 'Adjustable Lumbar Support, 3D Armrests, Black',
        quantity: 8,
        unit: 'Pcs',
        targetBudget: 34000,
        remarks: 'Minimum 2 years warranty',
        quotedUnitPrice: 32500,
        quotedTotal: 260000,
        available: true
      },
      {
        id: 'it-5',
        name: 'Dual Monitor Desk Mount Arm',
        specs: 'Heavy Duty Gas Spring for 17-32 inch screens',
        quantity: 8,
        unit: 'Pcs',
        targetBudget: 12000,
        remarks: 'Clamp style',
        quotedUnitPrice: 11800,
        quotedTotal: 94400,
        available: true
      }
    ],
    pricing: {
      subtotal: 354400,
      discountPercent: 5,
      discountAmount: 17720,
      taxPercent: 0,
      taxAmount: 0,
      deliveryFee: 2500,
      grandTotal: 339180,
      validDays: 14,
      deliveryEstimate: '3 Business Days',
      paymentTerms: 'Credit 30 Days on PO',
      notes: 'Free assembly provided on site. 2 years warranty on gas cylinders.',
      quotedAt: new Date(Date.now() - 43200000).toISOString()
    },
    ourQuotedTotal: 339180,
    ownerNotes: 'Formal quotation sent via WhatsApp & Email. Awaiting purchase order.'
  }
];

function readRFQs(): any[] {
  try {
    if (!fs.existsSync(RFQ_FILE)) {
      fs.writeFileSync(RFQ_FILE, JSON.stringify(DEFAULT_RFQS, null, 2), 'utf-8');
      return DEFAULT_RFQS;
    }
    const data = fs.readFileSync(RFQ_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading RFQs:', err);
    return [];
  }
}

function writeRFQs(data: any[]): void {
  try {
    fs.writeFileSync(RFQ_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing RFQs:', err);
  }
}

function readSettings(): any {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return DEFAULT_SETTINGS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      adminPasscode: parsed.adminPasscode || DEFAULT_SETTINGS.adminPasscode,
      businessName: parsed.businessName || DEFAULT_SETTINGS.businessName,
      tagline: parsed.tagline || DEFAULT_SETTINGS.tagline,
    };
  } catch (err) {
    console.error('Error reading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(data: any): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing settings:', err);
  }
}

// Admin Authentication endpoint
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;
  const settings = readSettings();

  if (passcode && passcode === settings.adminPasscode) {
    return res.json({
      success: true,
      token: 'admin-token-' + Date.now(),
      message: 'Authentication successful',
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid Admin Passcode',
  });
});

// Settings APIs
app.get('/api/settings', (req, res) => {
  const settings = readSettings();
  // Don't expose passcode in public settings response
  const sanitized = { ...settings };
  delete sanitized.adminPasscode;
  res.json({ success: true, settings: sanitized });
});

app.post('/api/settings', (req, res) => {
  const newSettings = req.body;
  const existing = readSettings();
  const merged = { ...existing, ...newSettings };
  writeSettings(merged);
  res.json({ success: true, settings: merged });
});

// RFQ APIs
app.get('/api/rfq', (req, res) => {
  const rfqs = readRFQs();
  res.json({ success: true, rfqs });
});

// Track RFQ by Reference Number or Phone (for Customer status tracking)
app.get('/api/rfq/track/:ref', (req, res) => {
  const rfqs = readRFQs();
  const query = req.params.ref.trim().toLowerCase();

  const found = rfqs.find(
    (r) =>
      r.id.toLowerCase() === query ||
      (r.referenceNumber && r.referenceNumber.toLowerCase() === query) ||
      (r.customer && r.customer.phone && r.customer.phone.replace(/\D/g, '') === query.replace(/\D/g, ''))
  );

  if (!found) {
    return res.status(404).json({ success: false, error: 'Quotation request not found with this reference' });
  }

  res.json({ success: true, rfq: found });
});

app.get('/api/rfq/:id', (req, res) => {
  const rfqs = readRFQs();
  const found = rfqs.find((r) => r.id === req.params.id);
  if (!found) {
    return res.status(404).json({ success: false, error: 'RFQ not found' });
  }
  res.json({ success: true, rfq: found });
});

// Customer submits quotation request without logging in!
app.post('/api/rfq', (req, res) => {
  const rfqs = readRFQs();
  const newRfq = req.body;

  const randomRef = Math.floor(1000 + Math.random() * 9000);
  if (!newRfq.id) {
    newRfq.id = `OD-RFQ-${randomRef}`;
  }
  if (!newRfq.referenceNumber) {
    newRfq.referenceNumber = newRfq.id;
  }
  if (!newRfq.createdAt) {
    newRfq.createdAt = new Date().toISOString();
  }
  if (!newRfq.status) {
    newRfq.status = 'new';
  }

  rfqs.unshift(newRfq);
  writeRFQs(rfqs);

  // Check if admin email alerts are enabled
  const settings = readSettings();
  let emailAlertPrepared = false;
  const adminEmail = settings.adminNotificationEmail || settings.email;
  if (settings.enableEmailAlerts && adminEmail) {
    emailAlertPrepared = true;
    console.log(`[EMAIL ALERT] New quotation request ${newRfq.referenceNumber || newRfq.id} routed to admin email: ${adminEmail}`);
  }

  // If a Google Sheets Webhook is configured, forward immediately
  if (settings.googleSheetsWebhookUrl && settings.googleSheetsWebhookUrl.startsWith('http')) {
    try {
      fetch(settings.googleSheetsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRfq),
      }).catch((e) => console.log('Sheets Webhook forward error:', e));
    } catch (e) {
      // ignore
    }
  }

  res.json({
    success: true,
    rfq: newRfq,
    emailAlertPrepared,
    notificationEmail: adminEmail,
  });
});

// Admin saves full quotation pricing and sends quote back to customer
app.post('/api/rfq/:id/quote', (req, res) => {
  const rfqs = readRFQs();
  const index = rfqs.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'RFQ not found' });
  }

  const { items, pricing, ownerNotes, status } = req.body;

  rfqs[index] = {
    ...rfqs[index],
    items: items || rfqs[index].items,
    pricing: pricing || rfqs[index].pricing,
    ourQuotedTotal: pricing ? pricing.grandTotal : rfqs[index].ourQuotedTotal,
    ownerNotes: ownerNotes !== undefined ? ownerNotes : rfqs[index].ownerNotes,
    status: status || 'quoted',
  };

  writeRFQs(rfqs);
  res.json({ success: true, rfq: rfqs[index] });
});

app.patch('/api/rfq/:id', (req, res) => {
  const rfqs = readRFQs();
  const index = rfqs.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'RFQ not found' });
  }

  rfqs[index] = { ...rfqs[index], ...req.body };
  writeRFQs(rfqs);
  res.json({ success: true, rfq: rfqs[index] });
});

app.delete('/api/rfq/:id', (req, res) => {
  let rfqs = readRFQs();
  const initialLength = rfqs.length;
  rfqs = rfqs.filter((r) => r.id !== req.params.id);

  if (rfqs.length === initialLength) {
    return res.status(404).json({ success: false, error: 'RFQ not found' });
  }

  writeRFQs(rfqs);
  res.json({ success: true, message: 'Deleted successfully' });
});

// CSV Export for Google Sheets
app.get('/api/rfq/export/all.csv', (req, res) => {
  const rfqs = readRFQs();
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += `"Reference ID","Date & Time","Customer Name","Company","Phone (WhatsApp)","Location","Urgency","Required Date","Item #","Item Name","Specifications / Model","Quantity","Unit","Target Budget","Quoted Unit Price","Quoted Total","Status","Grand Quoted Total"\r\n`;

  rfqs.forEach((r) => {
    const dateStr = new Date(r.createdAt).toLocaleString();
    const custName = (r.customer?.name || '').replace(/"/g, '""');
    const custCompany = (r.customer?.company || '').replace(/"/g, '""');
    const custPhone = (r.customer?.phone || '').replace(/"/g, '""');
    const custLoc = (r.customer?.deliveryLocation || '').replace(/"/g, '""');
    const custUrg = r.customer?.urgency || 'normal';
    const custReqDate = (r.customer?.requiredDate || '').replace(/"/g, '""');
    const grandQuoted = r.pricing ? r.pricing.grandTotal : (r.ourQuotedTotal || '');

    r.items.forEach((item: any, idx: number) => {
      const cleanName = (item.name || '').replace(/"/g, '""');
      const cleanSpecs = (item.specs || '').replace(/"/g, '""');
      const cleanUnit = (item.unit || '').replace(/"/g, '""');
      const cleanBudget = item.targetBudget ? item.targetBudget : '';
      const quotedUnitPrice = item.quotedUnitPrice ? item.quotedUnitPrice : '';
      const quotedTotal = item.quotedTotal ? item.quotedTotal : '';

      csv += `"${r.referenceNumber || r.id}","${dateStr}","${custName}","${custCompany}","${custPhone}","${custLoc}","${custUrg}","${custReqDate}","${idx + 1}","${cleanName}","${cleanSpecs}",${item.quantity},"${cleanUnit}","${cleanBudget}","${quotedUnitPrice}","${quotedTotal}","${r.status}","${grandQuoted}"\r\n`;
    });
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="office_depot_quotations.csv"');
  res.send(csv);
});

// Setup dev server or static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
