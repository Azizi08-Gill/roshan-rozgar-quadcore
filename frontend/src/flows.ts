/**
 * Click-through flows between the design screens.
 *
 * Each screen maps visible text (or an aria-label) to the slug of the screen it opens.
 * The generated screen components stay untouched; ScreenPage wires these up at runtime.
 * Matchers: exact string (whitespace-normalised) or a RegExp tested against the text.
 */
export type Matcher = string | RegExp;
export type FlowLink = [Matcher[], string];
export type ScreenFlow = { links?: FlowLink[]; auto?: { to: string; ms: number } };

const TRADES_EN = ['Electrician', 'Plumber', 'AC Tech', 'AC Technician', 'Carpenter', 'Mechanic', 'Painter', 'Mason', 'Other'];
const TRADES_UR = ['الیکٹریشن', 'پلمبر', 'اے سی ٹیکنیشن', 'بڑھئی', 'مکینک', 'پینٹر', 'مستری', 'دیگر ہنرمند کام'];
const WORKERS_EN = ['AH', 'BR', 'UK', 'IS', 'AH Ahmed', 'BR Bilal', 'UK Usman', 'IS Imran', 'View Profile'];
const WORKERS_UR = ['اح', 'بل', 'عث', 'عم', 'اح احمد', 'بل بلال', 'عث عثمان', 'عم عمران', 'پروفائل دیکھیں'];

// Shared top-nav of the signed-in customer web screens.
const WEB_NAV: FlowLink[] = [
  [['Home'], 'w03-customer-home'],
  [['Find Workers'], 'w05-discovery'],
  [['Bookings'], 'w09-active-booking'],
];
const UR_NAV: FlowLink[] = [
  [['ہوم'], 'u03-customer-home-urdu'],
  [['کاریگر تلاش کریں'], 'u05-discovery-urdu'],
];

export const webFlows: Record<string, ScreenFlow> = {
  'w01-landing': { links: [
    [['I Need a Worker'], 'w03-customer-home'],
    [['I Am a Worker'], 'w11-worker-onboarding'],
    [['Sign in'], 'w02-sign-in'],
    [['Roman Urdu'], 'u01-landing-urdu'],
    [TRADES_EN, 'w05-discovery'],
  ] },
  'w02-sign-in': { links: [[['Verify & Continue'], 'w03-customer-home'], [['Roshan Rozgar'], 'w01-landing']] },
  'w03-customer-home': { links: [
    [['Tell Us What You Need'], 'w04-voice'],
    [['Or Choose a Service'], 'w05-discovery'],
    [['Open booking', 'In Progress'], 'w09-active-booking'],
    [TRADES_EN, 'w05-discovery'],
    [['AH', 'BR', 'UK'], 'w06-worker-profile'],
    ...WEB_NAV,
  ] },
  'w04-voice': { links: [
    [['Back to Home'], 'w03-customer-home'],
    [['Start Speaking', 'Choose a Service', 'Type'], 'w05-discovery'],
    [['Roman Urdu'], 'u04-voice-urdu'],
  ] },
  'w05-discovery': { links: [[WORKERS_EN, 'w06-worker-profile'], ...WEB_NAV] },
  'w06-worker-profile': { links: [[['Request This Worker'], 'w07-job-request'], ...WEB_NAV] },
  'w07-job-request': { links: [[['Send Job Request'], 'w08-price-agreement']] },
  'w08-price-agreement': { links: [
    [[/^Accept Rs/], 'w09-active-booking'],
    [['Cancel Request'], 'w03-customer-home'],
  ] },
  'w09-active-booking': { links: [
    [['Completed', 'Then you can leave a review'], 'w12-review'],
    [['Cancel Booking'], 'w03-customer-home'],
    ...WEB_NAV,
  ] },
  'w10-worker-dashboard': { links: [[['Accept & Quote'], 'w08-price-agreement']] },
  'w11-worker-onboarding': { links: [[[/^Continue/], 'w10-worker-dashboard']] },
  'w12-review': { links: [[['Submit Review'], 'w03-customer-home']] },
  'w13-admin': {},

  'u01-landing-urdu': { links: [
    [['مجھے کاریگر چاہیے'], 'u03-customer-home-urdu'],
    [['میں کاریگر ہوں'], 'u11-onboarding-urdu'],
    [['اردو'], 'w01-landing'],
    [TRADES_UR, 'u05-discovery-urdu'],
  ] },
  'u03-customer-home-urdu': { links: [
    [['بول کر بتائیں کیا چاہیے'], 'u04-voice-urdu'],
    [['یا سروس منتخب کریں'], 'u05-discovery-urdu'],
    [TRADES_UR, 'u05-discovery-urdu'],
    [['اح', 'بل', 'عث'], 'u05-discovery-urdu'],
    ...UR_NAV,
  ] },
  'u04-voice-urdu': { links: [
    [['واپس ہوم'], 'u03-customer-home-urdu'],
    [['درست ہے، کاریگر تلاش کریں', 'سروس بدلیں', 'سروس منتخب کریں'], 'u05-discovery-urdu'],
    [['اردو'], 'w04-voice'],
  ] },
  'u05-discovery-urdu': { links: [[WORKERS_UR, 'u08-price-urdu'], ...UR_NAV] },
  'u08-price-urdu': { links: [
    [[/^1,500 روپے قبول/], 'u03-customer-home-urdu'],
    [['درخواست منسوخ کریں'], 'u03-customer-home-urdu'],
  ] },
  'u10-worker-dashboard-urdu': { links: [[['قبول کریں اور قیمت دیں'], 'u08-price-urdu']] },
  'u11-onboarding-urdu': { links: [[[/^آگے بڑھیں/], 'u10-worker-dashboard-urdu']] },
};

export const mobileFlows: Record<string, ScreenFlow> = {
  's01-splash': { auto: { to: 's02-welcome', ms: 1800 } },
  's02-welcome': { links: [[['Get Started'], 's03-language']] },
  's03-language': { links: [[['Continue'], 's04-role']] },
  's04-role': { links: [
    [['Continue as Customer', 'I Need a Worker'], 's05-phone'],
    [['I Am a Worker'], 's07-worker-intro'],
  ] },
  's05-phone': { links: [[['Send OTP'], 's06-otp']] },
  's06-otp': { links: [[['Verify & Continue'], 's24-customer-home']] },
  's07-worker-intro': { links: [[['Start Registration'], 's08-trades']] },
  's08-trades': { links: [[[/^Continue/], 's05-phone']] },
  's24-customer-home': { links: [[['Tell Us What You Need'], 's25-voice-ready']] },
  's25-voice-ready': { links: [[['Start Speaking'], 's26-voice-listening'], [['Back', 'Type instead'], 's24-customer-home']] },
  's26-voice-listening': { links: [[['Stop'], 's27-voice-processing'], [['Back', 'Type instead'], 's24-customer-home']] },
  's27-voice-processing': { auto: { to: 's28-voice-confirm', ms: 2200 }, links: [[['Back', 'Type instead'], 's24-customer-home']] },
  's28-voice-confirm': { links: [
    [[/^Yes, Find/], 'w05-discovery'],
    [['Try Again'], 's25-voice-ready'],
    [['Edit Manually', 'Back'], 's24-customer-home'],
  ] },
  's29-voice-error': { links: [[['Record Again'], 's26-voice-listening'], [['Select Manually', 'Back'], 's24-customer-home']] },
  's29b-mic-denied': { links: [[['I’ve Allowed It · Try Again'], 's25-voice-ready'], [['Choose Service Manually'], 's24-customer-home']] },
};
