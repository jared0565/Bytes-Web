const { scriptedTurn } = await import('./bundle.mjs');
const emailRegex = /[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,190}\.[a-zA-Z]{2,24}/;
const run = (msgs, opts = {}) => {
  const history = []; const out = [];
  for (const m of msgs) {
    const r = scriptedTurn({ message: m, history, companyName: 'Acme Dental', services: opts.services ?? ['Teeth whitening', 'Dental implants', 'Check-ups'], booking: opts.booking ?? 'https://cal.com/acme', house: false, emailRegex });
    out.push([m, r.text, r.lead]); history.push({ role: 'user', parts: [{ text: m }] }, { role: 'model', parts: [{ text: r.text }] });
  }
  return out;
};
const show = (o) => o.forEach(([m, t, l]) => console.log(`> ${m}\n< ${t.replace(/\n/g, ' | ')}${l ? `\n  LEAD ${JSON.stringify(l)}` : ''}`));
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
let o = run(['hello', '2', "I'm Priya Shah", 'priya at gmail', 'priya@clinic.com', 'about £4k', 'by March', 'thanks!']);
ok('lists the services first', /1\. Teeth whitening/.test(o[0][1]));
ok('re-asks a bad email', /doesn't look like an email/.test(o[3][1]));
const lead1 = o.find(x => x[2])?.[2];
ok('lead after timeline (number pick → service)', lead1 && lead1.name === 'Priya Shah' && lead1.email === 'priya@clinic.com' && lead1.service === 'Dental implants' && lead1.budget === 'about £4k', JSON.stringify(lead1));
ok('ends with the booking link, not LinkedIn', o[6][1].includes('https://cal.com/acme') && !o[6][1].includes('LINKEDIN'));
o = run(['how much is teeth whitening?', 'tom@x.com', 'Tom', 'not sure', 'asap']);
const lead2 = o.find(x => x[2])?.[2];
ok('email typed at the name step is kept; service matched from the first message', lead2 && lead2.email === 'tom@x.com' && lead2.name === 'Tom' && lead2.service === 'Teeth whitening' && lead2.budget === 'Not sure', JSON.stringify(lead2));
o = run(['We need a new logo for our cafe', 'Ana', 'ana@x.com', '500', 'next month'], { services: [], booking: '' });
const lead3 = o.find(x => x[2])?.[2];
ok('no services list: first message is the need; no booking line', lead3 && lead3.service.includes('logo') && !o[4][1].includes('Book'), JSON.stringify(lead3));
