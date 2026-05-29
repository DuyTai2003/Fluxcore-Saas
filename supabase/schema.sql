-- =============================================================================
-- FluxCore SaaS — Multi-Tenant Enterprise Operations Platform
-- Database Schema for Supabase (PostgreSQL)
-- =============================================================================
-- ⚡ IDEMPOTENT SCRIPT — Run as many times as you want.
--    Drops everything cleanly, then recreates from scratch.
-- =============================================================================
-- Usage:
--   1. Go to https://app.supabase.com → SQL Editor
--   2. Paste this entire script → Click "Run"
--   3. No more "already exists" errors. Ever.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 0: TEARDOWN — Drop everything in correct dependency order
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_id() CASCADE;

-- Drop policies (one per table, in case RLS was already enabled)
-- tenants policies
DROP POLICY IF EXISTS "tenant_read_own" ON public.tenants;
DROP POLICY IF EXISTS "tenant_insert_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenant_update_admin" ON public.tenants;

-- profiles policies
DROP POLICY IF EXISTS "profile_read_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_auth" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;

-- workspaces policies
DROP POLICY IF EXISTS "workspace_read_tenant" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert_admin_manager" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_admin_manager" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete_admin" ON public.workspaces;

-- hourly_ledger policies
DROP POLICY IF EXISTS "ledger_read_tenant" ON public.hourly_ledger;
DROP POLICY IF EXISTS "ledger_insert_tenant" ON public.hourly_ledger;
DROP POLICY IF EXISTS "ledger_update_admin" ON public.hourly_ledger;

-- notifications policies
DROP POLICY IF EXISTS "notif_read_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_system" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;

-- Drop tables (child tables first to respect FK constraints)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.hourly_ledger CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: TABLES (re-created fresh every run)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tenants (Multi-Tenant Isolation)
CREATE TABLE public.tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    plan        TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (linked to Supabase auth.users)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'operator')),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workspaces (generalized operational stations)
CREATE TABLE public.workspaces (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    type              TEXT NOT NULL,
    target_throughput INTEGER DEFAULT 0,
    current_task      TEXT,
    status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'paused')),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hourly Ledger (Time-slot throughput transactions)
CREATE TABLE public.hourly_ledger (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    operator_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    throughput_count  INTEGER NOT NULL CHECK (throughput_count > 0),
    time_slot         TEXT NOT NULL,
    notes             TEXT,
    flagged           BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notifications (In-App real-time notifications)
CREATE TABLE public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    type        TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical')),
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_workspaces_tenant ON public.workspaces(tenant_id);
CREATE INDEX idx_hourly_ledger_tenant ON public.hourly_ledger(tenant_id);
CREATE INDEX idx_hourly_ledger_workspace ON public.hourly_ledger(workspace_id);
CREATE INDEX idx_hourly_ledger_operator ON public.hourly_ledger(operator_id);
CREATE INDEX idx_hourly_ledger_created ON public.hourly_ledger(created_at DESC);
CREATE INDEX idx_notifications_tenant_user ON public.notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(tenant_id, user_id) WHERE read = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get current user's tenant_id ──
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── tenants RLS ──
CREATE POLICY "tenant_read_own" ON public.tenants
    FOR SELECT
    USING (id = public.get_tenant_id());

CREATE POLICY "tenant_insert_auth" ON public.tenants
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_update_admin" ON public.tenants
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ── profiles RLS ──
CREATE POLICY "profile_read_tenant" ON public.profiles
    FOR SELECT
    USING (tenant_id = public.get_tenant_id());

CREATE POLICY "profile_insert_auth" ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "profile_update_own" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());

-- ── workspaces RLS ──
CREATE POLICY "workspace_read_tenant" ON public.workspaces
    FOR SELECT
    USING (tenant_id = public.get_tenant_id());

CREATE POLICY "workspace_insert_admin_manager" ON public.workspaces
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
            AND tenant_id = public.get_tenant_id()
        )
    );

CREATE POLICY "workspace_update_admin_manager" ON public.workspaces
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
            AND tenant_id = public.get_tenant_id()
        )
    );

CREATE POLICY "workspace_delete_admin" ON public.workspaces
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
            AND tenant_id = public.get_tenant_id()
        )
    );

-- ── hourly_ledger RLS ──
CREATE POLICY "ledger_read_tenant" ON public.hourly_ledger
    FOR SELECT
    USING (tenant_id = public.get_tenant_id());

CREATE POLICY "ledger_insert_tenant" ON public.hourly_ledger
    FOR INSERT
    WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "ledger_update_admin" ON public.hourly_ledger
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
            AND tenant_id = public.get_tenant_id()
        )
    );

-- ── notifications RLS ──
CREATE POLICY "notif_read_own" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid() AND tenant_id = public.get_tenant_id());

CREATE POLICY "notif_insert_system" ON public.notifications
    FOR INSERT
    WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "notif_update_own" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: REALTIME SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.hourly_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: AUTO-UPDATE TRIGGER (profiles.updated_at)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: CREATE_TENANT_AND_PROFILE RPC (Atomic sign-up helper)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_tenant_and_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_tenant_name TEXT,
    p_tenant_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Create tenant (bypasses RLS via SECURITY DEFINER)
    INSERT INTO public.tenants (name, slug, plan)
    VALUES (p_tenant_name, p_tenant_slug, 'pro')
    RETURNING id INTO v_tenant_id;

    -- 2. Create profile linked to that tenant
    INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
    VALUES (p_user_id, p_email, p_full_name, p_role, v_tenant_id);

    RETURN v_tenant_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 8: SEED DATA (Manual — uncomment and run after creating your first user)
-- ═══════════════════════════════════════════════════════════════════════════
-- INSERT INTO public.tenants (name, slug, plan) VALUES ('Demo Organization', 'demo', 'pro');
-- INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
-- VALUES ('YOUR-USER-UUID-HERE', 'admin@fluxcore.app', 'Your Name', 'super_admin',
--         (SELECT id FROM public.tenants WHERE slug = 'demo'));

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE. Script is fully idempotent — run it as many times as you want.
-- ═══════════════════════════════════════════════════════════════════════════
