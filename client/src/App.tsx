import { Link, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HealthPage from './pages/HealthPage';
import { FileUpload } from './components/FileUpload'; // Import added here

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <nav className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link className="text-sm font-semibold" to="/">
              my-pern-app
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <button className="p-2 hover:bg-accent rounded-md flex items-center gap-2">
                Home
              </button>
            </Link>
            <Link to="/health">
              <button className="p-2 hover:bg-accent rounded-md flex items-center gap-2">
                Health
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl p-6">
        
        {/* The File Upload Component */}
        <div className="mb-8">
          <FileUpload />
        </div>

        {/* Your page routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/health" element={<HealthPage />} />
        </Routes>
        
      </main>
    </div>
  );
}