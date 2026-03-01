import { useEffect, useState } from "react";
import "./App.css";
import Login from "./Login";
import SelectPatient from "./SelectPatient";
import SelectDoctor from "./SelectDoctor";
import DoctorDashboard from "./DoctorDashboard";
import PatientDashboard from "./PatientDashboard";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedRole && storedUser) {
      setToken(storedToken);
      setRole(storedRole);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken(null);
    setRole(null);
    setUser(null);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setIsAuthenticated(false);
  };

  const handlePatientSelection = (patientInfo) => {
    setSelectedPatient(patientInfo);
  };

  const handleDoctorSelection = (doctorInfo) => {
    setSelectedDoctor(doctorInfo);
  };

  const handleBackToPatientSelection = () => {
    setSelectedPatient(null);
  };

  const handleBackToDoctorSelection = () => {
    setSelectedDoctor(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onSelect={() => setIsAuthenticated(true)} />;
  }

  if (role === "doctor") {
    if (!selectedPatient) {
      return (
        <SelectPatient
          user={user}
          token={token}
          onPatientSelected={handlePatientSelection}
          onLogout={handleLogout}
        />
      );
    }
    return (
      <DoctorDashboard
        user={user}
        token={token}
        selectedPatient={selectedPatient}
        onLogout={handleLogout}
        onBackToSelection={handleBackToPatientSelection}
      />
    );
  }

  if (role === "patient") {
    return (
      <PatientDashboard user={user} token={token} onLogout={handleLogout} />
    );
  }

  return <div>Unknown role</div>;
}

export default App;
