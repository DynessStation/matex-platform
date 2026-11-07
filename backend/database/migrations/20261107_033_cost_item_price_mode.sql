START TRANSACTION;

-- One door for a product's price: it follows the calculation, or someone sets it by hand.
ALTER TABLE `cost_item`
  ADD COLUMN `cost_item_price_mode` varchar(10) NOT NULL DEFAULT 'follow' AFTER `cost_item_app`,
  ADD CONSTRAINT `chk_cost_item_price_mode` CHECK (`cost_item_price_mode` IN ('follow', 'manual'));

-- Overhead is one of the usual parts of HPP, next to materials and labor.
ALTER TABLE `cost_material` DROP CHECK `chk_cost_material_kind`;
ALTER TABLE `cost_material`
  ADD CONSTRAINT `chk_cost_material_kind`
    CHECK (`cost_material_kind` IN ('material', 'service', 'overhead', 'packaging', 'shipping', 'other'));

COMMIT;
