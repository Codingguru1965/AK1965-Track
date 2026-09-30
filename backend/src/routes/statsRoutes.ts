import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';
import { Activity } from '../models/Activity.js';
import mongoose from 'mongoose';

const router = Router();

router.get('/', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const stats = await Activity.aggregate([
      { $match: { userId: objectId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: '$distance' },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$calories' },
          totalSteps: { $sum: '$steps' },
          totalWorkouts: { $sum: 1 },
          longestDistance: { $max: '$distance' },
          maxDuration: { $max: '$duration' },
        },
      },
    ]);

    const result = stats[0] || {
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      totalSteps: 0,
      totalWorkouts: 0,
      longestDistance: 0,
      maxDuration: 0,
    };

    res.status(200).json({
      success: true,
      stats: result,
    });
  } catch (error: any) {
    console.error('[Stats] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats' });
  }
});

export default router;
