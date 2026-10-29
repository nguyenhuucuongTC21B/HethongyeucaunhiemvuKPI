"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Trang chủ</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {b.href && i < breadcrumbs.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link href={b.href}>{b.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{b.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-primary sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
