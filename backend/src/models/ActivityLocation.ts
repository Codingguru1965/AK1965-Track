import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLocation extends Document {
  activityId: string; // clientActivityId
  userId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  accuracy?: number;
  timestamp: Date;
  sequenceNumber: number;
}

const ActivityLocationSchema = new Schema<IActivityLocation>(
  {
    activityId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    altitude: {
      type: Number,
      default: 0,
    },
    speed: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

ActivityLocationSchema.index({ activityId: 1, sequenceNumber: 1 });

export const ActivityLocation = mongoose.model<IActivityLocation>('ActivityLocation', ActivityLocationSchema);
