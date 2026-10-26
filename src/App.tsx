import { useEffect, useState } from "react";
import type { GearApi } from "./features/gear/api/GearApi";
import { createHttpGearApi } from "./features/gear/api/httpGearApi";
import { GearProvider } from "./features/gear/context/GearProvider";
import { useGear } from "./features/gear/hooks/useGear";
import GearDashboard from "./features/gear/components/layout/GearDashboard";

const localApi = createHttpGearApi();

function GearScreen() {
  const { refresh, error, clearError } = useGear();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void refresh().catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [refresh]);

  return (
    <div className="gear-app">
      {error && (
        <div role="alert" className="gear-error">
          <span>{error}</span>
          <button type="button" onClick={() => { void refresh().catch(() => undefined); }}>Reload data</button>
          <button type="button" onClick={clearError}>Dismiss</button>
        </div>
      )}
      {loading ? <p className="loading-state" role="status">Loading saved gear...</p> : <GearDashboard />}
    </div>
  );
}

export default function App({ api = localApi }: { api?: GearApi }) {
  return (
    <GearProvider api={api}>
      <GearScreen />
    </GearProvider>
  );
}
