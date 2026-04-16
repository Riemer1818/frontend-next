# Dependencies to Install for Migration

Run these commands to install all needed dependencies:

```bash
cd /home/thartist/Desktop/riemerFYI/frontend-next

# Core backend dependencies
npm install pg                          # PostgreSQL client
npm install jspdf                       # PDF generation

# Email processing
npm install imap mailparser            # Email fetching and parsing

# AI/LLM
npm install @langchain/google-genai langchain langfuse

# Background jobs (if using worker script approach)
npm install node-cron                  # Cron scheduling

# Type definitions
npm install --save-dev @types/pg @types/node-cron
```

## Full install command (copy-paste ready):

```bash
cd /home/thartist/Desktop/riemerFYI/frontend-next && \
npm install pg jspdf imap mailparser @langchain/google-genai langchain langfuse node-cron && \
npm install --save-dev @types/pg @types/node-cron
```

## Already Installed (from backoffice):
- ✅ @trpc/server, @trpc/client, @trpc/react-query, @trpc/next
- ✅ @tanstack/react-query
- ✅ zod
- ✅ superjson
- ✅ next (v15)

## Summary:
- **New runtime deps**: 8 packages
- **New dev deps**: 2 packages
- **Total**: 10 new packages to install
