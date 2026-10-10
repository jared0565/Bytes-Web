const { scriptedTurn } = await import('./bundle.mjs');
const emailRegex = /[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,190}\.[a-zA-Z]{2,24}/;
const DENTAL = ['Teeth whitening', 'Dental implants', 'Check-ups'], AGENCY = ['SEO', 'Web design', 'Check-ups'];
const run = (msgs, opts = {}) => {
  const history = []; const out = [];
  for (const m of msgs) {
    const r = scriptedTurn({ message: m, history, companyName: opts.company ?? 'Acme Dental', services: opts.services ?? DENTAL, booking: opts.booking ?? 'https://cal.com/acme', house: !!opts.house, emailRegex });
    out.push([m, r.text, r.lead]); history.push({ role: 'user', parts: [{ text: m }] }, { role: 'model', parts: [{ text: r.text }] });
  }
  return out;
};
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const asksEmail = t => /email[^.!]*\?/i.test(t);

// A full chat that opens with a greeting: need, name and email, timeline, budget, close
let o = run(['hello', '2', 'Priya Shah, priya@clinic.com', 'by March', 'about £4k', 'thanks!']);
ok('lists the services first', /1\. Teeth whitening/.test(o[0][1]));
ok('asks for name and email in one question', /name and the best email/.test(o[1][1]), o[1][1]);
ok('lead is saved when the email arrives (message 3), with the picked service', o[2][2] && o[2][2].name === 'Priya Shah' && o[2][2].email === 'priya@clinic.com' && o[2][2].service === 'Dental implants' && !o[1][2], JSON.stringify(o[2][2]));
ok('then mentions the confirmation email and asks the timeline', /confirm/.test(o[2][1]) && /when would you like this done\?/.test(o[2][1]), o[2][1]);
ok('then asks the budget', /budget do you have in mind/.test(o[3][1]), o[3][1]);
ok('finishes within 5 messages, with the booking link and no LinkedIn', /That's everything, Priya/.test(o[4][1]) && o[4][1].includes('https://cal.com/acme') && !o[4][1].includes('LINKEDIN'), o[4][1]);
ok('the lead is updated with budget and timeline', o[4][2] && o[4][2].budget === 'about £4k' && /by March/.test(o[4][2].summary), JSON.stringify(o[4][2]));
ok('after the close it only confirms', /has your details/.test(o[5][1]) && !/\?/.test(o[5][1]), o[5][1]);

// Leaving right after giving the email still leaves a lead
o = run(['web design', 'Sam', 'sam@x.com'], { services: AGENCY });
ok('name alone: asks only for the email', asksEmail(o[1][1]) && !/your name/.test(o[1][1]) && !o[1][2], o[1][1]);
ok('lead saved at the email, before timeline and budget', o[2][2] && o[2][2].email === 'sam@x.com' && o[2][2].name === 'Sam' && o[2][2].service === 'Web design', JSON.stringify(o[2][2]));

// Service matching
o = run(['I need SEO for my shop', 'Sam sam@x.com'], { services: AGENCY });
ok('a short service name (SEO) in the first message is matched, no list shown', !/closest to what you need/.test(o[0][1]) && o[1][2]?.service === 'SEO', JSON.stringify([o[0][1], o[1][2]]));
o = run(['can you check my order status?', 'Sam sam@x.com'], { services: AGENCY });
ok('"check my order status" is not matched to "Check-ups"', o[1][2] && o[1][2].service !== 'Check-ups', JSON.stringify(o[1][2]));
o = run(['I need a new website for my bakery', 'Sam sam@x.com'], { services: AGENCY });
ok('a described need is accepted even when a services list exists', !/closest to what you need/.test(o[0][1]) && /bakery/.test(o[1][2]?.service || ''), JSON.stringify([o[0][1], o[1][2]]));
o = run(['hi there'], { services: [] });
ok('a greeting is not a need', /What can we help you with today\?/.test(o[0][1]), o[0][1]);

// A service tapped in the chat box arrives as its exact name
const tapped = (list) => list.filter(sv => { const t = run([sv, 'Sam Lee, sam@x.com'], { services: list }); return !/name and the best email/.test(t[0][1]) || t[1][2]?.service !== sv; });
ok('every listed service sent as it is goes straight to name and email, and becomes the lead\'s service', !tapped(DENTAL).length && !tapped(AGENCY).length, [...tapped(DENTAL), ...tapped(AGENCY)].join());
const OVERLAP = ['Web design and hosting', 'Web design', 'Our service', 'SEO for you'];
ok('an exact name wins over a longer service that shares its words, and a name made of common words still matches', !tapped(OVERLAP).length, tapped(OVERLAP).join());
o = run(['  web   DESIGN ', 'Sam sam@x.com'], { services: OVERLAP });
ok('the exact match ignores case and spacing', o[1][2]?.service === 'Web design', JSON.stringify(o[1][2]));

// Questions and names
o = run(['how much is teeth whitening?', 'tom@x.com']);
ok('a question gets an honest reply, not "that\'s helpful"', /can't answer that here/.test(o[0][1]) && !/helpful/.test(o[0][1]) && /name and the best email/.test(o[0][1]), o[0][1]);
ok('email without a name: lead saved as Visitor, service from the question, moves on to timeline', o[1][2] && o[1][2].name === 'Visitor' && o[1][2].service === 'Teeth whitening' && /when would you like this done\?/.test(o[1][1]), JSON.stringify([o[1][1], o[1][2]]));
o = run(['web design', 'why do you need my name?', 'sam@x.com'], { services: AGENCY });
ok('a question is never taken as a name', !/, why/i.test(o[1][1]) && /can't answer that here/.test(o[1][1]) && o[2][2]?.name === 'Visitor', JSON.stringify([o[1][1], o[2][2]]));
o = run(['web design', 'Sam Lee, sam@x.com'], { services: AGENCY });
ok('name and email in one message are both kept', o[1][2]?.name === 'Sam Lee' && /when would you like this done\?/.test(o[1][1]) && !/your name/.test(o[1][1]), JSON.stringify([o[1][1], o[1][2]]));

// The email is asked for twice at most
o = run(['web design', 'Sam', 'I would rather not', 'no', 'stop asking', 'ok it is sam@x.com'], { services: AGENCY });
ok('after two asks it stops and offers the booking link', /No problem/.test(o[2][1]) && o[2][1].includes('https://cal.com/acme') && !asksEmail(o[2][1]), o[2][1]);
ok('and never asks for the email again', !asksEmail(o[3][1]) && !asksEmail(o[4][1]), JSON.stringify([o[3][1], o[4][1]]));
ok('an email given later is still taken', o[5][2]?.email === 'sam@x.com' && o[5][2]?.name === 'Sam', JSON.stringify(o[5][2]));

// What ends up on the lead
o = run(['I need a website, email me at sam@shop.co', 'asap'], { services: AGENCY });
ok('need and email in one message: the need is kept clean and later answers do not leak into it', o[0][2]?.service === 'I need a website' && /^Need: I need a website\. Timeline: asap\./.test(o[1][2]?.summary), JSON.stringify(o[1][2]));
o = run(['hi', 'hello', 'ok', 'Sam', 'sam@shop.co'], { services: AGENCY });
ok('a name is never recorded as the need', o[4][2]?.name === 'Sam' && o[4][2]?.service === 'Not yet specified', JSON.stringify(o[4][2]));
o = run(['SEO', "Hi, I'm Dr. Ana O'Neil and my email is ana@clinic.org"], { services: AGENCY });
ok('a title is not used as the first name', o[1][2]?.name === "Dr. Ana O'Neil" && /^Thanks, Ana\./.test(o[1][1]), o[1][1]);
o = run(['SEO', 'test@test.com', 'ok sam@shop.co'], { services: AGENCY });
ok('a placeholder email is not taken, and is not called incomplete', !o[1][2] && asksEmail(o[1][1]) && !/complete/.test(o[1][1]) && o[2][2]?.email === 'sam@shop.co', o[1][1]);
o = run(['what do you charge?', 'are you open sunday?', 'can I call you?', 'is anyone there?', 'hello?'], { services: AGENCY, booking: '' });
ok('a visitor who only asks questions is not told "No problem"', !/No problem/.test(o[4][1]) && /contact form/.test(o[4][1]) && !asksEmail(o[4][1]), o[4][1]);

// Optional answers, confirmation wording, bots without a booking link
o = run(['web design', 'Sam sam@x.com', 'asap', 'not sure'], { services: AGENCY });
ok('"not sure" is a complete budget answer', o[3][2]?.budget === 'Not sure' && /That's everything, Sam/.test(o[3][1]), JSON.stringify(o[3][2]));
o = run(['web design', 'Sam sam@x.com'], { services: AGENCY });
ok('the confirmation sentence is also true for an address that has had the email before', /confirm your address, unless you've already had one\./.test(o[1][1]) && /when would you like this done\?/.test(o[1][1]), o[1][1]);
o = run(['We need a new logo for our cafe', 'Ana ana@x.com', 'next month', '500'], { services: [], booking: '' });
ok('no services list: the first message is the need; no booking line', o[1][2]?.service.includes('logo') && !/Book/.test(o[3][1]) && /That's everything, Ana/.test(o[3][1]), JSON.stringify([o[1][2], o[3][1]]));
o = run(['web design', 'no thanks', 'nope'], { services: AGENCY, booking: '' });
ok('without a booking link the fallback is the site\'s contact form', /No problem/.test(o[2][1]) && /contact form/.test(o[2][1]), o[2][1]);
o = run(['a website', 'no', 'no'], { services: [], company: '', house: true, booking: '' });
ok('the Bytes bot falls back to its own contact form link', o[2][1].includes('https://web.bytesfx.com/#contact') && !o[2][1].includes('LINKEDIN'), o[2][1]);
