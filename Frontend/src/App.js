import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Loader from './Components/Loader';
import LoginPage from './Components/Login';
import { Holder } from './Components/Holder';
import { UserProvider } from './Components/Context/UserContext';
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Router>
        <UserProvider>
          <ToastContainer position="top-center" autoClose={1500} toastClassName="custom-toast" bodyClassName="custom-toast-body"  />
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/holder" element={<Holder />} />
        </Routes>
    </UserProvider>
      </Router>
  );
}

export default App;



