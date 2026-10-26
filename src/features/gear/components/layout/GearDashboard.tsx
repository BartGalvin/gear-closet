import GearDnDContext from "../../dnd/GearDnDContext";
import SelectedListView from "./SelectedListView";
import Sidebar from "../sidebar/Sidebar";

export default function GearDashboard() {
  return (
    <GearDnDContext>
      <div className="gear-dashboard">
        <Sidebar />
        <main className="gear-main" aria-label="Packing list">
          <SelectedListView />
        </main>
      </div>
    </GearDnDContext>
  );
}
