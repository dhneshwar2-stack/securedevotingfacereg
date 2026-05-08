import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { SettingsProvider } from "@/lib/settings";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "secured e voting with face recognition" },
      { name: "description", content: "FaceVote Secure is a voting application that uses facial recognition for secure and efficient voting." },
      { name: "author", content: "FaceVote Secure" },
      { property: "og:title", content: "secured e voting with face recognition" },
      { property: "og:description", content: "FaceVote Secure is a voting application that uses facial recognition for secure and efficient voting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@FaceVoteSecure" },
      { name: "twitter:title", content: "secured e voting with face recognition" },
      { name: "twitter:description", content: "FaceVote Secure is a voting application that uses facial recognition for secure and efficient voting." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/743bb5d7-3ae9-4f4c-807e-f87e1652bd0b/id-preview-6bff6fda--120585a1-7515-4908-b4c9-7f9009a8f9e7.lovable.app-1778077392886.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/743bb5d7-3ae9-4f4c-807e-f87e1652bd0b/id-preview-6bff6fda--120585a1-7515-4908-b4c9-7f9009a8f9e7.lovable.app-1778077392886.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-center" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <SettingsProvider>
      <Outlet />
    </SettingsProvider>
  );
}
