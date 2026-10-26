import { useGear } from "../../hooks/useGear";
import SidebarItem from "../sidebar/SidebarItem";
import SidebarLists from "../sidebar/SidebarLists";
import { SectionHeader } from "../common/SectionHeader";

export default function Sidebar() {
  const {
    lists,
    items,
    selectedListId,
    setSelectedListId,
    createList,
    updateList,
    deleteList,
  } = useGear();

  const handleCreateList = async () => {
    try {
      await createList({ name: "New List" });
    } catch (error) {
      console.error("Failed to create list:", error);
    }
  };

  return (
    <aside className="gear-sidebar" aria-label="Gear navigation">
      <div className="sidebar-brand">
        <img className="brand-mark" src="/gear-closet.svg" alt="" />
        <div>
          <p className="brand-name">Gear Closet</p>
          <p className="brand-caption">Your gear, organized.</p>
        </div>
      </div>
      <section className="sidebar-section" aria-label="Your lists">
        <SectionHeader
          title="Your Lists"
          onCreateClick={handleCreateList}
          createLabel=""
          createTitle="Create new list"
        />
        <SidebarLists
          lists={Object.values(lists)}
          selectedListId={selectedListId}
          onSelectList={(list) => setSelectedListId(list.id)}
          onUpdateList={updateList}
          onDeleteList={deleteList}
        />
        {Object.keys(lists).length === 0 && <p className="sidebar-hint">Start with a trip or a kit.</p>}
      </section>
      <section className="sidebar-section" aria-label="Gear library">
        <div className="section-header px-2">
          <h2>Gear library</h2>
          <span className="sidebar-count">{Object.keys(items).length}</span>
        </div>
        <p className="sidebar-hint">
          {Object.keys(items).length ? "Drag gear into any category." : "Items you add to a list will appear here."}
        </p>
        <ul className="space-y-0.5">
          {Object.values(items).map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </ul>
      </section>
    </aside>
  );
}
