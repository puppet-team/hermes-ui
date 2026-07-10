import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Skills } from './pages/Skills'
import { SkillEdit } from './pages/SkillEdit'
import { SkillDetail } from './pages/SkillDetail'
import { Backups } from './pages/Backups'
import { Settings } from './pages/Settings'
import { Jobs } from './pages/Jobs'
import { JobEdit } from './pages/JobEdit'
import { Models } from './pages/Models'
import { Channels } from './pages/Channels'
import { Gateways } from './pages/Gateways'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route index element={<Skills />} />
                <Route path="skills/new" element={<SkillEdit />} />
                <Route path="skills/:id/edit" element={<SkillEdit />} />
                <Route path="skills/:id" element={<SkillDetail />} />
                <Route path="backups" element={<Backups />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/new" element={<JobEdit />} />
                <Route path="jobs/:id/edit" element={<JobEdit />} />
                <Route path="models" element={<Models />} />
                <Route path="channels" element={<Channels />} />
                <Route path="gateways" element={<Gateways />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
