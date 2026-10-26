import type { List } from "../../types";
import SidebarListItem from "./SidebarListItem";

interface SidebarListsProps {
  lists: List[];
  selectedListId: number | null;
  onSelectList: (list: List) => void;
  onUpdateList: (list: Pick<List, "id" | "name">) => Promise<void>;
  onDeleteList: (listId: number) => Promise<void>;
}

export default function SidebarLists({
  lists,
  selectedListId,
  onSelectList,
  onUpdateList,
  onDeleteList,
}: SidebarListsProps) {
  return (
    <ul className="list-none p-0 m-0">
      {lists.map((list) => (
        <SidebarListItem
          key={list.id}
          list={list}
          isSelected={list.id === selectedListId}
          onSelect={onSelectList}
          onUpdate={onUpdateList}
          onDelete={onDeleteList}
        />
      ))}
    </ul>
  );
}
