/**
 * Reference data only: the trades the platform supports and common area names for quick selection.
 * Workers, bookings, prices and reviews all come from the database.
 */
import type { IconName } from '../ui/Icon';

export type ServiceId = 'electrician' | 'plumber' | 'ac' | 'carpenter' | 'mechanic' | 'painter' | 'mason' | 'other';

export const SERVICES: { id: ServiceId; name: string; ur: string; icon: IconName; blurb: string }[] = [
  { id: 'electrician', name: 'Electrician', ur: 'الیکٹریشن', icon: 'zap', blurb: 'Wiring, DB boxes, fans, lights, UPS' },
  { id: 'plumber', name: 'Plumber', ur: 'پلمبر', icon: 'drop', blurb: 'Leaks, taps, motors, geysers, drains' },
  { id: 'ac', name: 'AC Technician', ur: 'اے سی ٹیکنیشن', icon: 'snow', blurb: 'Service, gas refill, installation' },
  { id: 'carpenter', name: 'Carpenter', ur: 'بڑھئی', icon: 'hammer', blurb: 'Doors, locks, cabinets, furniture repair' },
  { id: 'mechanic', name: 'Mechanic', ur: 'مکینک', icon: 'car', blurb: 'Car & bike repair at your doorstep' },
  { id: 'painter', name: 'Painter', ur: 'پینٹر', icon: 'roller', blurb: 'Rooms, touch-ups, weather coat' },
  { id: 'mason', name: 'Mason', ur: 'مستری', icon: 'brick', blurb: 'Tiles, plaster, small construction' },
  { id: 'other', name: 'Other skilled work', ur: 'دیگر ہنرمند کام', icon: 'more', blurb: 'Welding, glass, gardening and more' },
];

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id) ?? SERVICES[SERVICES.length - 1];

/** Common areas in Islamabad / Rawalpindi, offered as quick picks. People can also type their own. */
export const AREAS = ['G-9', 'G-10', 'G-11', 'G-13', 'F-7', 'F-8', 'F-10', 'F-11', 'I-8', 'E-11', 'Bahria Town', 'Saddar, Rawalpindi', 'Satellite Town'];
