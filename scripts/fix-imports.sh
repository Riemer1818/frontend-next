#!/bin/bash

echo "🔧 Fixing import paths in server files..."

cd /home/thartist/Desktop/riemerFYI/frontend-next

# Fix imports in all TypeScript files under src/server
find src/server -type f -name "*.ts" -exec sed -i \
  -e "s|from '../repositories/|from '@/server/repositories/|g" \
  -e "s|from '../../repositories/|from '@/server/repositories/|g" \
  -e "s|from '../../../repositories/|from '@/server/repositories/|g" \
  -e "s|from '../core/|from '@/server/core/|g" \
  -e "s|from '../../core/|from '@/server/core/|g" \
  -e "s|from '../../../core/|from '@/server/core/|g" \
  -e "s|from '../models/|from '@/server/models/|g" \
  -e "s|from '../../models/|from '@/server/models/|g" \
  -e "s|from '../../../models/|from '@/server/models/|g" \
  -e "s|from '../services/|from '@/server/services/|g" \
  -e "s|from '../../services/|from '@/server/services/|g" \
  -e "s|from './router'|from '@/server/routers/_app'|g" \
  -e "s|from './trpc'|from '@/server/trpc'|g" \
  -e "s|from './context'|from '@/server/context'|g" \
  -e "s|from '../trpc'|from '@/server/trpc'|g" \
  -e "s|from '../context'|from '@/server/context'|g" \
  {} +

echo "✅ Import paths fixed!"
echo ""
echo "Files updated:"
find src/server -type f -name "*.ts" | wc -l
