import type { Meeting, NextMeeting } from "@/lib/data";

const TITLE =
  "font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.015em] text-ink option-b:font-light option-d:font-extrabold";

export function Meetings({
  next,
  upcoming,
}: {
  next: NextMeeting;
  upcoming: Meeting[];
}) {
  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-10 sm:px-10">
      <h1 className={TITLE}>Gather with us.</h1>
      <p className="mt-1.5 max-w-[60ch] font-body text-[16px] leading-[1.5] text-ink-soft">
        We meet the third Sunday of every month. Arrive a little early, stay a
        little late — there&rsquo;s always tea.
      </p>

      <div className="mt-8 grid grid-cols-1 overflow-hidden rounded-card border border-line bg-surface shadow-[var(--cardshadow)] lg:grid-cols-[1.4fr_0.6fr]">
        <div className="px-8 py-7">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
            {next.tag}
          </p>
          <p className="mt-2.5 font-display text-[30px] font-semibold leading-[1.06] text-ink option-b:font-normal option-d:font-bold">
            {next.date}
          </p>
          <p className="mb-4 font-body text-[15px] text-ink-soft">
            {next.location}
          </p>
          <ol className="flex flex-col gap-2.5">
            {next.expect.map((step, i) => (
              <li
                key={i}
                className="flex gap-3.5 font-body text-[15px] leading-[1.5] text-ink-soft"
              >
                <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[var(--stepr)] bg-accent-soft font-body text-[13px] font-bold text-accent">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-3 border-t border-line bg-accent-soft px-7 py-7 lg:border-l lg:border-t-0">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
            Good to know
          </h4>
          <p className="font-display text-[20px] leading-[1.2] text-ink option-b:font-normal">
            {next.goodToKnow.address}
          </p>
          <p className="font-body text-[14.5px] leading-[1.5] text-ink-soft">
            {next.goodToKnow.parking}
          </p>
          <p className="font-body text-[14.5px] leading-[1.5] text-ink-soft">
            {next.goodToKnow.welcome}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-2 font-display text-[22px] font-semibold text-ink option-b:font-normal option-d:font-bold">
          Upcoming circles
        </h2>
        <div>
          {upcoming.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-[18px] border-t border-line py-3 last:border-b"
            >
              <div className="w-14 flex-none text-center">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-accent">
                  {m.month}
                </p>
                <p className="font-display text-[26px] font-semibold leading-none text-ink">
                  {m.day}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[17px] font-semibold text-ink option-b:font-normal option-d:font-bold">
                  {m.title}
                </h3>
                <p className="font-body text-[13.5px] text-faint">{m.note}</p>
              </div>
              <p className="whitespace-nowrap font-body text-[13.5px] text-ink-soft">
                {m.time}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
