import type { ComponentType } from 'react';
import WebW01Landing from './web/W01Landing';
import WebW02SignIn from './web/W02SignIn';
import WebW03CustomerHome from './web/W03CustomerHome';
import WebW04Voice from './web/W04Voice';
import WebW05Discovery from './web/W05Discovery';
import WebW06WorkerProfile from './web/W06WorkerProfile';
import WebW07JobRequest from './web/W07JobRequest';
import WebW08PriceAgreement from './web/W08PriceAgreement';
import WebW09ActiveBooking from './web/W09ActiveBooking';
import WebW10WorkerDashboard from './web/W10WorkerDashboard';
import WebW11WorkerOnboarding from './web/W11WorkerOnboarding';
import WebW12Review from './web/W12Review';
import WebW13Admin from './web/W13Admin';
import WebU01LandingUrdu from './web/U01LandingUrdu';
import WebU03CustomerHomeUrdu from './web/U03CustomerHomeUrdu';
import WebU04VoiceUrdu from './web/U04VoiceUrdu';
import WebU05DiscoveryUrdu from './web/U05DiscoveryUrdu';
import WebU08PriceUrdu from './web/U08PriceUrdu';
import WebU10WorkerDashboardUrdu from './web/U10WorkerDashboardUrdu';
import WebU11OnboardingUrdu from './web/U11OnboardingUrdu';
import MobileS01Splash from './mobile/S01Splash';
import MobileS02Welcome from './mobile/S02Welcome';
import MobileS03Language from './mobile/S03Language';
import MobileS04Role from './mobile/S04Role';
import MobileS05Phone from './mobile/S05Phone';
import MobileS06OTP from './mobile/S06OTP';
import MobileS07WorkerIntro from './mobile/S07WorkerIntro';
import MobileS08Trades from './mobile/S08Trades';
import MobileS24CustomerHome from './mobile/S24CustomerHome';
import MobileS25VoiceReady from './mobile/S25VoiceReady';
import MobileS26VoiceListening from './mobile/S26VoiceListening';
import MobileS27VoiceProcessing from './mobile/S27VoiceProcessing';
import MobileS28VoiceConfirm from './mobile/S28VoiceConfirm';
import MobileS29VoiceError from './mobile/S29VoiceError';
import MobileS29bMicDenied from './mobile/S29bMicDenied';

export type Screen = { slug: string; label: string; Component: ComponentType };

export const webScreens: Screen[] = [
  { slug: "w01-landing", label: "W01 Landing", Component: WebW01Landing },
  { slug: "w02-sign-in", label: "W02 Sign in", Component: WebW02SignIn },
  { slug: "w03-customer-home", label: "W03 Customer Home", Component: WebW03CustomerHome },
  { slug: "w04-voice", label: "W04 Voice", Component: WebW04Voice },
  { slug: "w05-discovery", label: "W05 Discovery", Component: WebW05Discovery },
  { slug: "w06-worker-profile", label: "W06 Worker Profile", Component: WebW06WorkerProfile },
  { slug: "w07-job-request", label: "W07 Job Request", Component: WebW07JobRequest },
  { slug: "w08-price-agreement", label: "W08 Price Agreement", Component: WebW08PriceAgreement },
  { slug: "w09-active-booking", label: "W09 Active Booking", Component: WebW09ActiveBooking },
  { slug: "w10-worker-dashboard", label: "W10 Worker Dashboard", Component: WebW10WorkerDashboard },
  { slug: "w11-worker-onboarding", label: "W11 Worker Onboarding", Component: WebW11WorkerOnboarding },
  { slug: "w12-review", label: "W12 Review", Component: WebW12Review },
  { slug: "w13-admin", label: "W13 Admin", Component: WebW13Admin },
  { slug: "u01-landing-urdu", label: "U01 Landing Urdu", Component: WebU01LandingUrdu },
  { slug: "u03-customer-home-urdu", label: "U03 Customer Home Urdu", Component: WebU03CustomerHomeUrdu },
  { slug: "u04-voice-urdu", label: "U04 Voice Urdu", Component: WebU04VoiceUrdu },
  { slug: "u05-discovery-urdu", label: "U05 Discovery Urdu", Component: WebU05DiscoveryUrdu },
  { slug: "u08-price-urdu", label: "U08 Price Urdu", Component: WebU08PriceUrdu },
  { slug: "u10-worker-dashboard-urdu", label: "U10 Worker Dashboard Urdu", Component: WebU10WorkerDashboardUrdu },
  { slug: "u11-onboarding-urdu", label: "U11 Onboarding Urdu", Component: WebU11OnboardingUrdu },
];

export const mobileScreens: Screen[] = [
  { slug: "s01-splash", label: "S01 Splash", Component: MobileS01Splash },
  { slug: "s02-welcome", label: "S02 Welcome", Component: MobileS02Welcome },
  { slug: "s03-language", label: "S03 Language", Component: MobileS03Language },
  { slug: "s04-role", label: "S04 Role", Component: MobileS04Role },
  { slug: "s05-phone", label: "S05 Phone", Component: MobileS05Phone },
  { slug: "s06-otp", label: "S06 OTP", Component: MobileS06OTP },
  { slug: "s07-worker-intro", label: "S07 Worker intro", Component: MobileS07WorkerIntro },
  { slug: "s08-trades", label: "S08 Trades", Component: MobileS08Trades },
  { slug: "s24-customer-home", label: "S24 Customer Home", Component: MobileS24CustomerHome },
  { slug: "s25-voice-ready", label: "S25 Voice ready", Component: MobileS25VoiceReady },
  { slug: "s26-voice-listening", label: "S26 Voice listening", Component: MobileS26VoiceListening },
  { slug: "s27-voice-processing", label: "S27 Voice processing", Component: MobileS27VoiceProcessing },
  { slug: "s28-voice-confirm", label: "S28 Voice confirm", Component: MobileS28VoiceConfirm },
  { slug: "s29-voice-error", label: "S29 Voice error", Component: MobileS29VoiceError },
  { slug: "s29b-mic-denied", label: "S29b Mic denied", Component: MobileS29bMicDenied },
];
