import { defineArrayMember, defineField, defineType } from "sanity";
import { ClockIcon } from "@sanity/icons/Clock";

export const flightInstance = defineType({
  name: "flightInstance",
  title: "Flight",
  type: "document",
  icon: ClockIcon,
  fields: [
    defineField({
      name: "flightNumber",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "origin",
      type: "reference",
      to: [{ type: "airport" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "destination",
      type: "reference",
      to: [{ type: "airport" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "departureAt",
      title: "Departure (UTC)",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "arrivalAt",
      title: "Arrival (UTC)",
      type: "datetime",
      validation: (rule) =>
        rule.required().custom((arrivalAt, context) => {
          const departureAt = context.document?.departureAt;
          if (
            typeof arrivalAt === "string" &&
            typeof departureAt === "string" &&
            new Date(arrivalAt) <= new Date(departureAt)
          ) {
            return "Arrival must be after departure";
          }
          return true;
        }),
    }),
    defineField({
      name: "aircraft",
      type: "reference",
      to: [{ type: "aircraftType" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "fares",
      type: "array",
      of: [defineArrayMember({ type: "cabinFare" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Scheduled", value: "scheduled" },
          { title: "Boarding", value: "boarding" },
          { title: "Cancelled", value: "cancelled" },
        ],
        layout: "radio",
      },
      initialValue: "scheduled",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "flightNumber",
      origin: "origin.iata",
      destination: "destination.iata",
      departureAt: "departureAt",
    },
    prepare({ title, origin, destination, departureAt }) {
      return {
        title: `${title as string} ${origin as string}→${destination as string}`,
        subtitle: departureAt as string,
      };
    },
  },
});
