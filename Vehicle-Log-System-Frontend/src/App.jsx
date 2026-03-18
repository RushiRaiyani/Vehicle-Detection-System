import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layout/MainLayout.jsx';
import Home from './pages/Home.jsx';
import Collections from './pages/Collections.jsx';
import CollectionDetails from './pages/CollectionDetails.jsx';
import Upload from './pages/Upload.jsx';
import About from './pages/About.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public auth routes without layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Main Layout routes */}
          <Route path="/" element={<MainLayout />}>
            {/* Public routes */}
            <Route index element={<Home />} />
            <Route path="upload" element={<Upload />} />
            <Route path="about" element={<About />} />

            {/* Protected routes */}
            <Route path="collections" element={
              <ProtectedRoute>
                <Collections />
              </ProtectedRoute>
            } />
            <Route path="collections/:id" element={
              <ProtectedRoute>
                <CollectionDetails />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
