"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AtmosphereBackground } from "@/components/atmosphere-background";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    badge: "Free",
    price: "$0",
    description: "Solo builder — notes + limited AI.",
    features: ["1 workspace", "Basic AI credits", "Community support"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    badge: "Popular",
    price: "$29",
    description: "Power user — full AI + productivity.",
    features: ["Unlimited notes", "Advanced AI", "Flashcards & quizzes", "Integrations"],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Team",
    badge: "Scale",
    price: "$79",
    description: "Squads — collab, admin, analytics.",
    features: ["Shared workspaces", "RBAC", "SSO prep", "Usage analytics"],
    cta: "Talk to us",
    highlight: false,
  },
  {
    name: "Infinity Ultra",
    badge: "++pro++",
    price: "Custom",
    description: "Enterprise + marketplace + white-label path.",
    features: ["Dedicated support", "Custom AI agents", "SLA", "Institution dashboards"],
    cta: "Book call",
    highlight: false,
    ultra: true,
  },
];

export default function PricingPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AtmosphereBackground variant="marketing" />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Plans for every{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              velocity
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            Stripe + entitlements next. Abhi yeh page product story + ultra positioning dikhata
            hai — same visual language as landing.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card
                className={`flex h-full flex-col border-white/10 bg-white/[0.03] backdrop-blur ${
                  tier.highlight
                    ? "border-violet-500/40 shadow-xl shadow-violet-500/15 ring-1 ring-violet-500/20"
                    : ""
                } ${tier.ultra ? "border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-950/20 to-transparent" : ""}`}
              >
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {tier.badge}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription className="text-sm">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-3xl font-semibold tabular-nums">
                    {tier.price}
                    {tier.price !== "Custom" && (
                      <span className="text-sm font-normal text-muted-foreground"> / seat / mo</span>
                    )}
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full rounded-xl"
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground">
              ← Back to home
            </Button>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
