#!/bin/bash
# Quick local testing script for the unified Supabase setup

set -e

echo "🧪 Testing Local Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local has required vars
echo "📋 Checking environment variables..."

if ! grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
  echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local${NC}"
  exit 1
fi

if ! grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
  echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local${NC}"
  exit 1
fi

if ! grep -q "ANTHROPIC_API_KEY" .env.local; then
  echo -e "${RED}❌ ANTHROPIC_API_KEY not found in .env.local${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment variables look good${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Try to build (this will catch TypeScript errors)
echo "🔨 Testing build..."
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed - check TypeScript errors${NC}"
  npm run build
  exit 1
fi

echo ""
echo "🎉 All checks passed!"
echo ""
echo "Next steps:"
echo "1. Apply migration: ${YELLOW}supabase db push${NC}"
echo "2. Start dev server: ${YELLOW}npm run dev${NC}"
echo "3. Test email endpoint:"
echo "   ${YELLOW}curl -X POST http://localhost:3000/api/cron/fetch-emails \\${NC}"
echo "   ${YELLOW}  -H 'Authorization: Bearer dev-secret-change-in-production'${NC}"
echo ""
