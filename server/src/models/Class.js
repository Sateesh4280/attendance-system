import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Class code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Class code cannot exceed 20 characters'],
    },
    section: { type: String, default: 'A', uppercase: true, trim: true },
    academicYear: { type: String, default: '2025-2026', trim: true },
    room: { type: String, trim: true, default: '' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

classSchema.virtual('label').get(function label() {
  return `${this.name} - ${this.section}`;
});

const Class = mongoose.model('Class', classSchema);

export default Class;
