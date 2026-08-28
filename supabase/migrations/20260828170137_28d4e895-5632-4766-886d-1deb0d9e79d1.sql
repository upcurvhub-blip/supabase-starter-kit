-- 1) Move goods-type subcategories out of the service tree
UPDATE public.categories c
SET parent_id = (SELECT id FROM public.categories WHERE slug = 'electronics-components'),
    is_service = false,
    updated_at = now()
WHERE c.is_service = false
  AND c.parent_id IN (SELECT id FROM public.categories WHERE is_service = true AND parent_id IS NULL);

-- 2) Seed distinct service-only subcategories
WITH pairs(parent_name, child_name) AS (
  VALUES
    ('Home Services','Curtain & Blind Installation'),
    ('Home Services','Wall Panel & Wallpaper Fitting'),
    ('Home Services','Gardening & Lawn Care'),
    ('Home Services','Terrace Waterproofing'),
    ('Home Services','Home Automation Setup'),
    ('Repair & Maintenance Services','Water Heater Installation'),
    ('Repair & Maintenance Services','Printer & Scanner Repair'),
    ('Repair & Maintenance Services','CCTV Repair & Service'),
    ('Repair & Maintenance Services','Door & Lock Repair'),
    ('Repair & Maintenance Services','Sewing Machine Repair'),
    ('Cleaning Services','Water Tank Disinfection'),
    ('Cleaning Services','Duct Cleaning'),
    ('Cleaning Services','Glass & Window Cleaning'),
    ('Cleaning Services','Kitchen Hood Degreasing'),
    ('Construction Services','Borewell Drilling'),
    ('Construction Services','Compound Wall Construction'),
    ('Construction Services','Soil Testing'),
    ('Construction Services','Land Surveying'),
    ('Construction Services','Demolition Work'),
    ('Automotive Services','Vehicle Insurance Assistance'),
    ('Automotive Services','Car Interior Sanitization'),
    ('Automotive Services','Battery Replacement at Home'),
    ('Automotive Services','Vehicle RTO Documentation'),
    ('Beauty & Wellness Services','Mehendi Artist'),
    ('Beauty & Wellness Services','Nail Art at Home'),
    ('Beauty & Wellness Services','Skin Consultation'),
    ('Beauty & Wellness Services','Ayurvedic Therapy'),
    ('Healthcare Services','Vaccination at Home'),
    ('Healthcare Services','Doctor Home Visit'),
    ('Healthcare Services','Post-Surgery Care'),
    ('Healthcare Services','Mental Health Counselling'),
    ('Event & Wedding Services','Bridal Choreography'),
    ('Event & Wedding Services','Invitation Design & Printing'),
    ('Event & Wedding Services','Balloon Decoration'),
    ('Event & Wedding Services','Live Band & Orchestra'),
    ('Logistics & Transport Services','Bike Transport'),
    ('Logistics & Transport Services','Office Relocation'),
    ('Logistics & Transport Services','Reverse Logistics'),
    ('Logistics & Transport Services','Fleet Management'),
    ('Legal & Financial Services','Business Loan Advisory'),
    ('Legal & Financial Services','Payroll Outsourcing'),
    ('Legal & Financial Services','Import Export Code Registration'),
    ('Legal & Financial Services','FSSAI Licensing'),
    ('Legal & Financial Services','Property Documentation'),
    ('Marketing & Advertising Services','Meta Ads Management'),
    ('Marketing & Advertising Services','Product Photography'),
    ('Marketing & Advertising Services','Print Media Advertising'),
    ('Marketing & Advertising Services','Exhibition Stall Design'),
    ('Marketing & Advertising Services','Public Relations'),
    ('IT & Software Services','Custom Software Development'),
    ('IT & Software Services','E-commerce Store Setup'),
    ('IT & Software Services','Server & Network Setup'),
    ('IT & Software Services','Cloud Migration Services'),
    ('IT & Software Services','IT Staffing & Outsourcing'),
    ('IT & Software Services','Software Testing Services'),
    ('Education & Training Services','Competitive Exam Coaching'),
    ('Education & Training Services','Spoken English Training'),
    ('Education & Training Services','Industrial Safety Training'),
    ('Education & Training Services','Computer Training'),
    ('Education & Training Services','Placement & Career Counselling'),
    ('Industrial Maintenance Services','Compressor Servicing'),
    ('Industrial Maintenance Services','Electrical Panel Maintenance'),
    ('Industrial Maintenance Services','Conveyor Belt Maintenance'),
    ('Industrial Maintenance Services','Pump & Motor Rewinding'),
    ('Industrial Maintenance Services','Calibration Services'),
    ('Rental Services','Portable Toilet Rental'),
    ('Rental Services','Tent & Canopy Rental'),
    ('Rental Services','Office Equipment Rental'),
    ('Rental Services','Event Furniture Rental'),
    ('Rental Services','Laptop Rental')
)
INSERT INTO public.categories (name, slug, parent_id, is_service, is_active, level, sort_order, display_order)
SELECT
  p.child_name,
  par.slug || '-' || regexp_replace(regexp_replace(lower(p.child_name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'),
  par.id,
  true,
  true,
  1,
  0,
  0
FROM pairs p
JOIN public.categories par ON par.name = p.parent_name AND par.is_service = true AND par.parent_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories ex
  WHERE ex.parent_id = par.id AND lower(ex.name) = lower(p.child_name)
)
ON CONFLICT (slug) DO NOTHING;