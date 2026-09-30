import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';
import { Activity } from '../models/Activity.js';
import { ActivityLocation } from '../models/ActivityLocation.js';

const router = Router();

// Idempotent sync endpoint
router.post('/sync', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activities, locations } = req.body;
    const userId = req.user?.userId;

    const syncedActivityIds: string[] = [];

    if (Array.isArray(activities) && activities.length > 0) {
      for (const act of activities) {
        await Activity.findOneAndUpdate(
          { clientActivityId: act.clientActivityId },
          {
            ...act,
            userId,
            syncStatus: 'synced',
          },
          { upsert: true, new: true }
        );
        syncedActivityIds.push(act.clientActivityId);
      }
    }

    if (Array.isArray(locations) && locations.length > 0) {
      // Bulk write locations idempotently
      const bulkOps = locations.map((loc) => ({
        updateOne: {
          filter: {
            activityId: loc.activityId,
            sequenceNumber: loc.sequenceNumber,
          },
          update: {
            $set: {
              ...loc,
              userId,
            },
          },
          upsert: true,
        },
      }));
      await ActivityLocation.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      syncedCount: syncedActivityIds.length,
      syncedActivityIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Activities] Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Activity sync failed',
      error: error.message,
    });
  }
});

// List activities
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;

    const query: any = { userId };
    if (type && type !== 'all') {
      query.activityType = type;
    }

    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      activities,
    });
  } catch (error: any) {
    console.error('[Activities] List error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve activities' });
  }
});

export default router;
