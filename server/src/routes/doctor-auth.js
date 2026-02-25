const express = require("express");
const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Register a new doctor
router.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      licenseNumber,
      specialization,
    } = req.body;

    if (!name || !email || !password || !confirmPassword || !licenseNumber) {
      return res.status(400).json({
        message: "Name, email, password, and license number are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (existingDoctor) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const existingLicense = await Doctor.findOne({ licenseNumber });
    if (existingLicense) {
      return res
        .status(409)
        .json({ message: "License number already in use." });
    }

    const doctor = new Doctor({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      licenseNumber: licenseNumber.trim(),
      specialization: specialization ? specialization.trim() : "",
    });

    await doctor.save();

    const jwtSecret = process.env.JWT_SECRET || "your_secret_key";
    const token = jwt.sign(
      {
        id: doctor._id,
        role: "doctor",
        email: doctor.email,
        name: doctor.name,
      },
      jwtSecret,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Doctor registered successfully",
      token,
      doctor: doctor.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// Login a doctor
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const jwtSecret = process.env.JWT_SECRET || "your_secret_key";
    const token = jwt.sign(
      {
        id: doctor._id,
        role: "doctor",
        email: doctor.email,
        name: doctor.name,
      },
      jwtSecret,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      doctor: doctor.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// Get current doctor profile
router.get("/profile", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const doctor = await Doctor.findById(req.user.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(doctor.toJSON());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
