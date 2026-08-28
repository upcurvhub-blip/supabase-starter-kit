
DO $$
DECLARE
  parents jsonb := '[
    {"slug":"home-services","name":"Home Services","subs":["Home Deep Cleaning","Pest Control","Sofa Cleaning","Kitchen Cleaning","Bathroom Cleaning","Water Tank Cleaning","Home Painting","Home Sanitization","Carpenter at Home","Home Shifting"]},
    {"slug":"repair-maintenance-services","name":"Repair & Maintenance Services","subs":["AC Repair & Service","Refrigerator Repair","Washing Machine Repair","TV Repair","Geyser Repair","Microwave Repair","RO Water Purifier Service","Chimney Repair","Inverter & Battery Service","Laptop Repair","Mobile Repair"]},
    {"slug":"cleaning-services","name":"Cleaning Services","subs":["Office Cleaning","Industrial Cleaning","Facade Cleaning","Post-Construction Cleaning","Marble Polishing","Carpet Shampooing","Housekeeping Services","Sewage Cleaning","Septic Tank Cleaning"]},
    {"slug":"construction-services","name":"Construction Services","subs":["Civil Contractor","Interior Designer","Architect Services","False Ceiling Work","Flooring & Tiling","Electrical Contractor","Plumbing Contractor","Waterproofing","Structural Consultant","Modular Kitchen"]},
    {"slug":"logistics-transport-services","name":"Logistics & Transport Services","subs":["Packers & Movers","Truck Rental","Courier Services","Warehouse Services","Cold Storage Rental","Freight Forwarding","Customs Clearance","Last Mile Delivery","Container Transport"]},
    {"slug":"it-software-services","name":"IT & Software Services","subs":["Website Development","Mobile App Development","SEO Services","Cloud Hosting","IT Support & AMC","ERP Implementation","CRM Setup","Cyber Security Audit","Data Recovery Services"]},
    {"slug":"marketing-advertising-services","name":"Marketing & Advertising Services","subs":["Digital Marketing","Social Media Management","Google Ads Management","Content Writing","Graphic Design","Video Production","Hoarding Advertising","Influencer Marketing","Branding & Identity"]},
    {"slug":"event-wedding-services","name":"Event & Wedding Services","subs":["Wedding Planners","Corporate Event Management","Catering Services","Decorators","Photographers","Videographers","DJ & Sound","Tent House","Anchoring & Emcee"]},
    {"slug":"healthcare-services","name":"Healthcare Services","subs":["Home Nursing","Physiotherapy at Home","Elderly Care","Lab Sample Collection","Ambulance Services","Medical Equipment Rental","Diet & Nutrition Consulting"]},
    {"slug":"beauty-wellness-services","name":"Beauty & Wellness Services","subs":["Salon at Home","Spa at Home","Bridal Makeup","Hair Treatment","Massage Therapy","Yoga Trainer","Personal Trainer"]},
    {"slug":"automotive-services","name":"Automotive Services","subs":["Car Repair","Bike Repair","Car Wash","Car Detailing","Roadside Assistance","Tyre Fitting","Car AC Service","Denting & Painting"]},
    {"slug":"education-training-services","name":"Education & Training Services","subs":["Home Tutors","Coaching Classes","Corporate Training","Language Classes","Music Classes","Dance Classes","Skill Development"]},
    {"slug":"legal-financial-services","name":"Legal & Financial Services","subs":["GST Registration","Company Registration","Chartered Accountant","Legal Consultation","Trademark Registration","Tax Filing","Bookkeeping","Audit Services"]},
    {"slug":"industrial-maintenance-services","name":"Industrial Maintenance Services","subs":["CNC Machine Repair","DG Set Maintenance","HVAC AMC","Solar Panel Installation","Solar Panel Cleaning","Boiler Maintenance","Crane Rental","Forklift Rental","Industrial Painting"]},
    {"slug":"rental-services","name":"Rental Services","subs":["Furniture Rental","Appliance Rental","Camera Rental","Vehicle Rental","Sound System Rental","Projector Rental","Generator Rental","Scaffolding Rental"]}
  ]'::jsonb;
  p jsonb;
  s text;
  parent_slug text;
  parent_name text;
  parent_id_v uuid;
  sub_slug text;
BEGIN
  FOR p IN SELECT * FROM jsonb_array_elements(parents) LOOP
    parent_slug := p->>'slug';
    parent_name := p->>'name';
    INSERT INTO public.categories (name, slug, level, is_active, is_service, service_confidence, service_ai_flagged, display_order)
    VALUES (parent_name, parent_slug, 1, true, true, 0.95, true, 500)
    ON CONFLICT (slug) DO UPDATE SET is_service = true, is_active = true
    RETURNING id INTO parent_id_v;

    IF parent_id_v IS NULL THEN
      SELECT id INTO parent_id_v FROM public.categories WHERE slug = parent_slug;
    END IF;

    FOR s IN SELECT jsonb_array_elements_text(p->'subs') LOOP
      sub_slug := parent_slug || '-' || regexp_replace(lower(s), '[^a-z0-9]+', '-', 'g');
      sub_slug := regexp_replace(sub_slug, '(^-|-$)', '', 'g');
      INSERT INTO public.categories (name, slug, parent_id, level, is_active, is_service, service_confidence, service_ai_flagged, display_order)
      VALUES (s, sub_slug, parent_id_v, 2, true, true, 0.95, true, 500)
      ON CONFLICT (slug) DO UPDATE SET is_service = true, is_active = true, parent_id = EXCLUDED.parent_id;
    END LOOP;
  END LOOP;
END $$;
