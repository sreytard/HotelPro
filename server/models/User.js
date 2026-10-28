const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true, maxlength: 20 },
    role: { type: String, enum: ['guest', 'staff', 'admin'], default: 'guest' },
    // Email verification (only enforced when an email provider is configured)
    emailVerified: { type: Boolean, default: true },
    verifyTokenHash: { type: String, select: false },
    verifyTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password whenever it changes
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
