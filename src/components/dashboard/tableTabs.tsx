"use client";

import type { TableRowEntry } from "./DataTableEditor";
import {
  CalendarClock,
  FileText,
  Grid3x3,
  ScrollText,
  ShieldAlert,
  Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Shared left-rail \"tables\" entries across the Table Editor pages.   */
/*  Each spreadsheet lives in its own tab; counts come from the caller. */
/* ------------------------------------------------------------------ */

export function tableTabs(opts: {
  active: string;
  contracts?: number;
  renewals?: number;
  risk?: number;
  activity?: number;
  savings?: number;
}): TableRowEntry[] {
  return [
    {
      label: "Vendors",
      href: "/dashboard/companies",
      icon: <Grid3x3 size={12} />,
      selected: opts.active === "vendors",
      count: opts.contracts,
    },
    {
      label: "Contracts",
      href: "/dashboard/contracts",
      icon: <FileText size={12} />,
      selected: opts.active === "contracts",
      count: opts.contracts,
    },
    {
      label: "Renewals",
      href: "/dashboard/renewals",
      icon: <CalendarClock size={12} />,
      selected: opts.active === "renewals",
      count: opts.renewals,
    },
    {
      label: "Risk",
      href: "/dashboard/risks",
      icon: <ShieldAlert size={12} />,
      selected: opts.active === "risk",
      count: opts.risk,
    },
    {
      label: "Activity",
      href: "/dashboard/activity",
      icon: <ScrollText size={12} />,
      selected: opts.active === "activity",
      count: opts.activity,
    },
    {
      label: "Savings",
      href: "/dashboard/savings",
      icon: <Wallet size={12} />,
      selected: opts.active === "savings",
      count: opts.savings,
    },
  ];
}