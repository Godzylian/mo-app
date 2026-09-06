import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import HomePage from './pages/Home';
import Settings from './pages/Settings';
import NetworkPage from './pages/Network';
import BookingsPage from './pages/Bookings';
import AuditionsPage from './pages/Auditions';
import CreatePostPage from './pages/CreatePost';
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
      {/* Network routes */}
      <Route 
        path="/network" 
        element={
          user ? <NetworkPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/my-network" 
        element={
          user ? <NetworkPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/my network" 
        element={
          user ? <NetworkPage /> : <Navigate to="/login" replace />
        } 
      />

      {/* Bookings routes */}
      <Route 
        path="/bookings" 
        element={
          user ? <BookingsPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/active-bookings" 
        element={
          user ? <BookingsPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/active bookings" 
        element={
          user ? <BookingsPage /> : <Navigate to="/login" replace />
        } 
      />

      {/* Auditions routes */}
      <Route 
        path="/auditions" 
        element={
          user ? <AuditionsPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/active-auditions" 
        element={
          user ? <AuditionsPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/active auditions" 
        element={
          user ? <AuditionsPage /> : <Navigate to="/login" replace />
        } 
      />

      {/* Create Post / Studio Upload routes */}
      <Route 
        path="/create-post" 
        element={
          user ? <CreatePostPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/post-mo" 
        element={
          user ? <CreatePostPage /> : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/post" 
        element={
          user ? <CreatePostPage /> : <Navigate to="/login" replace />
        } 
      />
    </Routes>
  );
}

export default App;
