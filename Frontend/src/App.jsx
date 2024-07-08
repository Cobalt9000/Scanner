import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ReportsPage from './Pages/Reports/ReportsPage';
import Overview from './Pages/Overview/Overview';
import Chatbot from './Pages/Chatbot/Chatbot';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="overview" element={<Overview />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="chatbot" element={<Chatbot />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;