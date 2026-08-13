-- Priority projection reconciliation — 2026-08-13
-- Source state is canonical. priority_tasks is a reconstructable projection.
BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_project_priority_task(p_project_id uuid,p_replace boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE p record; existing uuid; new_id uuid; title text; effort int:=30; energy text:='shallow'; due timestamptz; revenue bigint:=0; learning int:=3;
BEGIN
  SELECT bp.*,c.company_name INTO p FROM public.beta_projects bp JOIN public.clients c ON c.id=bp.client_id WHERE bp.id=p_project_id;
  IF p.id IS NULL THEN RETURN NULL; END IF;
  IF p.status IN ('closed_completed','closed_lost') THEN
    UPDATE public.priority_tasks SET status='eliminated',updated_at=now() WHERE source_table='beta_projects' AND source_id=p_project_id AND auto_generated=true AND status IN ('pending','in_progress');
    RETURN NULL;
  END IF;
  SELECT id INTO existing FROM public.priority_tasks WHERE source_table='beta_projects' AND source_id=p_project_id AND auto_generated=true AND status IN ('pending','in_progress') ORDER BY created_at DESC LIMIT 1;
  IF existing IS NOT NULL AND NOT p_replace THEN RETURN existing; END IF;
  IF p_replace THEN UPDATE public.priority_tasks SET status='eliminated',updated_at=now() WHERE source_table='beta_projects' AND source_id=p_project_id AND auto_generated=true AND status IN ('pending','in_progress'); END IF;
  IF p.symbolic_price_charged IS NOT NULL AND p.symbolic_price_charged>0 THEN revenue:=round(p.symbolic_price_charged*100)::bigint; END IF;
  CASE p.status
    WHEN 'prospecting' THEN title:='Send outreach to '||p.company_name; effort:=20; energy:='creative'; due:=now()+interval '2 days'; learning:=4;
    WHEN 'outreach_sent' THEN title:='Follow up with '||p.company_name; effort:=15; energy:='shallow'; due:=now()+interval '3 days'; learning:=2;
    WHEN 'followup_sent' THEN title:='Check response from '||p.company_name; effort:=10; energy:='admin'; due:=now()+interval '5 days'; learning:=2;
    WHEN 'diagnostic_in_progress' THEN title:='Complete diagnostic for '||p.company_name; effort:=120; energy:='deep'; due:=now()+interval '3 days'; learning:=7;
    WHEN 'delivered' THEN title:='Request testimonial from '||p.company_name; effort:=15; energy:='shallow'; due:=now()+interval '7 days'; learning:=3;
    WHEN 'awaiting_testimonial' THEN title:='Follow up for testimonial from '||p.company_name; effort:=10; energy:='admin'; due:=now()+interval '5 days'; learning:=2;
    ELSE RETURN NULL;
  END CASE;
  INSERT INTO public.priority_tasks(title,description,category,effort_minutes,energy_required,deadline,revenue_impact,learning_multiplier,source_table,source_id,auto_generated,status)
  VALUES(title,'Derived from current beta_projects state: '||p.status,'beta_project',effort,energy,due,revenue,learning,'beta_projects',p_project_id,true,'pending') RETURNING id INTO new_id;
  PERFORM public.calculate_priority_score(new_id);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.sync_beta_project_to_priority_tasks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN PERFORM public.ensure_project_priority_task(NEW.id,true); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trigger_sync_beta_project_priorities ON public.beta_projects;
CREATE TRIGGER trigger_sync_beta_project_priorities AFTER INSERT OR UPDATE OF status,symbolic_price_charged,payment_status,current_phase ON public.beta_projects FOR EACH ROW EXECUTE FUNCTION public.sync_beta_project_to_priority_tasks();

CREATE OR REPLACE FUNCTION public.ensure_incident_priority_task(p_incident_id uuid,p_replace boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE i record; existing uuid; new_id uuid;
BEGIN
  SELECT * INTO i FROM public.ai_incidents WHERE id=p_incident_id;
  IF i.id IS NULL THEN RETURN NULL; END IF;
  IF i.resolved_at IS NOT NULL OR i.severity NOT IN ('high','critical') THEN
    UPDATE public.priority_tasks SET status='done',completed_at=COALESCE(completed_at,now()),updated_at=now() WHERE source_table='ai_incidents' AND source_id=p_incident_id AND auto_generated=true AND status IN ('pending','in_progress');
    RETURN NULL;
  END IF;
  SELECT id INTO existing FROM public.priority_tasks WHERE source_table='ai_incidents' AND source_id=p_incident_id AND auto_generated=true AND status IN ('pending','in_progress') ORDER BY created_at DESC LIMIT 1;
  IF existing IS NOT NULL AND NOT p_replace THEN RETURN existing; END IF;
  IF p_replace THEN UPDATE public.priority_tasks SET status='eliminated',updated_at=now() WHERE source_table='ai_incidents' AND source_id=p_incident_id AND auto_generated=true AND status IN ('pending','in_progress'); END IF;
  INSERT INTO public.priority_tasks(title,description,category,effort_minutes,energy_required,deadline,revenue_impact,learning_multiplier,source_table,source_id,auto_generated,status)
  VALUES('['||upper(i.severity)||'] Resolve '||replace(i.incident_type,'_',' ')||' in '||i.phase,'Derived from unresolved AI/system incident: '||left(i.description,200),'incident',45,'analytical',now()+CASE WHEN i.severity='critical' THEN interval '4 hours' ELSE interval '24 hours' END,CASE WHEN i.severity='critical' THEN 105000 ELSE 35000 END,8,'ai_incidents',p_incident_id,true,'pending') RETURNING id INTO new_id;
  PERFORM public.calculate_priority_score(new_id);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.sync_incident_to_priority_tasks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN PERFORM public.ensure_incident_priority_task(NEW.id,true); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trigger_sync_incident_priorities ON public.ai_incidents;
CREATE TRIGGER trigger_sync_incident_priorities AFTER INSERT OR UPDATE OF severity,resolved_at ON public.ai_incidents FOR EACH ROW EXECUTE FUNCTION public.sync_incident_to_priority_tasks();

CREATE OR REPLACE FUNCTION public.reconcile_priority_tasks() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE x uuid; project_count int:=0; incident_count int:=0;
BEGIN
  IF COALESCE(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  FOR x IN SELECT id FROM public.beta_projects WHERE status NOT IN ('closed_completed','closed_lost') LOOP IF public.ensure_project_priority_task(x,false) IS NOT NULL THEN project_count:=project_count+1; END IF; END LOOP;
  FOR x IN SELECT id FROM public.ai_incidents WHERE resolved_at IS NULL AND severity IN ('high','critical') LOOP IF public.ensure_incident_priority_task(x,false) IS NOT NULL THEN incident_count:=incident_count+1; END IF; END LOOP;
  PERFORM public.recalculate_all_priorities();
  RETURN jsonb_build_object('project_actions_present',project_count,'incident_actions_present',incident_count,'active_actions',(SELECT count(*) FROM public.priority_tasks WHERE status IN ('pending','in_progress')));
END $$;

REVOKE ALL ON FUNCTION public.ensure_project_priority_task(uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ensure_incident_priority_task(uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconcile_priority_tasks() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_project_priority_task(uuid,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_incident_priority_task(uuid,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_priority_tasks() TO service_role;

-- Heal any missing projections at migration time. Triggers keep them current afterwards.
SELECT public.reconcile_priority_tasks();
COMMIT;
