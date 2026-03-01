import { useEffect, useState } from "react";

function SelectPatient({ user, token, onPatientSelected, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPatients();
  }, [token]);

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/prescriptions/doctor/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load patients");
      const data = await response.json();
      setPatients(data);
      setError("");
    } catch (err) {
      setError(err.message);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      patient.name?.toLowerCase().includes(query) ||
      patient.patientId?.toLowerCase().includes(query)
    );
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const aLatest = a.consultationDate
      ? new Date(a.consultationDate).getTime()
      : a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
    const bLatest = b.consultationDate
      ? new Date(b.consultationDate).getTime()
      : b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

    if (aLatest !== bLatest) {
      return bLatest - aLatest;
    }

    return a.name.localeCompare(b.name);
  });

  const handlePatientSelect = (patient) => {
    onPatientSelected({
      patientId: patient.patientId,
      patientName: patient.name,
      patientDetails: patient,
    });
  };

  return (
    <div className="select-patient-page">
      <div className="select-patient-container">
        <div className="select-patient-header">
          <div>
            <h1>Select Patient</h1>
            <p className="subtitle">Choose a patient to create prescription</p>
          </div>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>

        <div className="select-patient-content">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search by patient name or patient ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading-state">
              <p>Loading patients...</p>
            </div>
          ) : sortedPatients.length === 0 ? (
            <div className="empty-state">
              {patients.length === 0 ? (
                <div>
                  <h3>No Patients Yet</h3>
                  <p>
                    You haven't created any prescriptions yet. Create one by
                    entering a new patient's ID.
                  </p>
                </div>
              ) : (
                <div>
                  <h3>No Results</h3>
                  <p>No patients match your search. Try a different query.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="patients-grid">
              {sortedPatients.map((patient) => (
                <button
                  key={patient._id}
                  className="patient-card"
                  onClick={() => handlePatientSelect(patient)}
                >
                  <div className="patient-card-header">
                    <h3>{patient.name}</h3>
                    <div className="patient-badges">
                      {patient.consultedBefore ? (
                        <span className="consulted-badge">
                          CONSULTED BEFORE
                        </span>
                      ) : (
                        <span className="new-badge">NEW</span>
                      )}
                      <span className="patient-id-badge">
                        {patient.patientId}
                      </span>
                    </div>
                  </div>
                  <div className="patient-card-body">
                    {patient.email && (
                      <div className="patient-detail">
                        <span className="label">Email</span>
                        <p>{patient.email}</p>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="patient-detail">
                        <span className="label">Phone</span>
                        <p>{patient.phone}</p>
                      </div>
                    )}
                    {patient.dateOfBirth && (
                      <div className="patient-detail">
                        <span className="label">Date of Birth</span>
                        <p>
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="patient-card-footer">
                    <span className="action-text">Select →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="new-patient-section">
          <p className="text-muted">
            Not in the list? Enter their Patient ID in the prescription form
            after selecting.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SelectPatient;
