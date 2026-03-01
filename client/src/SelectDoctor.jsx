import { useEffect, useState } from "react";

function SelectDoctor({ user, token, onDoctorSelected, onLogout }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, [token]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch("/api/auth/patient/doctors");
      if (!response.ok) throw new Error("Failed to load doctors");
      const data = await response.json();
      setDoctors(data);
      setError("");
    } catch (err) {
      setError(err.message);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doctor.email &&
        doctor.email.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleDoctorSelect = async (doctor) => {
    setSelecting(true);
    try {
      const response = await fetch("/api/auth/patient/select-doctor", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ doctorId: doctor._id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const data = await response.json();
      onDoctorSelected({
        doctorId: doctor._id,
        doctorName: doctor.name,
        doctorDetails: doctor,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="select-doctor-page">
      <div className="select-doctor-container">
        <div className="select-doctor-header">
          <div>
            <h1>Select Your Doctor</h1>
            <p className="subtitle">Choose a doctor for your consultation</p>
          </div>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>

        <div className="select-doctor-content">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading-state">
              <p>Loading doctors...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="empty-state">
              {doctors.length === 0 ? (
                <div>
                  <h3>No Doctors Available</h3>
                  <p>No doctors are currently available for consultation.</p>
                </div>
              ) : (
                <div>
                  <h3>No Results</h3>
                  <p>No doctors match your search. Try a different query.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="doctors-grid">
              {filteredDoctors.map((doctor) => (
                <button
                  key={doctor._id}
                  className="doctor-card"
                  onClick={() => handleDoctorSelect(doctor)}
                  disabled={selecting}
                >
                  <div className="doctor-card-header">
                    <h3>{doctor.name}</h3>
                    <span className="specialization-badge">
                      {doctor.specialization}
                    </span>
                  </div>
                  <div className="doctor-card-body">
                    {doctor.email && (
                      <div className="doctor-detail">
                        <span className="label">Email</span>
                        <p>{doctor.email}</p>
                      </div>
                    )}
                  </div>
                  <div className="doctor-card-footer">
                    <span className="action-text">
                      {selecting ? "Selecting..." : "Select →"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SelectDoctor;
