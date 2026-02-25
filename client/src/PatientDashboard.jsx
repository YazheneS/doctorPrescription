import { useEffect, useState } from "react";

function PatientDashboard({ user, token, onLogout }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPrescriptions();
  }, [token]);

  const fetchPrescriptions = async () => {
    try {
      const response = await fetch("/api/prescriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load prescriptions");
      const data = await response.json();
      setPrescriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p>Your Medical Prescriptions</p>
        </div>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <main className="patient-dashboard">
        <section className="prescriptions-list full-width">
          <h2>Your Prescriptions</h2>

          {error && <div className="error">{error}</div>}

          {loading ? (
            <p className="text-muted">Loading your prescriptions...</p>
          ) : prescriptions.length === 0 ? (
            <div className="empty-state">
              <p className="text-muted">No prescriptions yet</p>
              <p className="text-muted-small">
                Your doctors' prescriptions will appear here
              </p>
            </div>
          ) : (
            <div className="cards">
              {prescriptions.map((rx) => (
                <div key={rx._id} className="card prescription-card">
                  <div className="card-header">
                    <div>
                      <h3>{rx.medication}</h3>
                      <p className="card-subtext">{rx.dosage}</p>
                    </div>
                    <span className={`badge ${rx.status}`}>{rx.status}</span>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <div>
                        <span className="label">Doctor</span>
                        <p className="value">{rx.doctorName}</p>
                        {rx.doctorId && rx.doctorId.specialization && (
                          <p className="text-muted-small">
                            {rx.doctorId.specialization}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="label">Frequency</span>
                        <p className="value">{rx.frequency}</p>
                      </div>

                      <div>
                        <span className="label">Prescribed</span>
                        <p className="value">
                          {rx.createdAt
                            ? new Date(rx.createdAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {rx.notes && (
                      <div className="card-notes">
                        <span className="label">Special Instructions</span>
                        <p>{rx.notes}</p>
                      </div>
                    )}

                    <div className="card-info">
                      <div className="info-item">
                        <span className="label">Status</span>
                        <p className={`status-badge ${rx.status}`}>
                          {rx.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button className="btn-secondary">Download PDF</button>
                    <button className="btn-secondary">Print</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="patient-info">
          <h3>Your Information</h3>
          <div className="info-block">
            {user.patientId && (
              <p>
                <strong>Patient ID:</strong> {user.patientId}
              </p>
            )}
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            {user.phone && (
              <p>
                <strong>Phone:</strong> {user.phone}
              </p>
            )}
            {user.address && (
              <p>
                <strong>Address:</strong> {user.address}
              </p>
            )}
            {user.allergies && (
              <p>
                <strong>Allergies:</strong> {user.allergies}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default PatientDashboard;
