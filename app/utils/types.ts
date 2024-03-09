import {z} from 'zod'

export const entitySchema = z.object({
  id: z.coerce.number(),
})

export const knownErrorSchema = z.object({
  reasons: z.array(z.string()),
})

export type KnownError = z.infer<typeof knownErrorSchema>
