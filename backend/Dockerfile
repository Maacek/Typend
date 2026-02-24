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

# Verify build output exists
RUN ls -la dist/ && node -e "require('fs').statSync('dist/main.js')" && echo "✅ dist/main.js exists"

ENV NODE_ENV=production
ENV PORT=4010

EXPOSE 4010

CMD ["node", "dist/main"]
