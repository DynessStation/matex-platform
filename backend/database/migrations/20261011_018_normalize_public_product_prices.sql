START TRANSACTION;

-- Public catalog prices are consumer-facing. Keep every stored amount intact,
-- expose the existing IDR and USD consumer rows, and keep wholesale rows internal.
UPDATE product_catalog_price
SET product_price_is_public = CASE
  WHEN product_price_type = 'end_user'
    AND product_price_currency IN ('IDR', 'USD')
    AND product_price_is_active = 1
  THEN 1
  ELSE 0
END;

COMMIT;
