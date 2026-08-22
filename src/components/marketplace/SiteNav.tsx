import { displayName, getViewer } from "@/lib/auth";
import { Nav } from "./Nav";

/**
 * Server wrapper around <Nav> that resolves the signed-in user. `getViewer`
 * is request-cached, so rendering this on every page costs one lookup.
 */
export async function SiteNav() {
  const viewer = await getViewer();

  return (
    <Nav
      viewer={
        viewer
          ? {
              name: displayName(viewer),
              role: viewer.profile?.role ?? "customer",
            }
          : null
      }
    />
  );
}
