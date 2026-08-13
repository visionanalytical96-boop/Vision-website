import { z } from 'zod';
import { VisitStatus } from '@/generated/prisma/client';

// A phone with location switched off sends nothing; a phone indoors sends a
// wildly inaccurate fix. Both are normal, so the fields are optional and the
// accuracy is kept rather than discarded — a reading is only evidence if you
// also know how good it is.
const coordinate = z.coerce.number().finite().optional();

export const visitTransitionSchema = z.object({
  visitId: z.string().trim().min(1),
  status: z.enum(VisitStatus, { error: 'Choose a status.' }),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
  latitude: coordinate.refine((value) => value === undefined || (value >= -90 && value <= 90), {
    error: 'Latitude is out of range.',
  }),
  longitude: coordinate.refine((value) => value === undefined || (value >= -180 && value <= 180), {
    error: 'Longitude is out of range.',
  }),
  accuracyM: z.coerce.number().finite().nonnegative().optional(),
});

export const visitTravelSchema = z.object({
  visitId: z.string().trim().min(1),
  // Entered by the engineer from the odometer, not derived from the GPS fixes:
  // the straight line between two points is not the road that was driven.
  travelDistanceKm: z.coerce.number().finite().nonnegative().max(5000, { error: 'That looks too far to be one trip.' }),
});
