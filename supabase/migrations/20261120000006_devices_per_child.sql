-- One phone can be set up for SEVERAL children (siblings on a shared family phone).
-- Before: device_id alone was the key, so enrolling a second child on the same phone was refused.
alter table public.devices drop constraint devices_pkey;
alter table public.devices add primary key (device_id, student_id);
