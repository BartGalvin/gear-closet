interface DescriptionTextProps {
  children: React.ReactNode;
}

export function DescriptionText({ children }: DescriptionTextProps) {
  return <span className="sidebar-description">{children}</span>;
}
