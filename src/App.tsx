import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { DetailsPage } from './pages/DetailsPage';
import { WriteOffAnalysis } from './pages/WriteOffAnalysis';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/details" element={<DetailsPage />} />
        <Route path="/writeoff" element={<WriteOffAnalysis />} />
      </Routes>
    </Router>
  );
}

export default App;