-- ════════════════════════════════════════════════════════════
-- SUPABASE / POSTGRES MIGRATION: PRIORITY ENGINE & DECISION MATRIX OS
-- Migration ID: 20260618000003_priority_engine
-- ════════════════════════════════════════════════════════════

-- ── 1. PRIORITY CONFIG TABLE (German Precision: all weights explicit & configurable) ──

CREATE TABLE IF NOT EXISTS public.priority_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value NUMERIC(5, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default scoring weights (must sum to 100)
INSERT INTO public.priority_config (key, value, description) VALUES
('weight_urgency', 30.00, 'Weight for deadline proximity and escalation risk'),
('weight_importance', 25.00, 'Weight for strategic value and revenue impact'),
('weight_learning', 15.00, 'Weight for learning multiplier — prevents future incidents'),
('weight_effort_inverse', 10.00, 'Weight for effort (inverse — easier tasks score slightly higher)'),
('weight_age', 10.00, 'Weight for how long the task has been pending'),
('weight_energy_match', 10.00, 'Weight for energy mode matching current time of day'),
('deep_work_start_hour', 6.00, 'Hour of day when deep work block starts (24h format)'),
('deep_work_end_hour', 12.00, 'Hour of day when deep work block ends (24h format)'),
('shallow_work_start_hour', 14.00, 'Hour of day when shallow/admin work starts'),
('shallow_work_end_hour', 18.00, 'Hour of day when shallow/admin work ends'),
('creative_work_start_hour', 20.00, 'Hour for creative/experimental work'),
('creative_work_end_hour', 23.00, 'Hour creative work block ends'),
('stale_outreach_days', 3.00, 'Days after which outreach_sent becomes stale and triggers a task'),
('stale_followup_days', 5.00, 'Days after which followup_sent becomes stale'),
('stale_delivered_days', 7.00, 'Days after delivery without testimonial triggers a task')
ON CONFLICT (key) DO NOTHING;


-- ── 2. PRIORITY TASKS TABLE (replaces simple tasks for the Priority Engine) ──

CREATE TABLE IF NOT EXISTS public.priority_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'beta_project', 'incident', 'finance', 'manual', 'learning'
    )),
    effort_minutes INT NOT NULL DEFAULT 30,
    energy_required TEXT NOT NULL DEFAULT 'shallow' CHECK (energy_required IN (
        'deep', 'shallow', 'creative', 'analytical', 'admin'
    )),
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'done', 'delegated', 'eliminated'
    )),
    dependencies UUID[] DEFAULT '{}',
    priority_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    quadrant TEXT NOT NULL DEFAULT 'schedule' CHECK (quadrant IN (
        'do_now', 'schedule', 'delegate', 'eliminate', 'learn'
    )),
    revenue_impact INT8 NOT NULL DEFAULT 0, -- estimated $ value in cents
    learning_multiplier INT NOT NULL DEFAULT 1 CHECK (learning_multiplier BETWEEN 1 AND 10),
    source_table TEXT CHECK (source_table IN (
        'beta_projects', 'ai_incidents', 'transactions', 'manual'
    )),
    source_id UUID,
    auto_generated BOOLEAN NOT NULL DEFAULT false,
    actual_minutes INT, -- filled on completion for learning system
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_priority_tasks_status ON public.priority_tasks(status);
CREATE INDEX IF NOT EXISTS idx_priority_tasks_quadrant ON public.priority_tasks(quadrant);
CREATE INDEX IF NOT EXISTS idx_priority_tasks_score ON public.priority_tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_priority_tasks_source ON public.priority_tasks(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_priority_tasks_category ON public.priority_tasks(category);
CREATE INDEX IF NOT EXISTS idx_priority_tasks_deadline ON public.priority_tasks(deadline) WHERE status = 'pending';


-- ── 3. PRIORITY SCORES LOG (snapshot of scores at different moments) ──

CREATE TABLE IF NOT EXISTS public.priority_scores_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.priority_tasks(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL,
    quadrant TEXT NOT NULL,
    urgency_component NUMERIC(5, 2),
    importance_component NUMERIC(5, 2),
    learning_component NUMERIC(5, 2),
    effort_component NUMERIC(5, 2),
    age_component NUMERIC(5, 2),
    energy_component NUMERIC(5, 2),
    snapshot_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_priority_log_task ON public.priority_scores_log(task_id, snapshot_at DESC);


-- ── 4. SCORING FUNCTION (German Precision: pure SQL, callable from triggers & Edge Functions) ──

CREATE OR REPLACE FUNCTION public.calculate_priority_score(p_task_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_task RECORD;
    v_weights RECORD;
    v_urgency NUMERIC := 0;
    v_importance NUMERIC := 0;
    v_learning NUMERIC := 0;
    v_effort NUMERIC := 0;
    v_age NUMERIC := 0;
    v_energy NUMERIC := 0;
    v_final_score NUMERIC := 50;
    v_quadrant TEXT := 'schedule';
    v_current_hour INT;
    v_hours_to_deadline NUMERIC;
    v_age_hours NUMERIC;
BEGIN
    -- Fetch the task
    SELECT * INTO v_task FROM public.priority_tasks WHERE id = p_task_id;
    IF NOT FOUND THEN RETURN 50; END IF;

    -- Fetch weights into a single record for efficiency
    SELECT
        MAX(CASE WHEN key = 'weight_urgency' THEN value END) AS w_urgency,
        MAX(CASE WHEN key = 'weight_importance' THEN value END) AS w_importance,
        MAX(CASE WHEN key = 'weight_learning' THEN value END) AS w_learning,
        MAX(CASE WHEN key = 'weight_effort_inverse' THEN value END) AS w_effort,
        MAX(CASE WHEN key = 'weight_age' THEN value END) AS w_age,
        MAX(CASE WHEN key = 'weight_energy_match' THEN value END) AS w_energy,
        MAX(CASE WHEN key = 'deep_work_start_hour' THEN value END) AS deep_start,
        MAX(CASE WHEN key = 'deep_work_end_hour' THEN value END) AS deep_end,
        MAX(CASE WHEN key = 'shallow_work_start_hour' THEN value END) AS shallow_start,
        MAX(CASE WHEN key = 'shallow_work_end_hour' THEN value END) AS shallow_end,
        MAX(CASE WHEN key = 'creative_work_start_hour' THEN value END) AS creative_start,
        MAX(CASE WHEN key = 'creative_work_end_hour' THEN value END) AS creative_end
    INTO v_weights
    FROM public.priority_config;

    v_current_hour := EXTRACT(HOUR FROM now());

    -- ── URGENCY (0–100): deadline proximity ──
    IF v_task.deadline IS NOT NULL THEN
        v_hours_to_deadline := EXTRACT(EPOCH FROM (v_task.deadline - now())) / 3600.0;
        IF v_hours_to_deadline <= 0 THEN
            v_urgency := 100; -- overdue
        ELSIF v_hours_to_deadline <= 4 THEN
            v_urgency := 95;
        ELSIF v_hours_to_deadline <= 24 THEN
            v_urgency := 80;
        ELSIF v_hours_to_deadline <= 72 THEN
            v_urgency := 60;
        ELSIF v_hours_to_deadline <= 168 THEN
            v_urgency := 40;
        ELSE
            v_urgency := 20;
        END IF;
    ELSE
        -- No deadline: moderate urgency based on category
        IF v_task.category = 'incident' THEN
            v_urgency := 70;
        ELSIF v_task.category = 'beta_project' THEN
            v_urgency := 50;
        ELSIF v_task.category = 'finance' THEN
            v_urgency := 40;
        ELSE
            v_urgency := 30;
        END IF;
    END IF;

    -- ── IMPORTANCE (0–100): revenue impact ──
    IF v_task.revenue_impact > 0 THEN
        IF v_task.revenue_impact >= 100000 THEN v_importance := 100;    -- $1,000+
        ELSIF v_task.revenue_impact >= 35000 THEN v_importance := 85;   -- $350+
        ELSIF v_task.revenue_impact >= 10000 THEN v_importance := 65;   -- $100+
        ELSE v_importance := 40;
        END IF;
    ELSE
        -- No direct revenue: score by category
        IF v_task.category = 'incident' THEN v_importance := 75;
        ELSIF v_task.category = 'beta_project' THEN v_importance := 60;
        ELSIF v_task.category = 'learning' THEN v_importance := 50;
        ELSE v_importance := 30;
        END IF;
    END IF;

    -- ── LEARNING (0–100): multiplier scaled to 0–100 ──
    v_learning := (v_task.learning_multiplier::NUMERIC / 10.0) * 100.0;

    -- ── EFFORT (0–100, inverse): lower effort = higher score ──
    IF v_task.effort_minutes <= 15 THEN v_effort := 100;
    ELSIF v_task.effort_minutes <= 30 THEN v_effort := 80;
    ELSIF v_task.effort_minutes <= 60 THEN v_effort := 60;
    ELSIF v_task.effort_minutes <= 120 THEN v_effort := 40;
    ELSIF v_task.effort_minutes <= 240 THEN v_effort := 20;
    ELSE v_effort := 10;
    END IF;

    -- ── AGE (0–100): how long has it been pending ──
    v_age_hours := EXTRACT(EPOCH FROM (now() - v_task.created_at)) / 3600.0;
    IF v_age_hours >= 168 THEN v_age := 100;    -- 7+ days
    ELSIF v_age_hours >= 72 THEN v_age := 80;   -- 3+ days
    ELSIF v_age_hours >= 24 THEN v_age := 50;   -- 1+ days
    ELSIF v_age_hours >= 4 THEN v_age := 30;    -- 4+ hours
    ELSE v_age := 10;
    END IF;

    -- ── ENERGY MATCH (0–100): bonus for matching current time block ──
    v_energy := 30; -- base score
    IF v_task.energy_required = 'deep' AND v_current_hour >= v_weights.deep_start AND v_current_hour < v_weights.deep_end THEN
        v_energy := 100;
    ELSIF v_task.energy_required = 'analytical' AND v_current_hour >= v_weights.deep_start AND v_current_hour < v_weights.deep_end THEN
        v_energy := 90;
    ELSIF v_task.energy_required IN ('shallow', 'admin') AND v_current_hour >= v_weights.shallow_start AND v_current_hour < v_weights.shallow_end THEN
        v_energy := 100;
    ELSIF v_task.energy_required = 'creative' AND v_current_hour >= v_weights.creative_start AND v_current_hour < v_weights.creative_end THEN
        v_energy := 100;
    END IF;

    -- ── FINAL WEIGHTED SCORE ──
    v_final_score := (
        (v_urgency * v_weights.w_urgency / 100.0) +
        (v_importance * v_weights.w_importance / 100.0) +
        (v_learning * v_weights.w_learning / 100.0) +
        (v_effort * v_weights.w_effort / 100.0) +
        (v_age * v_weights.w_age / 100.0) +
        (v_energy * v_weights.w_energy / 100.0)
    );

    -- Clamp to 0–100
    IF v_final_score > 100 THEN v_final_score := 100; END IF;
    IF v_final_score < 0 THEN v_final_score := 0; END IF;

    -- ── QUADRANT CLASSIFICATION ──
    IF v_urgency >= 60 AND v_importance >= 60 THEN
        v_quadrant := 'do_now';
    ELSIF v_importance >= 50 AND v_urgency < 60 THEN
        v_quadrant := 'schedule';
    ELSIF v_urgency >= 60 AND v_importance < 50 THEN
        v_quadrant := 'delegate';
    ELSIF v_task.learning_multiplier >= 5 AND v_urgency < 50 THEN
        v_quadrant := 'learn';
    ELSE
        v_quadrant := 'eliminate';
    END IF;

    -- ── UPDATE TASK ──
    UPDATE public.priority_tasks
    SET priority_score = v_final_score,
        quadrant = v_quadrant,
        updated_at = now()
    WHERE id = p_task_id;

    -- ── LOG SNAPSHOT ──
    INSERT INTO public.priority_scores_log (
        task_id, score, quadrant,
        urgency_component, importance_component, learning_component,
        effort_component, age_component, energy_component
    ) VALUES (
        p_task_id, v_final_score, v_quadrant,
        v_urgency, v_importance, v_learning,
        v_effort, v_age, v_energy
    );

    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;


-- ── 5. BATCH RECALCULATION FUNCTION ──

CREATE OR REPLACE FUNCTION public.recalculate_all_priorities()
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_task_id UUID;
BEGIN
    FOR v_task_id IN
        SELECT id FROM public.priority_tasks WHERE status IN ('pending', 'in_progress')
    LOOP
        PERFORM public.calculate_priority_score(v_task_id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- ── 6. AUTO-TASK GENERATION TRIGGERS ──

-- 6a. When a beta_project status changes, auto-generate priority tasks
CREATE OR REPLACE FUNCTION public.sync_beta_project_to_priority_tasks()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT;
    v_task_title TEXT;
    v_effort INT := 30;
    v_energy TEXT := 'shallow';
    v_revenue INT8 := 35000; -- $350 default
    v_deadline TIMESTAMPTZ;
    v_learning INT := 3;
    v_existing_id UUID;
BEGIN
    -- Get company name for readable task titles
    SELECT company_name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
    IF v_client_name IS NULL THEN v_client_name := 'Unknown Client'; END IF;

    -- Delete any existing auto-generated pending tasks for this project (avoids duplicates)
    DELETE FROM public.priority_tasks
    WHERE source_table = 'beta_projects' AND source_id = NEW.id AND auto_generated = true AND status = 'pending';

    -- Generate task based on new status
    IF NEW.status = 'prospecting' THEN
        v_task_title := 'Send outreach to ' || v_client_name;
        v_effort := 20;
        v_energy := 'creative';
        v_deadline := now() + INTERVAL '2 days';
        v_learning := 4;
    ELSIF NEW.status = 'outreach_sent' THEN
        v_task_title := 'Follow up with ' || v_client_name || ' (outreach sent)';
        v_effort := 15;
        v_energy := 'shallow';
        v_deadline := now() + INTERVAL '3 days';
        v_learning := 2;
    ELSIF NEW.status = 'followup_sent' THEN
        v_task_title := 'Check response from ' || v_client_name;
        v_effort := 10;
        v_energy := 'admin';
        v_deadline := now() + INTERVAL '5 days';
        v_learning := 2;
    ELSIF NEW.status = 'diagnostic_in_progress' THEN
        v_task_title := 'Complete diagnostic for ' || v_client_name;
        v_effort := 120;
        v_energy := 'deep';
        v_deadline := now() + INTERVAL '3 days';
        v_revenue := 35000;
        v_learning := 7;
    ELSIF NEW.status = 'delivered' THEN
        v_task_title := 'Request testimonial from ' || v_client_name;
        v_effort := 15;
        v_energy := 'shallow';
        v_deadline := now() + INTERVAL '7 days';
        v_revenue := 0;
        v_learning := 3;
    ELSIF NEW.status IN ('closed_completed', 'closed_lost') THEN
        -- No new task needed for terminal states
        RETURN NEW;
    END IF;

    -- Insert the auto-generated task
    INSERT INTO public.priority_tasks (
        title, description, category, effort_minutes, energy_required,
        deadline, revenue_impact, learning_multiplier,
        source_table, source_id, auto_generated
    ) VALUES (
        v_task_title,
        'Auto-generated from beta_projects status change to ' || NEW.status,
        'beta_project', v_effort, v_energy,
        v_deadline, v_revenue, v_learning,
        'beta_projects', NEW.id, true
    );

    -- Calculate priority for the new task
    PERFORM public.calculate_priority_score(
        (SELECT id FROM public.priority_tasks WHERE source_table = 'beta_projects' AND source_id = NEW.id AND auto_generated = true AND status = 'pending' ORDER BY created_at DESC LIMIT 1)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sync_beta_project_priorities
    AFTER INSERT OR UPDATE OF status ON public.beta_projects
    FOR EACH ROW EXECUTE FUNCTION public.sync_beta_project_to_priority_tasks();


-- 6b. When a high/critical AI incident is created, auto-generate a priority task
CREATE OR REPLACE FUNCTION public.sync_incident_to_priority_tasks()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity IN ('high', 'critical') THEN
        INSERT INTO public.priority_tasks (
            title, description, category, effort_minutes, energy_required,
            deadline, revenue_impact, learning_multiplier,
            source_table, source_id, auto_generated
        ) VALUES (
            '[' || UPPER(NEW.severity) || '] Resolve ' || REPLACE(NEW.incident_type, '_', ' ') || ' in ' || NEW.phase,
            'Auto-generated from ai_incident: ' || LEFT(NEW.description, 200),
            'incident', 45, 'analytical',
            now() + CASE WHEN NEW.severity = 'critical' THEN INTERVAL '4 hours' ELSE INTERVAL '24 hours' END,
            CASE WHEN NEW.severity = 'critical' THEN 105000 ELSE 35000 END, -- $1,050 or $350 at risk
            8, -- high learning value
            'ai_incidents', NEW.id, true
        );

        PERFORM public.calculate_priority_score(
            (SELECT id FROM public.priority_tasks WHERE source_table = 'ai_incidents' AND source_id = NEW.id AND auto_generated = true ORDER BY created_at DESC LIMIT 1)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sync_incident_priorities
    AFTER INSERT ON public.ai_incidents
    FOR EACH ROW EXECUTE FUNCTION public.sync_incident_to_priority_tasks();


-- 6c. Auto-resolve priority tasks when incidents are resolved
CREATE OR REPLACE FUNCTION public.resolve_incident_priority_task()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
        UPDATE public.priority_tasks
        SET status = 'done', completed_at = now(), updated_at = now()
        WHERE source_table = 'ai_incidents' AND source_id = NEW.id AND status IN ('pending', 'in_progress');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_resolve_incident_task
    AFTER UPDATE OF resolved_at ON public.ai_incidents
    FOR EACH ROW EXECUTE FUNCTION public.resolve_incident_priority_task();


-- 6d. When a priority task is completed, recalculate dependent tasks and log effort accuracy
CREATE OR REPLACE FUNCTION public.handle_priority_task_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_dep_id UUID;
    v_accuracy_pct NUMERIC;
BEGIN
    IF OLD.status != 'done' AND NEW.status = 'done' THEN
        -- Set completed_at if not already set
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := now();
        END IF;

        -- Recalculate priorities for any tasks that had this one as a dependency
        FOR v_dep_id IN
            SELECT id FROM public.priority_tasks
            WHERE NEW.id = ANY(dependencies) AND status IN ('pending', 'in_progress')
        LOOP
            PERFORM public.calculate_priority_score(v_dep_id);
        END LOOP;

        -- Log effort accuracy to learning system if actual_minutes is set
        IF NEW.actual_minutes IS NOT NULL AND NEW.effort_minutes > 0 THEN
            v_accuracy_pct := (NEW.actual_minutes::NUMERIC / NEW.effort_minutes::NUMERIC) * 100.0;
            IF v_accuracy_pct > 150 OR v_accuracy_pct < 50 THEN
                INSERT INTO public.ai_incidents (
                    incident_type, severity, phase, description, root_cause
                ) VALUES (
                    'data_quality_issue', 'low', 'backend',
                    'Task effort estimate was ' || v_accuracy_pct::INT || '% of actual for: ' || NEW.title,
                    'Effort estimated ' || NEW.effort_minutes || ' min but actual was ' || NEW.actual_minutes || ' min. Systematic miscalibration detected.'
                );
            END IF;
        END IF;

        -- Log activity
        INSERT INTO public.activity_log (action, details)
        VALUES (
            'PRIORITY_TASK_COMPLETED',
            jsonb_build_object(
                'task_id', NEW.id,
                'title', NEW.title,
                'category', NEW.category,
                'priority_score', NEW.priority_score,
                'effort_estimated', NEW.effort_minutes,
                'effort_actual', NEW.actual_minutes
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_priority_task_completed
    BEFORE UPDATE OF status ON public.priority_tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_priority_task_completed();


-- ── 7. UPDATED_AT TRIGGER ──

CREATE TRIGGER trigger_set_priority_tasks_updated
    BEFORE UPDATE ON public.priority_tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_set_priority_config_updated
    BEFORE UPDATE ON public.priority_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 8. ROW LEVEL SECURITY ──

ALTER TABLE public.priority_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_scores_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_config ENABLE ROW LEVEL SECURITY;

-- SELECT for dashboard (anon + authenticated)
CREATE POLICY allow_read_priority_tasks ON public.priority_tasks FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_priority_log ON public.priority_scores_log FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_priority_config ON public.priority_config FOR SELECT TO authenticated, anon USING (true);

-- ALL for admin writes
CREATE POLICY admin_all_priority_tasks ON public.priority_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_priority_log ON public.priority_scores_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_priority_config ON public.priority_config FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── 9. SEED INITIAL TASKS FROM EXISTING DATA ──

-- Note: The beta_projects trigger will auto-generate tasks when it fires.
-- For existing records that won't trigger (already in DB), we seed manually.

DO $$
DECLARE
    v_proj RECORD;
    v_client_name TEXT;
    v_task_title TEXT;
    v_effort INT;
    v_energy TEXT;
    v_revenue INT8;
    v_deadline TIMESTAMPTZ;
    v_learning INT;
    v_new_task_id UUID;
BEGIN
    FOR v_proj IN
        SELECT bp.id, bp.status, bp.client_id, bp.created_at AS proj_created,
               bp.outreach_sent_at, bp.followup_sent_at, bp.delivered_at
        FROM public.beta_projects bp
        WHERE bp.status NOT IN ('closed_completed', 'closed_lost')
    LOOP
        SELECT company_name INTO v_client_name FROM public.clients WHERE id = v_proj.client_id;
        IF v_client_name IS NULL THEN CONTINUE; END IF;

        -- Skip if a pending task already exists for this project
        IF EXISTS (SELECT 1 FROM public.priority_tasks WHERE source_table = 'beta_projects' AND source_id = v_proj.id AND status = 'pending') THEN
            CONTINUE;
        END IF;

        v_effort := 30;
        v_energy := 'shallow';
        v_revenue := 35000;
        v_deadline := now() + INTERVAL '3 days';
        v_learning := 3;

        IF v_proj.status = 'prospecting' THEN
            v_task_title := 'Send outreach to ' || v_client_name;
            v_effort := 20; v_energy := 'creative'; v_deadline := now() + INTERVAL '2 days'; v_learning := 4;
        ELSIF v_proj.status = 'outreach_sent' THEN
            v_task_title := 'Follow up with ' || v_client_name || ' (outreach sent)';
            v_effort := 15; v_energy := 'shallow'; v_deadline := now() + INTERVAL '3 days'; v_learning := 2;
        ELSIF v_proj.status = 'followup_sent' THEN
            v_task_title := 'Check response from ' || v_client_name;
            v_effort := 10; v_energy := 'admin'; v_deadline := now() + INTERVAL '5 days'; v_learning := 2;
        ELSIF v_proj.status = 'diagnostic_in_progress' THEN
            v_task_title := 'Complete diagnostic for ' || v_client_name;
            v_effort := 120; v_energy := 'deep'; v_deadline := now() + INTERVAL '3 days'; v_learning := 7;
        ELSIF v_proj.status = 'delivered' THEN
            v_task_title := 'Request testimonial from ' || v_client_name;
            v_effort := 15; v_energy := 'shallow'; v_deadline := now() + INTERVAL '7 days'; v_learning := 3; v_revenue := 0;
        ELSE
            CONTINUE;
        END IF;

        INSERT INTO public.priority_tasks (
            title, description, category, effort_minutes, energy_required,
            deadline, revenue_impact, learning_multiplier,
            source_table, source_id, auto_generated
        ) VALUES (
            v_task_title,
            'Seeded from existing beta_projects record (' || v_proj.status || ')',
            'beta_project', v_effort, v_energy,
            v_deadline, v_revenue, v_learning,
            'beta_projects', v_proj.id, true
        )
        RETURNING id INTO v_new_task_id;

        PERFORM public.calculate_priority_score(v_new_task_id);
    END LOOP;

    -- Seed from unresolved high/critical AI incidents
    FOR v_proj IN
        SELECT id, incident_type, severity, phase, description
        FROM public.ai_incidents
        WHERE resolved_at IS NULL AND severity IN ('high', 'critical')
    LOOP
        IF EXISTS (SELECT 1 FROM public.priority_tasks WHERE source_table = 'ai_incidents' AND source_id = v_proj.id AND status = 'pending') THEN
            CONTINUE;
        END IF;

        INSERT INTO public.priority_tasks (
            title, description, category, effort_minutes, energy_required,
            deadline, revenue_impact, learning_multiplier,
            source_table, source_id, auto_generated
        ) VALUES (
            '[' || UPPER(v_proj.severity) || '] Resolve ' || REPLACE(v_proj.incident_type, '_', ' ') || ' in ' || v_proj.phase,
            'Seeded from existing ai_incident: ' || LEFT(v_proj.description, 200),
            'incident', 45, 'analytical',
            now() + CASE WHEN v_proj.severity = 'critical' THEN INTERVAL '4 hours' ELSE INTERVAL '24 hours' END,
            CASE WHEN v_proj.severity = 'critical' THEN 105000 ELSE 35000 END,
            8,
            'ai_incidents', v_proj.id, true
        )
        RETURNING id INTO v_new_task_id;

        PERFORM public.calculate_priority_score(v_new_task_id);
    END LOOP;

    -- Add a manual learning task
    INSERT INTO public.priority_tasks (
        title, description, category, effort_minutes, energy_required,
        deadline, revenue_impact, learning_multiplier,
        source_table, auto_generated
    ) VALUES (
        'Review FIRE retirement projections and update monthly savings',
        'Quarterly review of compound interest calculator outputs vs actual portfolio performance. Adjust monthly contribution target if needed.',
        'learning', 45, 'analytical',
        now() + INTERVAL '14 days', 0, 9,
        'manual', false
    )
    RETURNING id INTO v_new_task_id;
    PERFORM public.calculate_priority_score(v_new_task_id);

    -- Add a finance manual task
    INSERT INTO public.priority_tasks (
        title, description, category, effort_minutes, energy_required,
        deadline, revenue_impact, learning_multiplier,
        source_table, auto_generated
    ) VALUES (
        'Reconcile AI API subscriptions for June',
        'Review Claude, ChatGPT, and Supabase billing statements. Enter transactions into the double-entry ledger.',
        'finance', 30, 'admin',
        now() + INTERVAL '10 days', 0, 2,
        'manual', false
    )
    RETURNING id INTO v_new_task_id;
    PERFORM public.calculate_priority_score(v_new_task_id);

END;
$$;
