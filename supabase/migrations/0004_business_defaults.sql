alter table public.businesses
  add column default_tax_rate numeric(5,3) not null default 0
    constraint businesses_tax_rate_range check (default_tax_rate >= 0 and default_tax_rate <= 100),
  add column default_terms text;
