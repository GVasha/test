import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import CallConsole from './pages/CallConsole.jsx';
import Results from './pages/Results.jsx';
import Tracks from './pages/Tracks.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <div className="brand-name">Collecta</div>
            <div className="brand-sub">Loan recovery ops</div>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/contacts">Contacts</NavLink>
          <NavLink to="/campaigns">Campaigns</NavLink>
          <NavLink to="/call">Call Console</NavLink>
          <NavLink to="/results">Results</NavLink>
          <NavLink to="/tracks">Tracks</NavLink>
        </nav>
        <div className="sidebar-foot">Simulated outbound calls · v1</div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/call" element={<CallConsole />} />
          <Route path="/call/:callId" element={<CallConsole />} />
          <Route path="/results" element={<Results />} />
          <Route path="/tracks" element={<Tracks />} />
        </Routes>
      </main>
    </div>
  );
}
