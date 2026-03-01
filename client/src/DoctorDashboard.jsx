import { useEffect, useMemo, useState } from "react";

function DoctorDashboard({
  user,
  token,
  selectedPatient,
  onLogout,
  onBackToSelection,
}) {
  const [form, setForm] = useState({
    medication: "",
    dosage: "",
    frequency: "",
    notes: "",
    status: "submitted",
  });
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Pre-fill patient ID and name from selected patient
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientPrescriptions();
    }
  }, [selectedPatient, token]);

  const fetchPatientPrescriptions = async () => {
    try {
      const response = await fetch("/api/prescriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load prescriptions");
      const allPrescriptions = await response.json();

      // Filter to only show prescriptions for the selected patient
      const filtered = allPrescriptions.filter(
        (rx) =>
          rx.patientId._id === selectedPatient.patientDetails._id ||
          rx.patientId === selectedPatient.patientDetails._id,
      );
      setPatientPrescriptions(filtered);
    } catch (err) {
      console.error("Error fetching patient prescriptions:", err.message);
    }
  };

  const requiredMissing = useMemo(() => {
    return (
      !form.medication.trim() || !form.dosage.trim() || !form.frequency.trim()
    );
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (requiredMissing) {
      setError("Fill in all required fields");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.patientId,
          patientName: selectedPatient.patientName,
          ...form,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const saved = await response.json();
      setPatientPrescriptions((prev) => [saved, ...prev]);
      setForm({
        medication: "",
        dosage: "",
        frequency: "",
        notes: "",
        status: "submitted",
      });
      setSuccessMessage("Prescription created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doctor-prescription-page">
      <header className="prescription-header">
        <div className="header-left">
          <button onClick={onBackToSelection} className="back-button">
            ← Back to Patient Selection
          </button>
          <div className="header-title">
            <h1>Create Prescription</h1>
            <p className="selected-patient">
              Patient: <strong>{selectedPatient.patientName}</strong> (
              {selectedPatient.patientId})
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <main className="prescription-main">
        <section className="medical-history-panel">
          <h2>Patient Medical History</h2>

          {selectedPatient.patientDetails?.previousMedicationHistory?.length >
            0 && (
            <div className="uploaded-history-block">
              <h3>Uploaded Previous Medication Documents</h3>
              <div className="uploaded-medications-list">
                {selectedPatient.patientDetails.previousMedicationHistory
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.uploadedAt).getTime() -
                      new Date(a.uploadedAt).getTime(),
                  )
                  .slice(0, 5)
                  .map((entry) => (
                    <div
                      key={
                        entry._id ||
                        `${entry.sourceFileName}-${entry.uploadedAt}`
                      }
                      className="history-card"
                    >
                      <div className="history-card-header">
                        <h4>{entry.sourceFileName || "Uploaded document"}</h4>
                        <span className="patient-id-badge">
                          {entry.uploadedAt
                            ? new Date(entry.uploadedAt).toLocaleDateString()
                            : "Date N/A"}
                        </span>
                      </div>
                      <p className="text-muted-small">
                        Parsed by: {entry.parsedBy || "rule-based"}
                        {entry.detectedLanguage
                          ? ` • Language: ${entry.detectedLanguage}`
                          : ""}
                      </p>
                      {entry.medications?.length ? (
                        entry.medications
                          .slice(0, 6)
                          .map((medication, index) => (
                            <p
                              key={`${medication.rawLine}-${index}`}
                              className="text-muted-small"
                            >
                              {medication.name || "Medication"}
                              {medication.dosage
                                ? ` • ${medication.dosage}`
                                : ""}
                              {medication.frequency
                                ? ` • ${medication.frequency}`
                                : ""}
                              {medication.route ? ` • ${medication.route}` : ""}
                              {medication.duration
                                ? ` • ${medication.duration}`
                                : ""}
                              {medication.indication
                                ? ` • ${medication.indication}`
                                : ""}
                            </p>
                          ))
                      ) : (
                        <p className="text-muted-small">
                          OCR completed, but no structured medications were
                          found.
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {patientPrescriptions.length === 0 ? (
            <div className="empty-history">
              <p>No previous prescriptions for this patient</p>
            </div>
          ) : (
            <div className="history-list">
              {patientPrescriptions.map((rx) => (
                <div key={rx._id} className="history-card">
                  <div className="history-card-header">
                    <h4>{rx.medication}</h4>
                    <span className={`badge ${rx.status}`}>{rx.status}</span>
                  </div>
                  <div className="history-card-body">
                    <div className="detail-row">
                      <span className="detail-label">Dosage</span>
                      <span className="detail-value">{rx.dosage}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Frequency</span>
                      <span className="detail-value">{rx.frequency}</span>
                    </div>
                    {rx.notes && (
                      <div className="detail-row">
                        <span className="detail-label">Notes</span>
                        <span className="detail-value">{rx.notes}</span>
                      </div>
                    )}
                    <div className="detail-row date">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="prescription-form-panel">
          <h2>New Prescription</h2>

          <form onSubmit={handleSubmit} className="form">
            <div className="patient-info-display">
              <div className="info-badge">
                <span className="label">Patient Name</span>
                <p>{selectedPatient.patientName}</p>
              </div>
              <div className="info-badge">
                <span className="label">Patient ID</span>
                <p>{selectedPatient.patientId}</p>
              </div>
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

            {error && <div className="error-message">{error}</div>}
            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            <button
              type="submit"
              disabled={saving || requiredMissing}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Create Prescription"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default DoctorDashboard;
