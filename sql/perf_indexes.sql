-- Performance indexes for frequently-used queries

-- Finance entries filtered by user, project and ordered by created_at/date
create index if not exists idx_finance_user_project_created on public.finance_entries(user_id, project_id, created_at desc);
create index if not exists idx_finance_user_date on public.finance_entries(user_id, date desc);

-- Documents filtered by user, project and ordered by created_at
create index if not exists idx_documents_user_project_created on public.documents(user_id, project_id, created_at desc);

-- Estimates by user and created_at
create index if not exists idx_estimates_user_created on public.estimates(user_id, created_at desc);

-- Estimate items by estimate foreign key
create index if not exists idx_estimate_items_estimate on public.estimate_items(estimate_id);

-- Work stages by user, project and start_date
create index if not exists idx_work_stages_user_project_start on public.work_stages(user_id, project_id, start_date);

