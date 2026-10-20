-- Secure public order-status lookup for the storefront.
-- Run this in Supabase SQL Editor as a project administrator.
-- Do NOT grant anon broad SELECT access to public.orders: it contains customer data.

CREATE OR REPLACE FUNCTION public.lookup_order_status(
  p_order_id text,
  p_phone text
)
RETURNS TABLE (
  id text,
  status text,
  created_at timestamptz,
  total numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    o.id::text,
    o.status::text,
    o.created_at,
    o.total::numeric
  FROM public.orders AS o
  WHERE p_order_id ~ '^[0-9]+$'
    AND o.id::text = p_order_id
    AND length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 7
    AND regexp_replace(coalesce(o.phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.lookup_order_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_status(text, text) TO anon;
