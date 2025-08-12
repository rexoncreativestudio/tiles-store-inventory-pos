"use client";
import dynamic from "next/dynamic";

const SalesMobileAccordionClient = dynamic(
  () => import("./sales-mobile-accordion-client"),
  { ssr: false }
);

export default SalesMobileAccordionClient;