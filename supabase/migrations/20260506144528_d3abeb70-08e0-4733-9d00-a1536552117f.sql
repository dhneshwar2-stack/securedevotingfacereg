CREATE TABLE public.settings (
  id text PRIMARY KEY,
  voting_start timestamptz,
  voting_end timestamptz,
  theme_primary text,
  theme_accent text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update settings" ON public.settings FOR UPDATE USING (true);

INSERT INTO public.settings (id) VALUES ('global');

ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;