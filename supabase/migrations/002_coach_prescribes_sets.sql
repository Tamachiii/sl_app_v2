-- Coach now prescribes sets (reps/weight/RPE); student fills in actuals on the same rows.
-- Run this in the Supabase SQL editor once.

drop policy if exists "set_logs: student writes"     on set_logs;
drop policy if exists "set_logs: coach writes"       on set_logs;
drop policy if exists "set_logs: student updates"    on set_logs;

-- Coaches can fully manage (insert/update/delete) sets on sessions in their programs.
create policy "set_logs: coach writes" on set_logs
  for all using (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.coach_id = auth.uid()
    )
  );

-- Students can only update actuals on their own sessions (no insert/delete).
create policy "set_logs: student updates actuals" on set_logs
  for update using (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.student_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.student_id = auth.uid()
    )
  );
