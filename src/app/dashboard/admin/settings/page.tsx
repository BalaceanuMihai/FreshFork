import { requireRole } from "@/lib/auth";
import { envPlatformFeeBps, getPlatformSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Marketplace settings · FreshFork" };

/**
 * The fees and timing rules `create_order()` applies.
 *
 * They live in the database rather than in environment variables because the
 * RPC has to read them server-side — a fee passed in the request would be a fee
 * the customer could choose. Every change is written to `admin_actions`.
 */
export default async function AdminSettingsPage() {
  await requireRole("admin", "/dashboard/admin/settings");

  const settings = await getPlatformSettings();
  const deploymentFee = envPlatformFeeBps();

  return (
    <div>
      <h1>Marketplace settings</h1>
      <p>
        These apply to every new order the moment they&apos;re saved. Existing
        orders keep the fee they were placed under.
      </p>

      {settings.platform_fee_bps !== deploymentFee ? (
        <p role="status">
          This deployment&apos;s <code>FRESHFORK_PLATFORM_FEE_BPS</code> is{" "}
          {deploymentFee} bps, but the live commission is {settings.platform_fee_bps}{" "}
          bps. The database value is the one being charged.
        </p>
      ) : null}

      <SettingsForm settings={settings} />
    </div>
  );
}
