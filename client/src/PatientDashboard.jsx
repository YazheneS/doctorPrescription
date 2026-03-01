import { useEffect, useState } from "react";

function PatientDashboard({ user, token, onLogout }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingLastPrescription, setDownloadingLastPrescription] =
    useState(false);

  // Doctor selection state
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorError, setDoctorError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchPrescriptions();
    fetchMedicalHistory();
  }, [token]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch("/api/auth/patient/doctors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load doctors");
      const data = await response.json();
      setDoctors(data);
      setDoctorError("");
    } catch (err) {
      setDoctorError(err.message);
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

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

  const fetchMedicalHistory = async () => {
    try {
      const response = await fetch(
        "/api/prescriptions/patient/medical-history",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Failed to load medical history");
      const data = await response.json();
      setMedicalHistory(data);
      setHistoryError("");
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUploadMedicalDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setHistoryError("Please choose a medical document file first.");
      return;
    }

    setUploading(true);
    setHistoryError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);

      const response = await fetch(
        "/api/prescriptions/patient/upload-medical-document",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload medical document");
      }

      setMedicalHistory((prev) => [data.history, ...prev]);
      setSelectedFile(null);
      setUploadSuccess("Medical document uploaded and processed successfully.");
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDoctorSelect = async (doctor) => {
    setSelecting(true);
    setDoctorError("");
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

      setSelectedDoctor({
        doctorId: doctor._id,
        doctorName: doctor.name,
        doctorDetails: doctor,
      });
      setDoctorError("");
    } catch (err) {
      setDoctorError(err.message);
    } finally {
      setSelecting(false);
    }
  };

  const handleDownloadMedicalReport = async () => {
    setDownloadingReport(true);
    setHistoryError("");

    try {
      const response = await fetch(
        "/api/prescriptions/patient/medical-history-report",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to download medical report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medical-history-${user.patientId || "report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadLastPrescription = async () => {
    setDownloadingLastPrescription(true);
    setHistoryError("");

    try {
      const response = await fetch(
        "/api/prescriptions/patient/last-prescription-report",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to download last prescription");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `last-prescription-${user.patientId || "report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setDownloadingLastPrescription(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doctor.email &&
        doctor.email.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="patient-dashboard-page">
      <header className="patient-dashboard-header">
        <div className="header-left">
          <div className="header-title">
            <h1>Welcome, {user.name}</h1>
            {selectedDoctor && (
              <p className="selected-doctor">
                Current Consultation:{" "}
                <strong>{selectedDoctor.doctorName}</strong>
              </p>
            )}
          </div>
        </div>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <main className="patient-main">
        <section className="select-doctor-section full-width">
          <h2>Request Consultation</h2>
          <p className="section-subtitle">
            Select a doctor to request consultation or follow-up
          </p>

          <div className="search-section">
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {doctorError && <div className="error-message">{doctorError}</div>}

          {doctorsLoading ? (
            <p className="text-muted">Loading doctors...</p>
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
                      {selecting ? "Requesting..." : "Request Consultation →"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="patient-medical-documents full-width">
          <div className="medical-documents-header">
            <h2>Previous Medication History</h2>
          </div>

          <form
            onSubmit={handleUploadMedicalDocument}
            className="medical-upload-form"
          >
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading
                ? "Processing with Azure OCR..."
                : "Upload Medical Document"}
            </button>
          </form>

          {uploadSuccess && (
            <div className="success-message">{uploadSuccess}</div>
          )}
          {historyError && <div className="error-message">{historyError}</div>}

          {historyLoading ? (
            <p className="text-muted">Loading medical document history...</p>
          ) : medicalHistory.length === 0 ? (
            <div className="empty-state">
              <p className="text-muted">No medical documents uploaded yet.</p>
            </div>
          ) : (
            <div className="medical-history-upload-list">
              {medicalHistory.map((entry) => (
                <article
                  key={
                    entry._id || `${entry.sourceFileName}-${entry.uploadedAt}`
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
                    <div className="uploaded-medications-list">
                      {entry.medications.map((medication, index) => (
                        <div
                          key={`${medication.rawLine}-${index}`}
                          className="medication-item"
                        >
                          <p>
                            <strong>{medication.name || "Medication"}</strong>
                            {medication.dosage ? ` • ${medication.dosage}` : ""}
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
                          {medication.instructions ? (
                            <p className="text-muted-small">
                              Instructions: {medication.instructions}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-small">
                      No structured medications detected. OCR text was captured.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

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
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleDownloadLastPrescription}
                      disabled={downloadingLastPrescription}
                    >
                      {downloadingLastPrescription
                        ? "Preparing PDF..."
                        : "Download Last Prescription PDF"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleDownloadMedicalReport}
                      disabled={downloadingReport}
                    >
                      {downloadingReport
                        ? "Preparing PDF..."
                        : "Download Full Medical History PDF"}
                    </button>
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
