import { parse } from 'csv-parse/sync';

const HEADER_MAP = {
  name: 'name',
  full_name: 'name',
  fullname: 'name',
  phone: 'phone',
  phone_number: 'phone',
  mobilenumber: 'phone',
  mobile: 'phone',
  account_number: 'account_number',
  account: 'account_number',
  accountnumber: 'account_number',
  loan_amount: 'loan_amount',
  amount: 'loan_amount',
  balance: 'loan_amount',
  loanamount: 'loan_amount',
};

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function parseContactsCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (!records.length) {
    throw new Error('CSV has no data rows');
  }

  const sampleKeys = Object.keys(records[0] || {});
  const mappedKeys = {};
  for (const key of sampleKeys) {
    const norm = normalizeHeader(key);
    if (HEADER_MAP[norm]) mappedKeys[key] = HEADER_MAP[norm];
  }

  if (!Object.values(mappedKeys).includes('name') || !Object.values(mappedKeys).includes('phone')) {
    throw new Error('CSV must include name and phone columns');
  }

  const contacts = [];
  for (const row of records) {
    const contact = {
      name: '',
      phone: '',
      account_number: '',
      loan_amount: 0,
    };
    for (const [rawKey, field] of Object.entries(mappedKeys)) {
      const raw = row[rawKey];
      if (field === 'loan_amount') {
        const cleaned = String(raw ?? '')
          .replace(/[$,]/g, '')
          .trim();
        contact.loan_amount = cleaned ? Number(cleaned) : 0;
      } else {
        contact[field] = String(raw ?? '').trim();
      }
    }
    if (!contact.name || !contact.phone) continue;
    contacts.push(contact);
  }

  if (!contacts.length) {
    throw new Error('No valid contacts found in CSV');
  }

  return contacts;
}
