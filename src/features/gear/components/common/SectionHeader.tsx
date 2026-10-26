import { CreateButton } from "./CreateButton";

interface SectionHeaderProps {
  title: string;
  onCreateClick?: () => Promise<void> | void;
  createLabel?: string;
  createTitle?: string;
  level?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  title,
  onCreateClick,
  createLabel,
  createTitle,
  level = "h2",
}: SectionHeaderProps) {
  const Heading = level;

  return (
    <div className="section-header">
      <Heading>{title}</Heading>
      {onCreateClick && createLabel !== undefined && (
        <CreateButton
          onClick={onCreateClick}
          label={createLabel}
          title={createTitle}
        />
      )}
    </div>
  );
}
