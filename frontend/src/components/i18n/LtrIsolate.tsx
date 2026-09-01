import { type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type LtrIsolateProps = Omit<HTMLAttributes<HTMLElement>, "dir" | "children"> & {
  children: ReactNode;
  as?: ElementType;
  block?: boolean;
  className?: string;
};

const isolateStyle: CSSProperties = {
  direction: "ltr",
  unicodeBidi: "isolate",
};

export default function LtrIsolate({
  children,
  as,
  block = false,
  className,
  style,
  ...rest
}: LtrIsolateProps) {
  const Component: ElementType = as ?? (block ? "div" : "span");
  return (
    <Component
      {...rest}
      dir="ltr"
      data-ltr-isolate=""
      className={cn(className)}
      style={{ ...isolateStyle, ...style }}
    >
      {children}
    </Component>
  );
}
