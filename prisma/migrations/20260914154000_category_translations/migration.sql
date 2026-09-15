ALTER TABLE "Category"
ALTER COLUMN "name" TYPE JSONB
USING jsonb_build_object('en', "name", 'ar', "name"),
ALTER COLUMN "description" TYPE JSONB
USING CASE
  WHEN "description" IS NULL THEN NULL
  ELSE jsonb_build_object('en', "description", 'ar', "description")
END;
