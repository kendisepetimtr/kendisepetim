type SectionProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export default function Section({ title, description, children }: SectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h2 className="font-headline text-3xl font-semibold tracking-tight text-on-background">{title}</h2>
        <p className="mt-4 text-base leading-7 text-secondary">{description}</p>
      </div>
      {children ? <div className="mt-10">{children}</div> : null}
    </section>
  );
}
