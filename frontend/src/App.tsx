import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { CustomerLayout, PublicLayout, WorkerLayout } from './app/layouts';
import { StoreProvider } from './app/store';
import { ToastProvider } from './ui/kit';
import { ForWorkers, Help, HowItWorks, Landing, NotFound, Services } from './pages/public';
import SignIn from './pages/public/SignIn';
import Home, { Bookings, Saved } from './pages/customer/Home';
import Voice from './pages/customer/Voice';
import Workers, { WorkerProfile } from './pages/customer/Workers';
import { Booking, DemoShortcut, JobRequest, Review } from './pages/customer/Booking';
import { Dashboard, Jobs, Profile, Reviews, Setup } from './pages/worker';
import DesignGallery from './design/DesignGallery';
import Onboarding from './pages/worker/Onboarding';
import VoiceNavigation from './ui/VoiceNavigation';

function Routed() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return (
    <>
    {/* Pages animate in on mount. Navigation never waits on exit animations, so it can't get stuck
    // when the browser throttles animation frames (background tabs, low-power mode). */}
      <Routes location={location}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/services" element={<Services />} />
          <Route path="/for-workers" element={<ForWorkers />} />
          <Route path="/help" element={<Help />} />
        </Route>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/join" element={<Onboarding />} />
        <Route path="/app" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="voice" element={<Voice />} />
          <Route path="workers" element={<Workers />} />
          <Route path="workers/:id" element={<WorkerProfile />} />
          <Route path="request/:workerId" element={<JobRequest />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:id" element={<Booking />} />
          <Route path="bookings/:id/review" element={<Review />} />
          <Route path="saved" element={<Saved />} />
          <Route path="demo/bhaai-rate" element={<DemoShortcut feature="bhaai-rate" />} />
          <Route path="demo/sos" element={<DemoShortcut feature="sos" />} />
          <Route path="help" element={<Help />} />
        </Route>
        <Route path="/work" element={<WorkerLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="setup" element={<Setup />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/design/*" element={<DesignGallery />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <div className="ambient" />
        <Routed />
        <VoiceNavigation />
      </ToastProvider>
    </StoreProvider>
  );
}
