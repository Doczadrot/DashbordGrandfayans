import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { DetailsPage } from './pages/DetailsPage';
import { WriteOffAnalysis } from './pages/WriteOffAnalysis';

function App() {
  // При каждом полном старте приложения очищаем список уже загруженных файлов,
  // чтобы в dev/тестовой среде можно было повторно загружать те же файлы
  React.useEffect(() => {
    try {
      localStorage.removeItem('uploaded-files-v1');
    } catch (err) {
      console.error('APP: Error clearing uploaded files storage on app start', err);
    }
  }, []);

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