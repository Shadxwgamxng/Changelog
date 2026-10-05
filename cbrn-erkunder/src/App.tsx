import { Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import { useLive } from './store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Live from './pages/Live';
import Missions from './pages/Missions';
import Devices, { DevicePage } from './pages/Devices';
import Substances, { SubstanceDetail } from './pages/Substances';
import { Bio, Radionuclides } from './pages/Nuclides';
import Samples from './pages/Samples';
import Weather from './pages/Weather';
import Measurements from './pages/Measurements';
import Vehicle, { Crew } from './pages/Vehicle';
import Mlk from './pages/Mlk';
import Reports from './pages/Reports';
import History from './pages/History';
import System from './pages/System';

export default function App() {
  const { session, ready } = useLive();
  if (!ready) return null;
  if (!session) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="karte" element={<MapPage />} />
        <Route path="live" element={<Live />} />
        <Route path="auftraege" element={<Missions />} />
        <Route path="geraete" element={<Devices />} />
        <Route path="geraete/:id" element={<DevicePage />} />
        <Route path="stoffe" element={<Substances />} />
        <Route path="stoffe/:id" element={<SubstanceDetail />} />
        <Route path="radionuklide" element={<Radionuclides />} />
        <Route path="radionuklide/:id" element={<Radionuclides />} />
        <Route path="bio" element={<Bio />} />
        <Route path="bio/:id" element={<Bio />} />
        <Route path="proben" element={<Samples />} />
        <Route path="wetter" element={<Weather />} />
        <Route path="messpunkte" element={<Measurements />} />
        <Route path="fahrzeug" element={<Vehicle />} />
        <Route path="besatzung" element={<Crew />} />
        <Route path="messleitung" element={<Mlk />} />
        <Route path="berichte" element={<Reports />} />
        <Route path="historie" element={<History />} />
        <Route path="system" element={<System />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
