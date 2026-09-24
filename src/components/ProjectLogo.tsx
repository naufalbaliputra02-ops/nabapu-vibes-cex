type ProjectLogoProps = {
  className?: string;
};

export function ProjectLogo({ className }: ProjectLogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}project-logo.png`}
      alt="Project logo"
      className={["project-logo", className].filter(Boolean).join(" ")}
    />
  );
}
