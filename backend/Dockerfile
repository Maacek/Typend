FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma/ ./prisma/

# Install ALL dependencies (including devDeps for nest build + ESM runtime packages)
RUN npm install

# Copy source
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate && npm run build

# Verify build output exists in correct location
RUN ls -la dist/src/ && echo "✅ dist/src/ exists"

ENV NODE_ENV=production
ENV PORT=4010

EXPOSE 4010

CMD ["node", "dist/src/main"]
