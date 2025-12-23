# Tacology Survey Platform v2 – Product & System Spec

## Overview
Customer feedback platform for Tacology restaurants to collect structured + open-text surveys post-payment, detect dissatisfied guests early, enable follow-up, and feed analytics/AI.

## Objectives
- Collect high-quality structured + unstructured feedback with minimal friction.
- Store analytics-ready data with customer history and profiling.
- Add AI embeddings for semantic search and pattern detection.
- Notify managers automatically on bad experiences.
- Provide admin dashboard for analysis and exports.

## Scope (v2)
- Post-payment survey with required questions (food, service, atmosphere, overall, recommendation 0–10, improvement text).
- AI embeddings for full response (and optional per open answer).
- Admin: analytics, filters (location, date range), customer profiles, exports (CSV/XLSX), alerts on negative signals.
- Deployment: single Next.js app (App Router) on Render, single Supabase project.

## Non-Goals
- Menu app rebuild.
- Multi-tenant or multi-brand.
- Public analytics.
- Staging environment.

## Stack
- Frontend: Next.js (App Router), Tailwind; RSC + client components as needed.
- Backend: Next.js route handlers; Supabase Postgres with pgvector; Supabase Auth; optional Storage.
- AI: OpenAI embeddings; pgvector search.
- Notifications: Email (Nodemailer); SMS (Twilio planned).

## Data Model (high level)
- customers: id (uuid), name, email, phone?, created_at.
- survey_responses: id, customer_id, location (brickell|wynwood), answers (jsonb), rating_summary, sentiment_score, completed_at, created_at.
- response_embeddings: response_id, content, embedding, model, created_at.
- admin_users: id, email, role.

## Survey Flow
1) Payment completed → incentive screen (10% off next visit).
2) Mandatory survey questions (structured + improvement text).
3) Confirmation + email coupon (single-use, expiry).
4) Persist response → embed → sentiment/pattern analysis.
5) Trigger notifications on negative signals.

## Admin Features
- Analytics breakdown per question; percentages sum to 100%.
- Filters: location, date range (day/week/month).
- Customer profiles: per-customer response history with timestamp/location/answers/comment.
- Exports: responses and contact database (CSV/XLSX).
- Notifications: email now; SMS later.

## Deployment & Environments
- Single Render service for production.
- Envs: .env.local for local; Render env vars for prod. No staging.

## Required Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL
- SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, ALERT_TO_NUMBER (planned SMS)
- OPENAI_API_KEY

## Guardrails
- Input validation on survey submissions and admin filters.
- Rate limiting on public-facing APIs.
- Logging/monitoring for notification failures.
- Percent totals validated to 100% in analytics views.
