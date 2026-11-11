import { Activity, Database, Server } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "../constants";

export default function HomePage() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
      <div className="space-y-6">
        <Badge variant="secondary">PERN + TypeScript</Badge>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            my-pern-app
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            A focused starter with React, Express, PostgreSQL, typed API wiring, and a ready
            shadcn/Tailwind design system.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={routes.health}>
              <Activity className="h-4 w-4" />
              Check API
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="https://ui.shadcn.com/docs" rel="noreferrer" target="_blank">
              shadcn docs
            </a>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4 text-primary" />
              Server
            </CardTitle>
            <CardDescription>Express API on port 8080 with centralized middleware.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Database
            </CardTitle>
            <CardDescription>PostgreSQL schema and ORM scripts generated from your choices.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Next check:</p>
            <p className="mt-1 font-medium">Run the health page to verify client-to-server wiring.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
