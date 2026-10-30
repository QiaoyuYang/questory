/** A page section's title with the lane line under it, as on the landing page. */
export function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <>
      <h2 id={id} className="font-sign text-2xl font-bold md:text-3xl">
        {children}
      </h2>
      <div className="lane-line mt-3 w-24" aria-hidden="true" />
    </>
  );
}
