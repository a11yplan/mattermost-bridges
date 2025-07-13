FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the app
RUN bun build ./src/index.ts --outdir ./dist --target bun

# Production image
FROM oven/bun:1-slim

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/

# Set environment to production
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Run the application
CMD ["bun", "dist/index.js"]