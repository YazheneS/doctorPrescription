const express = require("express");
const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Register a new patient
router.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      phone,
      address,
    } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const existingPatient = await Patient.findOne({
      email: email.toLowerCase(),
    });
    if (existingPatient) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const patient = new Patient({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
    });

    await patient.save();

    const jwtSecret = process.env.JWT_SECRET || "your_secret_key";
    const token = jwt.sign(
      {
        id: patient._id,
        role: "patient",
        email: patient.email,
        name: patient.name,
      },
      jwtSecret,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Patient registered successfully",
      token,
      patient: patient.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// Login a patient
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const patient = await Patient.findOne({ email: email.toLowerCase() });
    if (!patient) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await patient.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const jwtSecret = process.env.JWT_SECRET || "your_secret_key";
    const token = jwt.sign(
      {
        id: patient._id,
        role: "patient",
        email: patient.email,
        name: patient.name,
      },
      jwtSecret,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      patient: patient.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// Get current patient profile
router.get("/profile", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Access denied" });
    }

    const patient = await Patient.findById(req.user.id).populate(
      "selectedDoctor",
      "name specialization email",
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(patient.toJSON());
  } catch (error) {
    next(error);
  }
});

// Get all doctors
router.get("/doctors", async (req, res, next) => {
  try {
    const doctors = await Doctor.find({}, "name specialization email").lean();
    res.json(doctors);
  } catch (error) {
    next(error);
  }
});

// Select a doctor for consultation
router.put("/select-doctor", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required." });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Update patient's selected doctor
    const patient = await Patient.findByIdAndUpdate(
      req.user.id,
      {
        selectedDoctor: doctorId,
        consultationDate: new Date(),
      },
      { new: true },
    ).populate("selectedDoctor", "name specialization email");

    res.json({
      message: "Doctor selected successfully",
      patient: patient.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
