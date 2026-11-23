import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The sheet every account page is drawn on: the page's title, one sentence
 * under it, and the form. The title is the page's `h1`, so a screen reader's
 * list of headings is not empty on the sign-in pages.
 *
 * The title takes its size, leading and tracking from the type scale
 * (`cb-subsection`). `CardTitle` sets a leading and a tracking of its own for
 * a title in the sans face, and a utility wins over the scale's class, so the
 * two `revert-layer` utilities hand those two properties back to the scale.
 */
export function AuthCard({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("mx-auto w-full max-w-[26rem] py-8", className)}>
      <CardHeader className="text-center">
        <CardTitle as="h1" className="cb-subsection leading-[revert-layer] tracking-[revert-layer]">
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
