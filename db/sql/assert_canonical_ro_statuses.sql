-- Assert the canonical 4 status codes exist exactly once each
WITH counts AS (
  SELECT status_code AS code, COUNT(*) AS n
  FROM ro_statuses
  WHERE status_code IN ('OPEN','DIAG','PARTS','READY')
  GROUP BY status_code
),
missing AS (
  SELECT x.code
  FROM (VALUES ('OPEN'),('DIAG'),('PARTS'),('READY')) AS x(code)
  LEFT JOIN counts c ON c.code = x.code
  WHERE c.n IS NULL
),
dupes AS (
  SELECT code, n FROM counts WHERE n <> 1
)
SELECT
  (SELECT COUNT(*) FROM missing) AS missing_count,
  (SELECT COUNT(*) FROM dupes)   AS duplicate_count;
