import { SchemaValidationResult } from "./types";

// Required field contracts for common Schema.org types
const REQUIRED_SCHEMA_FIELDS: Record<string, string[]> = {
  Product: ["name", "image", "offers"],
  Article: ["headline", "author", "datePublished", "image"],
  BlogPosting: ["headline", "author", "datePublished"],
  Organization: ["name", "url", "logo"],
  WebSite: ["name", "url"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
};

export function validateSchema(schemaObj: any): SchemaValidationResult {
  if (!schemaObj || typeof schemaObj !== "object") {
    return {
      isValid: false,
      type: "Unknown",
      missingRequiredFields: ["@type"],
      errors: ["Schema is not a valid object"],
      raw: schemaObj,
    };
  }

  const rawType = schemaObj["@type"];
  const type = Array.isArray(rawType) ? rawType[0] : rawType || "Unknown";
  const missingRequiredFields: string[] = [];
  const errors: string[] = [];
  if (typeof type !== "string" || type === "Unknown")
    errors.push("Missing or invalid @type");
  if (
    Array.isArray(rawType) &&
    (!rawType.length || rawType.some((t) => typeof t !== "string" || !t.trim()))
  )
    errors.push("Invalid schema type array");
  if (Array.isArray(schemaObj)) errors.push("Schema must be an object");

  const requiredFields = REQUIRED_SCHEMA_FIELDS[type];
  if (requiredFields) {
    for (const field of requiredFields) {
      if (!schemaObj[field]) {
        missingRequiredFields.push(field);
      }
    }
  }

  if (missingRequiredFields.length > 0) {
    errors.push(
      `Schema of type '${type}' is missing required fields: ${missingRequiredFields.join(", ")}`,
    );
  }

  return {
    isValid: missingRequiredFields.length === 0 && errors.length === 0,
    type: typeof type === "string" ? type : "Unknown",
    missingRequiredFields,
    errors,
    raw: schemaObj,
  };
}
