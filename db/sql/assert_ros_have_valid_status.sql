-- Any invalid or null statuses on repair_orders?
WITH invalid AS (
  SELECT ro.id, ro.ro_number, ro.status_code
  FROM repair_orders ro
  LEFT JOIN ro_statuses s ON s.status_code = ro.status_code
  WHERE ro.status_code IS NULL OR s.status_code IS NULL
)
SELECT COUNT(*) AS invalid_ro_count FROM invalid;
