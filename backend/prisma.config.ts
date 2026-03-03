import { defineConfig } from '@prisma/internals'

export default defineConfig({
  projects: {
    door: {
      schema: './prisma/schema.prisma',
      output: './generated/client',
    },
  },
})
