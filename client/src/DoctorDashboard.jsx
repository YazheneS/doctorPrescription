import { useEffect, useMemo, useState } from "react";

function DoctorDashboard({ user, token, onLogout }) {
  const [form, setForm] = useState({
    patientId: "",
    patientName: "",
    medication: "",
    dosage: "",
    frequency: "",
    notes: "",
    status: "submitted",
  });
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const requiredMissing = useMemo(() => {
    return (
      !form.patientId.trim() ||
      !form.medication.trim() ||
      !form.dosage.trim() ||
      !form.frequency.trim()
    );
  }, [form]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePatientSelect = (patientId, patientName) => {
    setForm((prev) => ({ ...prev, patientId, patientName }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (requiredMissing) {
      setError("Fill in all required fields");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const saved = await response.json();
      setPrescriptions((prev) => [saved, ...prev]);
      setForm({
        patientId: "",
        patientName: "",
        medication: "",
        dosage: "",
        frequency: "",
        notes: "",
        status: "submitted",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, Dr. {user.name}</h1>
          <p>Manage prescriptions for your patients</p>
        </div>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <main className="dashboard-grid">
        <section className="prescription-form">
          <h2>Create New Prescription</h2>

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Patient ID *</label>
              <input
                type="text"
                name="patientId"
                value={form.patientId}
                onChange={handleChange}
                placeholder="PT-abc123-xyz9"
              />
              <small className="text-muted-small">
                Enter the Patient ID provided after patient registration.
              </small>
            </div>

            <div className="form-group">
              <label>Patient Name (optional)</label>
              <input
                type="text"
                name="patientName"
                value={form.patientName}
                onChange={handleChange}
                placeholder="Patient name"
                list="patients-list"
              />
              <datalist id="patients-list">
                <option value="">Search patients...</option>
              </datalist>
              {form.patientName && (
                <small className="text-success">
                  Patient name recorded for reference.
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Medication *</label>
              <input
                type="text"
                name="medication"
                value={form.medication}
                onChange={handleChange}
                placeholder="e.g., Amoxicillin"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Dosage *</label>
                <input
                  type="text"
                  name="dosage"
                  value={form.dosage}
                  onChange={handleChange}
                  placeholder="e.g., 500 mg"
                  required
                />
              </div>

              <div className="form-group">
                <label>Frequency *</label>
                <input
                  type="text"
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  placeholder="e.g., Twice daily"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Special instructions or warnings"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="submitted">Submitted</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {error && <div className="error">{error}</div>}

            <button
              type="submit"
              disabled={saving || requiredMissing}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Create Prescription"}
            </button>
          </form>
        </section>

        <section className="prescriptions-list">
          <h2>Recent Prescriptions</h2>

          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : prescriptions.length === 0 ? (
            <p className="text-muted">No prescriptions yet</p>
          ) : (
            <div className="cards">
              {prescriptions.map((rx) => (
                <div key={rx._id} className="card">
                  <div className="card-header">
                    <h3>{rx.medication}</h3>
                    <span className={`badge ${rx.status}`}>{rx.status}</span>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <div>
                        <span className="label">Patient</span>
                        <p className="value">{rx.patientName}</p>
                      </div>
                      <div>
                        <span className="label">Dosage & Frequency</span>
                        <p className="value">
                          {rx.dosage} · {rx.frequency}
                        </p>
                      </div>
                    </div>

                    {rx.notes && (
                      <div className="card-notes">
                        <span className="label">Notes</span>
                        <p>{rx.notes}</p>
                      </div>
                    )}

                    <div className="card-footer">
                      {rx.patientId && rx.patientId.email && (
                        <small>Patient: {rx.patientId.email}</small>
                      )}
                      {rx.createdAt && (
                        <small>
                          {new Date(rx.createdAt).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DoctorDashboard;
