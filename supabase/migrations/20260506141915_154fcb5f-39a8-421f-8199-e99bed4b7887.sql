
-- Voters table
CREATE TABLE public.voters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  photo_url TEXT,
  face_descriptor JSONB,
  has_voted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  symbol_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Votes table
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID NOT NULL REFERENCES public.voters(id) ON DELETE CASCADE UNIQUE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: open access for this demo app (no auth)
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read voters" ON public.voters FOR SELECT USING (true);
CREATE POLICY "Public insert voters" ON public.voters FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update voters" ON public.voters FOR UPDATE USING (true);

CREATE POLICY "Public read candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Public insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update candidates" ON public.candidates FOR UPDATE USING (true);
CREATE POLICY "Public delete candidates" ON public.candidates FOR DELETE USING (true);

CREATE POLICY "Public read votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Public insert votes" ON public.votes FOR INSERT WITH CHECK (true);

-- Storage bucket for voter photos and candidate symbols
INSERT INTO storage.buckets (id, name, public) VALUES ('voting', 'voting', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read voting bucket" ON storage.objects FOR SELECT USING (bucket_id = 'voting');
CREATE POLICY "Public upload voting bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voting');
