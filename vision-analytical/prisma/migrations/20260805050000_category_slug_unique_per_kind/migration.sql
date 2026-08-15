-- Category slugs are unique per kind, not globally (e.g. "hplc" is a valid
-- slug for both an INSTRUMENT category and a REFURBISHED category).
DROP INDEX "Category_slug_key";

CREATE UNIQUE INDEX "Category_slug_kind_key" ON "Category"("slug", "kind");
