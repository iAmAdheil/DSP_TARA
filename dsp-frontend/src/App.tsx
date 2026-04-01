import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { AuthPage } from './pages/AuthPage';
import { ProjectWorkspace } from './pages/ProjectWorkspace';
import { SystemIngestion } from './pages/SystemIngestion';
import { ThreatGeneration } from './pages/ThreatGeneration';
import { CVEMatching } from './pages/CVEMatching';
import { RiskPrioritization } from './pages/RiskPrioritization';
import { MitigationPlanner } from './pages/MitigationPlanner';

import { ModelExplorer } from './pages/ModelExplorer';
import { AttackPaths } from './pages/AttackPaths';
import { SubsystemExplorer } from './pages/SubsystemExplorer';
import { ReportsExport } from './pages/ReportsExport';
import { RunHistory } from './pages/RunHistory';

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Shell />}>
        {/* Module Routes */}
        <Route index element={<ProjectWorkspace />} />
        <Route path="ingestion" element={<SystemIngestion />} />
        <Route path="explorer" element={<ModelExplorer />} />
        <Route path="threats" element={<ThreatGeneration />} />
        <Route path="cve" element={<CVEMatching />} />
        <Route path="paths" element={<AttackPaths />} />
        <Route path="risks" element={<RiskPrioritization />} />
        <Route path="mitigations" element={<MitigationPlanner />} />
        <Route path="subsystems" element={<SubsystemExplorer />} />
        <Route path="reports" element={<ReportsExport />} />
        <Route path="history" element={<RunHistory />} />
      </Route>
    </Routes>
  );
}

export default App;
