-- Only for a NEW self-hosted Supabase project. Existing Lernstudio needs no schema change.
create table if not exists public.user_progress (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  done          jsonb not null default '{}'::jsonb,
  perfect       jsonb not null default '{}'::jsonb,
  last_lesson   text,
  display_name  text not null default 'Lernender',
  avatar        text not null default '🧑‍💻',
  theme         text not null default 'dark' check (theme in ('dark', 'light')),
  extra_state   jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  constraint user_progress_done_object check (
    jsonb_typeof(done) = 'object' and pg_column_size(done) <= 200000
  ),
  constraint user_progress_perfect_object check (
    jsonb_typeof(perfect) = 'object' and pg_column_size(perfect) <= 200000
  ),
  constraint user_progress_extra_object check (
    jsonb_typeof(extra_state) = 'object' and pg_column_size(extra_state) <= 300000
  ),
  constraint user_progress_last_lesson_length check (
    last_lesson is null or char_length(last_lesson) <= 160
  ),
  constraint user_progress_display_name_length check (
    char_length(display_name) between 1 and 28
  ),
  constraint user_progress_avatar_length check (
    char_length(avatar) between 1 and 16
  )
);


alter table public.user_progress enable row level security;
-- user_progress: jedes Konto darf ausschliesslich seine eigene Zeile lesen und schreiben.
drop policy if exists "eigenen fortschritt lesen" on public.user_progress;
create policy "eigenen fortschritt lesen"
  on public.user_progress for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "eigenen fortschritt anlegen" on public.user_progress;
create policy "eigenen fortschritt anlegen"
  on public.user_progress for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "eigenen fortschritt aktualisieren" on public.user_progress;
create policy "eigenen fortschritt aktualisieren"
  on public.user_progress for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.user_progress from anon;
grant select, insert, update on table public.user_progress to authenticated;

-- Atomarer Normalfall: Abschluesse werden vereinigt, damit ein aelteres Geraet
-- keine bereits serverseitig bekannten Lektionen oder Perfekt-Ergebnisse entfernt.
create or replace function public.sync_user_progress(
  p_done          jsonb default '{}'::jsonb,
  p_perfect       jsonb default '{}'::jsonb,
  p_last_lesson   text default null,
  p_display_name  text default null,
  p_avatar        text default null,
  p_theme         text default 'dark',
  p_extra_state   jsonb default '{}'::jsonb
)
returns public.user_progress
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user     uuid := auth.uid();
  v_done     jsonb;
  v_perfect  jsonb;
  v_extra    jsonb := coalesce(p_extra_state, '{}'::jsonb);
  v_last     text := nullif(left(trim(coalesce(p_last_lesson, '')), 160), '');
  v_name     text := nullif(left(trim(coalesce(p_display_name, '')), 28), '');
  v_avatar   text := nullif(left(trim(coalesce(p_avatar, '')), 16), '');
  v_theme    text := case when p_theme = 'light' then 'light' else 'dark' end;
  v_result   public.user_progress;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(coalesce(p_done, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_perfect, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(v_extra) <> 'object' then
    raise exception 'progress payload must contain objects' using errcode = '22023';
  end if;
  if pg_column_size(v_extra) > 300000 then
    raise exception 'extra progress payload too large' using errcode = '22001';
  end if;

  select coalesce(jsonb_object_agg(key, 'true'::jsonb), '{}'::jsonb)
    into v_done
    from (
      select key
      from jsonb_each(coalesce(p_done, '{}'::jsonb))
      where value = 'true'::jsonb and char_length(key) <= 160
      limit 5000
    ) safe_done;

  select coalesce(jsonb_object_agg(key, 'true'::jsonb), '{}'::jsonb)
    into v_perfect
    from (
      select key
      from jsonb_each(coalesce(p_perfect, '{}'::jsonb))
      where value = 'true'::jsonb and char_length(key) <= 160
      limit 5000
    ) safe_perfect;

  insert into public.user_progress (
    user_id, done, perfect, last_lesson, display_name, avatar, theme, extra_state, updated_at
  ) values (
    v_user, v_done, v_perfect, v_last, coalesce(v_name, 'Lernender'),
    coalesce(v_avatar, '🧑‍💻'), v_theme, v_extra, now()
  )
  on conflict (user_id) do update set
    done         = public.user_progress.done || excluded.done,
    perfect      = public.user_progress.perfect || excluded.perfect,
    last_lesson  = coalesce(v_last, public.user_progress.last_lesson),
    display_name = coalesce(v_name, public.user_progress.display_name),
    avatar       = coalesce(v_avatar, public.user_progress.avatar),
    theme        = v_theme,
    extra_state  = (public.user_progress.extra_state || excluded.extra_state)
      || jsonb_build_object(
        'marketing',
        (case when jsonb_typeof(public.user_progress.extra_state -> 'marketing') = 'object'
          then public.user_progress.extra_state -> 'marketing' else '{}'::jsonb end)
        ||
        (case when jsonb_typeof(excluded.extra_state -> 'marketing') = 'object'
          then excluded.extra_state -> 'marketing' else '{}'::jsonb end)
      ),
    updated_at   = now()
  returning * into v_result;

  return v_result;
end;
$$;

-- Bewusst separater, ausdruecklicher Loeschpfad. Der normale Sync ist monoton und
-- kann Fortschritt nicht versehentlich entfernen.
create or replace function public.reset_user_progress()
returns public.user_progress
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user   uuid := auth.uid();
  v_result public.user_progress;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.user_progress (user_id)
  values (v_user)
  on conflict (user_id) do update set
    done        = '{}'::jsonb,
    perfect     = '{}'::jsonb,
    last_lesson = null,
    extra_state = '{}'::jsonb,
    updated_at  = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.sync_user_progress(jsonb, jsonb, text, text, text, text, jsonb) from public, anon;
grant execute on function public.sync_user_progress(jsonb, jsonb, text, text, text, text, jsonb) to authenticated;
revoke all on function public.reset_user_progress() from public, anon;
grant execute on function public.reset_user_progress() to authenticated;

-- Bewusst KEINE Regel fuer 'anon' -> anonyme Besucher bekommen aus allen Tabellen NICHTS.
-- SELBSTTEST vor Go-Live (siehe SETUP-JURI.md): roher GET auf /rest/v1/course_content
-- mit dem oeffentlichen anon-Key OHNE Login MUSS leer/verboten zurueckkommen.

-- ============================================================
-- Warum das Juris "copy-paste-Key"-Problem strukturell loest:
--   * Es gibt keinen abtippbaren Code mehr. Zugang haengt an der verifizierten Identitaet (Konto).
--   * Jede Zugriffs-Entscheidung faellt der SERVER (RLS), nicht der Browser.
--   * Freischalten kann nur der Webhook (service_role) nach echter, signierter Zahlung.
--   * Doppel-Einloesung unmoeglich: order_id ist unique -> zweite Verarbeitung trifft 0 Zeilen.
-- Ehrliche Grenze: Ein zahlender, eingeloggter Nutzer kann Inhalte abschreiben
--   ("analoges Loch"). Das kann kein System verhindern -> niemals "unknackbar" bewerben.
-- ============================================================
