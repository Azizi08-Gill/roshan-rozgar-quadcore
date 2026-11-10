/**
 * SEEDED DEMO DATA. There are no real users during the hackathon; everything here is invented.
 * Locations are real sectors of Islamabad / Rawalpindi; coordinates are approximate (x/y on the demo map, 0–100).
 */
import type { IconName } from '../ui/Icon';

export type ServiceId = 'electrician' | 'plumber' | 'ac' | 'carpenter' | 'mechanic' | 'painter' | 'mason' | 'other';

export const SERVICES: { id: ServiceId; name: string; ur: string; icon: IconName; blurb: string; from: number }[] = [
  { id: 'electrician', name: 'Electrician', ur: 'الیکٹریشن', icon: 'zap', blurb: 'Wiring, DB boxes, fans, lights, UPS', from: 800 },
  { id: 'plumber', name: 'Plumber', ur: 'پلمبر', icon: 'drop', blurb: 'Leaks, taps, motors, geysers, drains', from: 700 },
  { id: 'ac', name: 'AC Technician', ur: 'اے سی ٹیکنیشن', icon: 'snow', blurb: 'Service, gas refill, installation', from: 1500 },
  { id: 'carpenter', name: 'Carpenter', ur: 'بڑھئی', icon: 'hammer', blurb: 'Doors, locks, cabinets, furniture repair', from: 900 },
  { id: 'mechanic', name: 'Mechanic', ur: 'مکینک', icon: 'car', blurb: 'Car & bike repair at your doorstep', from: 1000 },
  { id: 'painter', name: 'Painter', ur: 'پینٹر', icon: 'roller', blurb: 'Rooms, touch-ups, weather coat', from: 2500 },
  { id: 'mason', name: 'Mason', ur: 'مستری', icon: 'brick', blurb: 'Tiles, plaster, small construction', from: 1800 },
  { id: 'other', name: 'Other skilled work', ur: 'دیگر ہنرمند کام', icon: 'more', blurb: 'Welding, glass, gardening and more', from: 600 },
];

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id) ?? SERVICES[0];

export type Review = { by: string; when: string; rating: 'good' | 'okay' | 'bad'; text: string; voice?: boolean };

export type Worker = {
  id: string;
  name: string;
  initials: string;
  service: ServiceId;
  area: string;
  km: number;
  years: number;
  jobs: number;
  rating: number;
  reviews: Review[];
  skills: string[];
  intro: string;
  x: number;
  y: number;
  isNew?: boolean;
};

export const WORKERS: Worker[] = [
  { id: 'ahmed', name: 'Ahmed Khan', initials: 'AK', service: 'electrician', area: 'G-10, G-11', km: 1.8, years: 8, jobs: 22, rating: 4.8, x: 46, y: 46,
    skills: ['House wiring', 'Fan & light fitting', 'UPS / inverter', 'DB box'],
    intro: '“Main aath saal se wiring ka kaam kar raha hoon. Time pe aata hoon, kaam saaf karta hoon.”',
    reviews: [
      { by: 'Fatima N.', when: '2 Nov', rating: 'good', text: 'Time pe aaye, poori wiring check ki aur saaf kaam kiya.', voice: true },
      { by: 'Kamran R.', when: '19 Oct', rating: 'good', text: 'Price pehle bata di thi, wahi li. Recommend karunga.' },
      { by: 'Hina S.', when: '3 Oct', rating: 'okay', text: 'Kaam acha tha, thori der se pohnche.' },
    ] },
  { id: 'bilal', name: 'Bilal Ahmed', initials: 'BA', service: 'plumber', area: 'G-9, G-10', km: 2.4, years: 6, jobs: 14, rating: 4.6, x: 64, y: 30,
    skills: ['Pipe leakage', 'Water motor', 'Geyser', 'Bathroom fittings'],
    intro: '“Leakage ho ya motor, ek call karein. G-9 aur G-10 mein jaldi pohnch jata hoon.”',
    reviews: [
      { by: 'Sana A.', when: '14 Oct', rating: 'good', text: 'Kitchen ka leak aadhe ghante mein theek.', voice: true },
      { by: 'Usman T.', when: '1 Oct', rating: 'good', text: 'Saaf kaam, munasib rate.' },
    ] },
  { id: 'usman', name: 'Usman Ali', initials: 'UA', service: 'carpenter', area: 'G-10, F-10', km: 1.2, years: 5, jobs: 0, rating: 0, x: 34, y: 62, isNew: true,
    skills: ['Door repair', 'Locks', 'Kitchen cabinets'],
    intro: '“Darwaze, taale, cabinets — lakri ka har kaam.”', reviews: [] },
  { id: 'imran', name: 'Imran Shah', initials: 'IS', service: 'ac', area: 'F-8, G-8', km: 3.1, years: 10, jobs: 31, rating: 4.9, x: 74, y: 60,
    skills: ['AC service', 'Gas refill', 'Installation', 'Inverter AC'],
    intro: '“Das saal se AC ka kaam. Inverter AC ka mahir.”',
    reviews: [
      { by: 'Ayesha K.', when: '28 Sep', rating: 'good', text: 'AC ab bilkul theek thanda kar raha hai.', voice: true },
      { by: 'Zain M.', when: '12 Sep', rating: 'good', text: 'Professional aur imandaar.' },
    ] },
  { id: 'naveed', name: 'Naveed Iqbal', initials: 'NI', service: 'electrician', area: 'G-11, F-11', km: 2.9, years: 12, jobs: 40, rating: 4.7, x: 22, y: 34,
    skills: ['Solar setup', 'House wiring', 'Generator change-over'],
    intro: '“Solar aur wiring dono ka kaam. Barah saal ka tajurba.”',
    reviews: [{ by: 'Rabia J.', when: '20 Oct', rating: 'good', text: 'Solar panel lagaya, sab samjhaya bhi.' }] },
  { id: 'tariq', name: 'Tariq Mehmood', initials: 'TM', service: 'painter', area: 'I-8, G-9', km: 4.2, years: 15, jobs: 27, rating: 4.5, x: 82, y: 24,
    skills: ['Room paint', 'Weather coat', 'Polish'],
    intro: '“Ghar ko naya bana deta hoon — saaf aur waqt par.”',
    reviews: [{ by: 'Omar F.', when: '5 Oct', rating: 'okay', text: 'Rang acha, kaam ek din zyada laga.' }] },
  { id: 'shahid', name: 'Shahid Hussain', initials: 'SH', service: 'mechanic', area: 'Saddar, Rawalpindi', km: 3.6, years: 9, jobs: 18, rating: 4.6, x: 56, y: 80,
    skills: ['Car battery', 'Bike repair', 'Engine tuning'],
    intro: '“Gari ya bike — ghar par aa kar theek karta hoon.”',
    reviews: [{ by: 'Ali R.', when: '9 Oct', rating: 'good', text: 'Battery ghar par aa kar badal di.' }] },
  { id: 'rashid', name: 'Rashid Mirza', initials: 'RM', service: 'mason', area: 'G-13, G-14', km: 5.0, years: 20, jobs: 35, rating: 4.8, x: 12, y: 74,
    skills: ['Tile work', 'Plaster', 'Boundary wall'],
    intro: '“Bees saal se chinai aur tiles ka kaam.”',
    reviews: [{ by: 'Nadia P.', when: '30 Sep', rating: 'good', text: 'Bathroom tiles bohat saaf lagaye.' }] },
  { id: 'kashif', name: 'Kashif Raza', initials: 'KR', service: 'plumber', area: 'F-10, F-11', km: 3.3, years: 7, jobs: 19, rating: 4.4, x: 30, y: 18,
    skills: ['Drain cleaning', 'Taps & mixers', 'Tank cleaning'],
    intro: '“Naali band ho ya tanki ki safai — sab kaam.”',
    reviews: [{ by: 'Bushra H.', when: '11 Oct', rating: 'okay', text: 'Kaam theek, rate thora zyada.' }] },
];

export const workerById = (id: string) => WORKERS.find((w) => w.id === id);

/** Simple keyword matcher for Urdu / Roman Urdu / English job descriptions → service. */
const KEYWORDS: Record<ServiceId, string[]> = {
  electrician: ['bijli', 'wiring', 'light', 'trip', 'fan', 'pankha', 'switch', 'ups', 'socket', 'electric', 'بجلی', 'وائرنگ', 'پنکھا', 'لائٹ'],
  plumber: ['pani', 'paani', 'leak', 'pipe', 'nal', 'tap', 'motor', 'geyser', 'drain', 'naali', 'پانی', 'لیک', 'پائپ', 'نل'],
  ac: ['ac', 'a.c', 'thanda', 'cooling', 'gas', 'aircon', 'اے سی', 'ٹھنڈا'],
  carpenter: ['darwaza', 'door', 'lock', 'taala', 'cabinet', 'lakri', 'wood', 'furniture', 'دروازہ', 'تالا', 'لکڑی'],
  mechanic: ['gari', 'gaari', 'car', 'bike', 'engine', 'battery', 'گاڑی', 'بائیک'],
  painter: ['paint', 'rang', 'colour', 'color', 'deewar', 'رنگ', 'پینٹ'],
  mason: ['tile', 'tiles', 'plaster', 'cement', 'chinai', 'wall', 'ٹائل', 'پلستر'],
  other: [],
};

export function detectService(text: string): ServiceId | null {
  const t = text.toLowerCase();
  let best: ServiceId | null = null;
  let score = 0;
  for (const [id, words] of Object.entries(KEYWORDS) as [ServiceId, string[]][]) {
    const s = words.filter((w) => t.includes(w)).length;
    if (s > score) { score = s; best = id; }
  }
  return best;
}

export const SAMPLE_PROMPTS = [
  'Ghar ki wiring ka masla hai, lights baar baar trip ho rahi hain',
  'Kitchen ka nal leak kar raha hai',
  'AC thanda nahi kar raha',
  'Darwaze ka taala kharab ho gaya hai',
];

export const AREAS = ['G-9', 'G-10', 'G-11', 'G-13', 'F-7', 'F-8', 'F-10', 'F-11', 'I-8', 'E-11', 'Bahria Town', 'Saddar, Rawalpindi', 'Satellite Town'];
