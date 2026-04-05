import { z } from 'zod';

// Socket event payload schemas — runtime validation for untyped client data

export const rematchVoteSchema = z.object({
  vote: z.boolean(),
});

export const setBotTeamSchema = z.object({
  botIndex: z.number().int().min(0),
  team: z.union([z.number().int().min(0).max(1), z.null()]),
});

export const setTeamSchema = z.object({
  userId: z.number().int().positive(),
  team: z.union([z.number().int().min(0).max(1), z.null()]),
});

export const userIdSchema = z.object({
  userId: z.number().int().positive(),
});

export const inviteIdSchema = z.object({
  inviteId: z.string().uuid(),
});

export const dmReadSchema = z.object({
  fromUserId: z.number().int().positive(),
});

/**
 * Validate socket event data against a Zod schema.
 * Returns parsed data on success, or null on failure.
 * If a callback is provided, sends an error response on failure.
 */
export function validateSocket<T>(
  schema: z.ZodType<T>,
  data: unknown,
  callback?: (response: { success: boolean; error?: string }) => void,
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (callback) {
      callback({ success: false, error: 'Invalid input' });
    }
    return null;
  }
  return result.data;
}
