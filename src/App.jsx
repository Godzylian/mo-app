import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import HomePage from './pages/Home';
import Settings from './pages/Settings';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/" replace /> : <SignIn />
        } 
      />
      <Route 
        path="/" 
        element={
          user ? <HomePage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/settings" 
        element={
          user ? <Settings /> : <Navigate to="/login" replace />
        } 
      />
    </Routes>
  );
}

export default App;
