import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import StudentProfile from './pages/StudentProfile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/student/:id" element={<StudentProfile />} />
      </Routes>
    </Router>
  );
}

export default App;