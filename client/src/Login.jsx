import { useState } from "react";

function Login({ onSelect }) {
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);

  if (showDoctorForm) {
    return <DoctorLogin onBack={() => setShowDoctorForm(false)} />;
  }

  if (showPatientForm) {
    return <PatientLogin onBack={() => setShowPatientForm(false)} />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Automated Prescription System</h1>
        <p className="subtitle">Digitize prescriptions. Reduce errors.</p>

        <div className="role-selector">
          <button
            className="role-button doctor-button"
            onClick={() => setShowDoctorForm(true)}
          >
            <span className="role-icon">👨‍⚕️</span>
            <span className="role-name">Doctor</span>
            <span className="role-desc">Manage prescriptions</span>
          </button>

          <button
            className="role-button patient-button"
            onClick={() => setShowPatientForm(true)}
          >
            <span className="role-icon">👤</span>
            <span className="role-name">Patient</span>
            <span className="role-desc">View prescriptions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function DoctorLogin({ onBack }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    specialization: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLoginMode ? "login" : "register";
      const payload = isLoginMode
        ? { email: form.email, password: form.password }
        : form;

      const response = await fetch(`/api/auth/doctor/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", "doctor");
      localStorage.setItem("user", JSON.stringify(data.doctor));
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <h2>Doctor {isLoginMode ? "Login" : "Registration"}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginMode && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Dr. John Smith"
                  required
                />
              </div>

              <div className="form-group">
                <label>License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={form.licenseNumber}
                  onChange={handleChange}
                  placeholder="License #"
                  required
                />
              </div>

              <div className="form-group">
                <label>Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Cardiology"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="doctor@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? "Please wait..." : isLoginMode ? "Login" : "Register"}
          </button>
        </form>

        <p className="toggle-mode">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="toggle-button"
          >
            {isLoginMode ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

function PatientLogin({ onBack }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationInfo, setRegistrationInfo] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLoginMode ? "login" : "register";
      const payload = isLoginMode
        ? { email: form.email, password: form.password }
        : form;

      const response = await fetch(`/api/auth/patient/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", "patient");
      localStorage.setItem("user", JSON.stringify(data.patient));

      if (isLoginMode) {
        window.location.reload();
      } else {
        setRegistrationInfo({
          patientId: data.patient?.patientId,
          email: data.patient?.email,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <h2>Patient {isLoginMode ? "Login" : "Registration"}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {registrationInfo && (
            <div className="success-message">
              <p>
                Registration successful. Your Patient ID is:
                <strong> {registrationInfo.patientId || "N/A"}</strong>
              </p>
              <button
                type="button"
                className="submit-button"
                onClick={() => window.location.reload()}
              >
                Continue to Dashboard
              </button>
            </div>
          )}
          {!isLoginMode && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="patient@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? "Please wait..." : isLoginMode ? "Login" : "Register"}
          </button>
        </form>

        <p className="toggle-mode">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="toggle-button"
          >
            {isLoginMode ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
