import { defineArrayMember, defineField, defineType } from "sanity";
import { BillIcon } from "@sanity/icons/Bill";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { UserIcon } from "@sanity/icons/User";

export const passengerSnapshot = defineType({
  name: "passengerSnapshot",
  title: "Passenger",
  type: "object",
  fields: [
    defineField({ name: "givenName", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "familyName", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "email",
      type: "string",
      validation: (rule) => rule.required().email(),
    }),
  ],
});

export const fareSnapshot = defineType({
  name: "fareSnapshot",
  title: "Fare snapshot",
  type: "object",
  fields: [
    defineField({ name: "cabin", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "baseFareCents",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "seatFeeCents",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "seatFeeWaivedCents",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({ name: "currency", type: "string", validation: (rule) => rule.required() }),
  ],
});

export const bookingLeg = defineType({
  name: "bookingLeg",
  title: "Booking leg",
  type: "object",
  fields: [
    defineField({
      name: "flight",
      type: "reference",
      to: [{ type: "flightInstance" }],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "flightNumber", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "originIata", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "destinationIata",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "departureAt", type: "datetime", validation: (rule) => rule.required() }),
    defineField({ name: "arrivalAt", type: "datetime", validation: (rule) => rule.required() }),
    defineField({ name: "cabin", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "seatCodes",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({ name: "fare", type: "fareSnapshot", validation: (rule) => rule.required() }),
  ],
});

export const booking = defineType({
  name: "booking",
  title: "Booking",
  type: "document",
  icon: BillIcon,
  fields: [
    defineField({
      name: "reference",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "clerkUserId",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tripType",
      type: "string",
      options: {
        list: [
          { title: "One way", value: "oneway" },
          { title: "Round trip", value: "roundtrip" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Held", value: "held" },
          { title: "Confirmed", value: "confirmed" },
          { title: "Cancelled", value: "cancelled" },
          { title: "Payment failed", value: "payment_failed" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "paymentStatus",
      type: "string",
      options: {
        list: [
          { title: "Unpaid", value: "unpaid" },
          { title: "Dummy succeeded", value: "dummy_succeeded" },
          { title: "Dummy declined", value: "dummy_declined" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "passengers",
      type: "array",
      of: [defineArrayMember({ type: "passengerSnapshot" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "legs",
      type: "array",
      of: [defineArrayMember({ type: "bookingLeg" })],
      validation: (rule) => rule.required().min(1).max(2),
    }),
    defineField({
      name: "totalCents",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "currency",
      type: "string",
      initialValue: "usd",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "proSeatWaiverApplied",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "simulationSource",
      title: "Simulation source",
      type: "string",
      options: { list: [{ title: "Aviationstack live feed", value: "aviationstack" }] },
      readOnly: true,
    }),
    defineField({
      name: "idempotencyKey",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "holdExpiresAt",
      type: "datetime",
    }),
    defineField({
      name: "confirmedAt",
      type: "datetime",
    }),
  ],
  preview: {
    select: { title: "reference", subtitle: "status" },
  },
});

export const seatClaim = defineType({
  name: "seatClaim",
  title: "Seat claim",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "flight",
      type: "reference",
      to: [{ type: "flightInstance" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seatCode",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "cabin",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Held", value: "held" },
          { title: "Confirmed", value: "confirmed" },
          { title: "Released", value: "released" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "booking",
      type: "reference",
      to: [{ type: "booking" }],
    }),
    defineField({
      name: "clerkUserId",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "expiresAt",
      type: "datetime",
    }),
    defineField({
      name: "holdKey",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "seatCode", subtitle: "status" },
  },
});

export const supportArticle = defineType({
  name: "supportArticle",
  title: "Support article",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      options: {
        list: [
          { title: "Booking", value: "booking" },
          { title: "Seats", value: "seats" },
          { title: "Membership", value: "membership" },
          { title: "Payments", value: "payments" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      type: "array",
      of: [defineArrayMember({ type: "block" })],
      validation: (rule) => rule.required(),
    }),
  ],
});
