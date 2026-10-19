import { defineArrayMember, defineField, defineType } from "sanity";
import { EarthGlobeIcon } from "@sanity/icons/EarthGlobe";

export const airport = defineType({
  name: "airport",
  title: "Airport",
  type: "document",
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: "iata",
      title: "IATA code",
      type: "string",
      validation: (rule) =>
        rule.required().length(3).regex(/^[A-Z]{3}$/, {
          name: "IATA",
          invert: false,
        }),
    }),
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "city",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "country",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "timezone",
      title: "IANA timezone",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "iata", subtitle: "name" },
  },
});

export const seatDefinition = defineType({
  name: "seatDefinition",
  title: "Seat",
  type: "object",
  fields: [
    defineField({
      name: "code",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "cabin",
      type: "string",
      options: {
        list: [
          { title: "Economy", value: "economy" },
          { title: "Business", value: "business" },
          { title: "First", value: "first" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "row",
      type: "number",
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: "column",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "position",
      title: "Seat preference",
      type: "string",
      options: {
        list: [
          { title: "Window", value: "window" },
          { title: "Aisle", value: "aisle" },
          { title: "Middle", value: "middle" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "extraFeeCents",
      title: "Seat surcharge (minor units)",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "isExit",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "isAccessible",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "code", subtitle: "cabin" },
  },
});

export const aircraftType = defineType({
  name: "aircraftType",
  title: "Aircraft type",
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "code",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "layoutVersion",
      type: "string",
      initialValue: "1",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seatGuide",
      title: "Seat preference guide",
      description:
        "Plain-language window, aisle, middle, exit, and accessible seat copy for embeddings and Concierge.",
      type: "text",
      rows: 8,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seats",
      type: "array",
      of: [defineArrayMember({ type: "seatDefinition" })],
      validation: (rule) => rule.required().min(1),
    }),
  ],
});

export const cabinFare = defineType({
  name: "cabinFare",
  title: "Cabin fare",
  type: "object",
  fields: [
    defineField({
      name: "cabin",
      type: "string",
      options: {
        list: [
          { title: "Economy", value: "economy" },
          { title: "Business", value: "business" },
          { title: "First", value: "first" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "amountCents",
      title: "Amount (minor units)",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "currency",
      type: "string",
      initialValue: "usd",
      validation: (rule) => rule.required(),
    }),
  ],
});
