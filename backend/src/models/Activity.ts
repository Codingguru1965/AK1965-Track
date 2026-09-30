import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  clientActivityId: string;
  userId: mongoose.Types.ObjectId;
  activityType: 'running' | 'walking' | 'cycling';
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  distance: number; // in meters
  avgSpeed: number; // in km/h
  avgPace: number; // in seconds/km
  calories: number; // in kcal
  steps: number;
  status: 'completed' | 'discarded';
  syncStatus: 'synced';
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    clientActivityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ['running', 'walking', 'cycling'],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
    },
    avgSpeed: {
      type: Number,
      default: 0,
    },
    avgPace: {
      type: Number,
      default: 0,
    },
    calories: {
      type: Number,
      default: 0,
    },
    steps: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['completed', 'discarded'],
      default: 'completed',
    },
    syncStatus: {
      type: String,
      default: 'synced',
    },
  },
  {
    timestamps: true,
  }
);

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
