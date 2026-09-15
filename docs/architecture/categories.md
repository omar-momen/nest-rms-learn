# Categories

Category catalog with localized `name` and `description`. App clients can read;
dashboard users can create, update, and delete.

## Localized fields

PostgreSQL stores both fields as JSON:

```json
{
  "en": "Desserts",
  "ar": "الحلويات"
}
```

- `name` is required and must contain both `en` and `ar`.
- `description` is optional; when supplied, it must contain both languages.
- Each localized value must be 3–100 characters.
- Request bodies use `application/json`, not multipart form data.

`CreateCategoryDto` validates the nested objects. Existing rows were migrated by
copying their previous text into both language keys.

## Response surfaces

App endpoints use `resolveLocalizedText`, which reads the locale from
`I18nContext` (`?lang=`, then `Accept-Language`, default `en`). They return plain
strings:

```json
{
  "name": "الحلويات",
  "description": "أطباق حلوة"
}
```

Dashboard endpoints return both values so administrators can edit translations:

```json
{
  "name": {
    "en": "Desserts",
    "ar": "الحلويات"
  }
}
```

Products that include their category follow the same app/dashboard response
rule.

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/app/categories` | Public localized list |
| `GET` | `/app/categories/:id` | Public localized item |
| `GET` | `/dashboard/categories` | List with both languages |
| `GET` | `/dashboard/categories/:id` | Item with both languages |
| `POST` | `/dashboard/categories` | Create (`categories:write`) |
| `PATCH` | `/dashboard/categories/:id` | Update (`categories:write`) |
| `DELETE` | `/dashboard/categories/:id` | Delete unless products reference it |

Scratch requests: `src/modules/categories/categories.endpoint.http`. Postman
requests: `postman/Nest-RMS-Learn.postman_collection.json`.
