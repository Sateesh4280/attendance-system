import mongoose from 'mongoose';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];

const recordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: 'present',
    },
    remark: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false },
);

const attendanceSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    records: {
      type: [recordSchema],
      validate: {
        validator: (records) => Array.isArray(records) && records.length > 0,
        message: 'At least one attendance record is required',
      },
    },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// One attendance sheet per class + subject + day.
attendanceSchema.index({ class: 1, subject: 1, date: 1 }, { unique: true });

attendanceSchema.statics.countsFor = (records = []) =>
  records.reduce(
    (acc, record) => {
      acc.total += 1;
      acc[record.status] += 1;
      if (record.status === 'present' || record.status === 'late') acc.attended += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0, excused: 0, attended: 0 },
  );

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
