const express = require("express");
const mongoose = require("mongoose");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

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

module.exports = router;
