const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const createPatientId = () =>
  `PT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const PatientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    patientId: {
      type: String,
      unique: true,
      trim: true,
      default: createPatientId,
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    medicalHistory: {
      type: String,
      default: "",
      trim: true,
    },
    allergies: {
      type: String,
      default: "",
      trim: true,
    },
    selectedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },
    consultationDate: {
      type: Date,
      default: null,
    },
    previousMedicationHistory: [
      {
        sourceFileName: {
          type: String,
          trim: true,
          default: "",
        },
        sourceMimeType: {
          type: String,
          trim: true,
          default: "",
        },
        extractedText: {
          type: String,
          trim: true,
          default: "",
        },
        medications: [
          {
            name: {
              type: String,
              trim: true,
              default: "",
            },
            dosage: {
              type: String,
              trim: true,
              default: "",
            },
            frequency: {
              type: String,
              trim: true,
              default: "",
            },
            route: {
              type: String,
              trim: true,
              default: "",
            },
            duration: {
              type: String,
              trim: true,
              default: "",
            },
            indication: {
              type: String,
              trim: true,
              default: "",
            },
            instructions: {
              type: String,
              trim: true,
              default: "",
            },
            confidence: {
              type: Number,
              min: 0,
              max: 1,
              default: null,
            },
            rawLine: {
              type: String,
              trim: true,
              default: "",
            },
          },
        ],
        detectedLanguage: {
          type: String,
          trim: true,
          default: "",
        },
        parsedBy: {
          type: String,
          trim: true,
          default: "rule-based",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

// Hash password before saving
PatientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
PatientSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

// Remove password from response
PatientSchema.methods.toJSON = function () {
  const doc = this.toObject();
  delete doc.password;
  return doc;
};

module.exports = mongoose.model("Patient", PatientSchema);
