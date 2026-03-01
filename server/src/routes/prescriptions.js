const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const ALLOWED_MEDICAL_DOC_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/bmp",
  "image/tiff",
  "application/pdf",
]);

const buildDocIntelAnalyzeUrl = (endpoint) => {
  const normalized = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  return `${normalized}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;
};

const tryParseJsonObject = (raw) => {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const maybeJson = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeJson);
    } catch {
      return null;
    }
  }
};

const sanitizeMedicationItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 40)
    .map((item) => ({
      name: String(item?.name || "")
        .trim()
        .slice(0, 120),
      dosage: String(item?.dosage || "")
        .trim()
        .slice(0, 60),
      frequency: String(item?.frequency || "")
        .trim()
        .slice(0, 80),
      route: String(item?.route || "")
        .trim()
        .slice(0, 60),
      duration: String(item?.duration || "")
        .trim()
        .slice(0, 120),
      indication: String(item?.indication || "")
        .trim()
        .slice(0, 160),
      instructions: String(item?.instructions || "")
        .trim()
        .slice(0, 220),
      confidence:
        typeof item?.confidence === "number"
          ? Math.max(0, Math.min(1, item.confidence))
          : null,
      rawLine: String(item?.rawLine || item?.sourceText || "")
        .trim()
        .slice(0, 220),
    }))
    .filter(
      (entry) =>
        entry.name ||
        entry.dosage ||
        entry.frequency ||
        entry.route ||
        entry.duration ||
        entry.indication ||
        entry.instructions,
    );
};

const parseMedicationEntries = (rawText) => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const medicationHints =
    /(mg|ml|mcg|tablet|tab|capsule|cap|syrup|once|twice|daily|bid|tid|qhs|every)/i;
  const dosageRegex = /(\d+(?:\.\d+)?\s?(?:mg|ml|mcg|g|iu))/i;
  const frequencyRegex =
    /(once\s+daily|twice\s+daily|thrice\s+daily|daily|bid|tid|qhs|every\s+\d+\s*(?:hours?|days?))/i;

  return lines
    .filter((line) => medicationHints.test(line))
    .slice(0, 30)
    .map((line) => {
      const dosage = line.match(dosageRegex)?.[1] || "";
      const frequency = line.match(frequencyRegex)?.[1] || "";
      const name = line
        .replace(dosageRegex, "")
        .replace(frequencyRegex, "")
        .replace(/[-:]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);

      return {
        name,
        dosage,
        frequency,
        route: "",
        duration: "",
        indication: "",
        instructions: "",
        confidence: null,
        rawLine: line,
      };
    })
    .filter((entry) => entry.name || entry.dosage || entry.frequency);
};

const parseMedicationEntriesWithGroq = async (rawText) => {
  console.log("[Groq Parser] Starting...");

  const apiKey = process.env.GROQ_API_KEY;

  console.log("[Groq Parser] Config check:", {
    hasApiKey: !!apiKey,
  });

  if (!apiKey) {
    const error = new Error("Groq API is not configured. Set GROQ_API_KEY.");
    error.status = 503;
    throw error;
  }

  const promptText = String(rawText || "")
    .trim()
    .slice(0, 12000);
  if (!promptText) {
    console.log("[Groq Parser] No text to parse");
    return {
      detectedLanguage: "",
      medications: [],
    };
  }

  const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
  console.log("[Groq Parser] Calling Groq API...");

  const response = await fetch(groqUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You are a clinical prescription parser. Convert OCR text from handwritten or unstructured prescriptions into structured medication JSON. Understand abbreviations and multilingual text. Extract medication name, dosage, frequency, route, duration, indication, instructions, confidence, and original source line.",
        },
        {
          role: "user",
          content: `Extract medications from this OCR text and return ONLY valid JSON using this exact shape: {\n  \"detectedLanguage\": \"...\",\n  \"medications\": [\n    {\n      \"name\": \"\",\n      \"dosage\": \"\",\n      \"frequency\": \"\",\n      \"route\": \"\",\n      \"duration\": \"\",\n      \"indication\": \"\",\n      \"instructions\": \"\",\n      \"confidence\": 0.0,\n      \"rawLine\": \"\"\n    }\n  ]\n}.\n\nRules:\n- If unknown, keep empty string, not null.\n- confidence must be between 0 and 1.\n- Do not invent medications not present in text.\n- Include common medical abbreviations (po, od, bid, tid, qid, qhs, sos, prn, stat, ac, pc, hs).\n\nOCR text:\n${promptText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("[Groq Parser] Error response:", {
      status: response.status,
      statusText: response.statusText,
      message: message.slice(0, 500),
    });
    const error = new Error(`Groq parsing failed: ${message}`);
    error.status = 502;
    throw error;
  }

  console.log("[Groq Parser] Response OK, parsing...");
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  console.log("[Groq Parser] Content preview:", content?.slice(0, 200));

  const parsed = tryParseJsonObject(content);

  if (!parsed || typeof parsed !== "object") {
    console.error("[Groq Parser] Failed to parse response as JSON");
    const error = new Error("Groq returned invalid JSON content.");
    error.status = 502;
    throw error;
  }

  console.log(
    "[Groq Parser] Success. Medications:",
    parsed.medications?.length || 0,
  );
  return {
    detectedLanguage: String(parsed.detectedLanguage || "")
      .trim()
      .slice(0, 60),
    medications: sanitizeMedicationItems(parsed.medications),
  };
};

const runAzureReadOcr = async ({ fileBuffer, mimeType }) => {
  const endpoint = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOC_INTELLIGENCE_KEY;

  if (!endpoint || !apiKey) {
    const error = new Error(
      "Azure Document Intelligence is not configured. Set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY.",
    );
    error.status = 503;
    throw error;
  }

  const analyzeUrl = buildDocIntelAnalyzeUrl(endpoint);
  const submitResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": mimeType,
    },
    body: fileBuffer,
  });

  if (!submitResponse.ok) {
    const message = await submitResponse.text();
    const error = new Error(`Azure OCR submission failed: ${message}`);
    error.status = 502;
    throw error;
  }

  const operationLocation =
    submitResponse.headers.get("operation-location") ||
    submitResponse.headers.get("Operation-Location");

  if (!operationLocation) {
    const error = new Error("Azure OCR response missing operation location.");
    error.status = 502;
    throw error;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const resultResponse = await fetch(operationLocation, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!resultResponse.ok) {
      const message = await resultResponse.text();
      const error = new Error(`Azure OCR polling failed: ${message}`);
      error.status = 502;
      throw error;
    }

    const result = await resultResponse.json();
    if (result.status === "succeeded") {
      return result;
    }

    if (result.status === "failed") {
      const error = new Error("Azure OCR analysis failed.");
      error.status = 502;
      throw error;
    }
  }

  const error = new Error("Azure OCR analysis timed out.");
  error.status = 504;
  throw error;
};

const writeWrapped = (doc, label, value) => {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value || "N/A");
};

const addSectionTitle = (doc, title) => {
  if (doc.y > 710) {
    doc.addPage();
  }
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#1e293b").text(title);
  doc.moveDown(0.3);
};

const addDivider = (doc) => {
  const y = doc.y + 4;
  doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, y).lineTo(560, y).stroke();
  doc.moveDown(0.8);
};

// Get prescriptions (for doctor: all their prescriptions, for patient: their prescriptions)
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "doctor") {
      filter.doctorId = req.user.id;
    } else if (req.user.role === "patient") {
      filter.patientId = req.user.id;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const prescriptions = await Prescription.find(filter)
      .populate("doctorId", "name email specialization")
      .populate("patientId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json(prescriptions);
  } catch (error) {
    next(error);
  }
});

// Create a new prescription (doctor only)
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Only doctors can create prescriptions" });
    }

    const { patientId, medication, dosage, frequency, notes, status } =
      req.body;

    if (!patientId || !medication || !dosage || !frequency) {
      return res.status(400).json({
        message: "patientId, medication, dosage, and frequency are required.",
      });
    }

    const patientIdentifier = patientId.trim();
    let patient = null;

    if (mongoose.Types.ObjectId.isValid(patientIdentifier)) {
      patient = await Patient.findById(patientIdentifier);
    }

    if (!patient) {
      patient = await Patient.findOne({ patientId: patientIdentifier });
    }

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const prescription = await Prescription.create({
      doctorId: req.user.id,
      patientId: patient._id,
      patientName: patient.name,
      doctorName: req.user.name,
      medication: medication.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      notes: notes ? notes.trim() : "",
      status: status || "submitted",
    });

    const populated = await Prescription.findById(prescription._id)
      .populate("doctorId", "name email specialization")
      .populate("patientId", "name email phone")
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

// Get all patients for a doctor (list of patients they have prescribed to)
router.get("/doctor/patients", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can access this" });
    }

    const selectedPatients = await Patient.find(
      { selectedDoctor: req.user.id },
      "name email phone patientId address dateOfBirth selectedDoctor consultationDate createdAt previousMedicationHistory",
    ).lean();

    // Get all unique patients from doctor's prescriptions
    const prescriptions = await Prescription.find({ doctorId: req.user.id })
      .populate(
        "patientId",
        "name email phone patientId address dateOfBirth selectedDoctor consultationDate createdAt previousMedicationHistory",
      )
      .sort({ createdAt: -1 })
      .lean();

    // Extract unique patients and attach consulted status
    const patientsMap = new Map();

    selectedPatients.forEach((patient) => {
      patientsMap.set(patient._id.toString(), {
        ...patient,
        consultedBefore: false,
        lastPrescriptionAt: null,
      });
    });

    prescriptions.forEach((prescription) => {
      if (!prescription.patientId) {
        return;
      }

      const patientId = prescription.patientId._id.toString();
      const existing = patientsMap.get(patientId);

      if (!existing) {
        patientsMap.set(patientId, {
          ...prescription.patientId,
          consultedBefore: true,
          lastPrescriptionAt: prescription.createdAt,
        });
        return;
      }

      const existingLastRx = existing.lastPrescriptionAt
        ? new Date(existing.lastPrescriptionAt).getTime()
        : 0;
      const currentRx = prescription.createdAt
        ? new Date(prescription.createdAt).getTime()
        : 0;

      patientsMap.set(patientId, {
        ...existing,
        ...prescription.patientId,
        consultedBefore: true,
        lastPrescriptionAt:
          currentRx > existingLastRx
            ? prescription.createdAt
            : existing.lastPrescriptionAt,
      });
    });

    const patients = Array.from(patientsMap.values()).sort((a, b) => {
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

    res.json(patients);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/patient/medical-history",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user.role !== "patient") {
        return res
          .status(403)
          .json({ message: "Only patients can access this" });
      }

      const patient = await Patient.findById(
        req.user.id,
        "previousMedicationHistory",
      ).lean();
      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }

      const history = [...(patient.previousMedicationHistory || [])].sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );

      res.json(history);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/patient/upload-medical-document",
  authMiddleware,
  upload.single("document"),
  async (req, res, next) => {
    try {
      if (req.user.role !== "patient") {
        return res
          .status(403)
          .json({ message: "Only patients can upload documents." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Document file is required." });
      }

      if (!ALLOWED_MEDICAL_DOC_MIME_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({
          message:
            "Unsupported file type. Please upload JPG, PNG, BMP, TIFF, or PDF.",
        });
      }

      const result = await runAzureReadOcr({
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });

      const extractedText = result?.analyzeResult?.content || "";
      let medications = [];
      let detectedLanguage = "";
      let parsedBy = "rule-based";

      try {
        const aiParsed = await parseMedicationEntriesWithGroq(extractedText);
        medications = aiParsed.medications;
        detectedLanguage = aiParsed.detectedLanguage;
        parsedBy = "groq";
      } catch (error) {
        console.error(
          "[Prescription Upload] Groq parsing failed, falling back to regex:",
          error.message,
        );
        medications = [];
      }

      if (!medications.length) {
        medications = parseMedicationEntries(extractedText);
        if (!detectedLanguage) {
          detectedLanguage = "unknown";
        }
        parsedBy = "rule-based";
      }

      const historyItem = {
        sourceFileName: req.file.originalname,
        sourceMimeType: req.file.mimetype,
        extractedText: extractedText.slice(0, 10000),
        medications,
        detectedLanguage,
        parsedBy,
        uploadedAt: new Date(),
      };

      const patient = await Patient.findByIdAndUpdate(
        req.user.id,
        { $push: { previousMedicationHistory: historyItem } },
        { new: true, projection: { previousMedicationHistory: 1 } },
      ).lean();

      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }

      const latest = patient.previousMedicationHistory?.at(-1);
      res.status(201).json({
        message: "Document processed successfully.",
        history: latest,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/patient/medical-history-report",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user.role !== "patient") {
        return res
          .status(403)
          .json({ message: "Only patients can download this report." });
      }

      const patient = await Patient.findById(req.user.id)
        .populate("selectedDoctor", "name specialization email")
        .lean();

      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }

      const prescriptions = await Prescription.find({ patientId: req.user.id })
        .populate("doctorId", "name specialization email")
        .sort({ createdAt: -1 })
        .lean();

      const latestPrescription = prescriptions[0] || null;
      const uploadedHistory = [
        ...(patient.previousMedicationHistory || []),
      ].sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );

      const fileNameSafePatientId = (
        patient.patientId || patient._id.toString()
      ).replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `medical-history-${fileNameSafePatientId}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Medical History Report - ${patient.name}`,
          Author: "Automated Prescription System",
        },
      });

      doc.pipe(res);

      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor("#0f172a")
        .text("Patient Medical Report", {
          align: "center",
        });

      doc.moveDown(0.3);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#475569")
        .text(`Generated on ${new Date().toLocaleString()}`, {
          align: "center",
        });

      addDivider(doc);
      addSectionTitle(doc, "1. Patient Information");
      doc.fontSize(11).fillColor("#111827");
      writeWrapped(doc, "Patient ID", patient.patientId || "N/A");
      writeWrapped(doc, "Name", patient.name || "N/A");
      writeWrapped(doc, "Email", patient.email || "N/A");
      writeWrapped(doc, "Phone", patient.phone || "N/A");
      writeWrapped(doc, "Address", patient.address || "N/A");
      writeWrapped(doc, "Allergies", patient.allergies || "N/A");

      if (patient.selectedDoctor) {
        writeWrapped(
          doc,
          "Current Selected Doctor",
          patient.selectedDoctor.name || "N/A",
        );
        writeWrapped(
          doc,
          "Doctor Specialization",
          patient.selectedDoctor.specialization || "N/A",
        );
      }

      addDivider(doc);
      addSectionTitle(doc, "2. Last Prescription");

      if (!latestPrescription) {
        doc.font("Helvetica").fontSize(11).text("No prescriptions found.");
      } else {
        doc.font("Helvetica").fontSize(11);
        writeWrapped(doc, "Medication", latestPrescription.medication);
        writeWrapped(doc, "Dosage", latestPrescription.dosage);
        writeWrapped(doc, "Frequency", latestPrescription.frequency);
        writeWrapped(doc, "Status", latestPrescription.status);
        writeWrapped(doc, "Doctor", latestPrescription.doctorName);
        writeWrapped(
          doc,
          "Date",
          latestPrescription.createdAt
            ? new Date(latestPrescription.createdAt).toLocaleString()
            : "N/A",
        );
        writeWrapped(
          doc,
          "Special Instructions",
          latestPrescription.notes || "N/A",
        );
      }

      addDivider(doc);
      addSectionTitle(doc, "3. Prescription History");

      if (prescriptions.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(11)
          .text("No previous prescriptions available.");
      } else {
        prescriptions.forEach((entry, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .text(`${index + 1}. ${entry.medication || "Medication"}`);
          doc.font("Helvetica").fontSize(10);
          writeWrapped(doc, "Dosage", entry.dosage || "N/A");
          writeWrapped(doc, "Frequency", entry.frequency || "N/A");
          writeWrapped(doc, "Doctor", entry.doctorName || "N/A");
          writeWrapped(doc, "Status", entry.status || "N/A");
          writeWrapped(
            doc,
            "Date",
            entry.createdAt
              ? new Date(entry.createdAt).toLocaleString()
              : "N/A",
          );
          if (entry.notes) {
            writeWrapped(doc, "Notes", entry.notes);
          }
          doc.moveDown(0.5);
        });
      }

      addDivider(doc);
      addSectionTitle(doc, "4. Uploaded Medical Document History (OCR)");

      if (uploadedHistory.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(11)
          .text("No uploaded medical documents found.");
      } else {
        uploadedHistory.forEach((entry, index) => {
          if (doc.y > 690) {
            doc.addPage();
          }

          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .text(
              `${index + 1}. ${entry.sourceFileName || "Uploaded document"}`,
            );

          doc.font("Helvetica").fontSize(10);
          writeWrapped(
            doc,
            "Uploaded",
            entry.uploadedAt
              ? new Date(entry.uploadedAt).toLocaleString()
              : "N/A",
          );

          if (!entry.medications || entry.medications.length === 0) {
            doc.text("No structured medications detected from this document.");
          } else {
            entry.medications.slice(0, 20).forEach((medication) => {
              const details = [
                medication.name,
                medication.dosage,
                medication.frequency,
              ]
                .filter(Boolean)
                .join(" • ");
              doc.text(
                `- ${details || medication.rawLine || "Medication entry"}`,
              );
            });
          }

          doc.moveDown(0.6);
        });
      }

      doc.moveDown(1);
      doc
        .font("Helvetica-Oblique")
        .fontSize(9)
        .fillColor("#64748b")
        .text(
          "This report is generated by Automated Prescription System for patient reference. Please consult your doctor before changing any medication.",
        );

      doc.end();
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/patient/last-prescription-report",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user.role !== "patient") {
        return res
          .status(403)
          .json({ message: "Only patients can download this report." });
      }

      const patient = await Patient.findById(req.user.id)
        .populate("selectedDoctor", "name specialization email")
        .lean();

      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }

      const latestPrescription = await Prescription.findOne({
        patientId: req.user.id,
      })
        .populate("doctorId", "name specialization email")
        .sort({ createdAt: -1 })
        .lean();

      if (!latestPrescription) {
        return res
          .status(404)
          .json({ message: "No prescription found for this patient." });
      }

      const fileNameSafePatientId = (
        patient.patientId || patient._id.toString()
      ).replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `last-prescription-${fileNameSafePatientId}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Last Prescription - ${patient.name}`,
          Author: "Automated Prescription System",
        },
      });

      doc.pipe(res);

      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor("#0f172a")
        .text("Last Prescription Report", {
          align: "center",
        });

      doc.moveDown(0.3);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#475569")
        .text(`Generated on ${new Date().toLocaleString()}`, {
          align: "center",
        });

      addDivider(doc);
      addSectionTitle(doc, "1. Patient Information");
      doc.fontSize(11).fillColor("#111827");
      writeWrapped(doc, "Patient ID", patient.patientId || "N/A");
      writeWrapped(doc, "Name", patient.name || "N/A");
      writeWrapped(doc, "Email", patient.email || "N/A");
      writeWrapped(doc, "Phone", patient.phone || "N/A");

      addDivider(doc);
      addSectionTitle(doc, "2. Latest Prescription Details");
      doc.font("Helvetica").fontSize(11).fillColor("#111827");
      writeWrapped(doc, "Medication", latestPrescription.medication || "N/A");
      writeWrapped(doc, "Dosage", latestPrescription.dosage || "N/A");
      writeWrapped(doc, "Frequency", latestPrescription.frequency || "N/A");
      writeWrapped(doc, "Status", latestPrescription.status || "N/A");
      writeWrapped(doc, "Doctor", latestPrescription.doctorName || "N/A");
      writeWrapped(
        doc,
        "Doctor Specialization",
        latestPrescription.doctorId?.specialization || "N/A",
      );
      writeWrapped(
        doc,
        "Date",
        latestPrescription.createdAt
          ? new Date(latestPrescription.createdAt).toLocaleString()
          : "N/A",
      );
      writeWrapped(
        doc,
        "Special Instructions",
        latestPrescription.notes || "N/A",
      );

      doc.moveDown(1);
      doc
        .font("Helvetica-Oblique")
        .fontSize(9)
        .fillColor("#64748b")
        .text(
          "This report includes only the latest prescription issued for the patient.",
        );

      doc.end();
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
