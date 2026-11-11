import type { SchoolClass } from "../../api/types";
import { useApply } from "../../hooks/useApply";
import { IconArrowRight } from "../brand/icons";
import { ClassesIcon, LoadingBlock, StateBlock } from "../StateBlock";
import { AvailabilityBadge, AvailabilityBar } from "../ui/Availability";
import { Button } from "../ui/Button";

const SHOWN = 6;

/** The first few classes with their Apply buttons, so a guardian can act straight from Home. */
export function LivePlaces({
  classes,
  refreshError,
  refresh,
}: {
  classes: SchoolClass[] | null;
  refreshError: string | null;
  refresh: () => Promise<void>;
}) {
  const { apply, canApply, tooltip, label } = useApply(() => void refresh());

  return (
    <section className="section" id="live-places" aria-labelledby="places-title">
      <div className="container">
        <div className="section-head">
          <h2 id="places-title">Places open now</h2>
          <p className="lead">Live availability, refreshed every few seconds. First come, first served.</p>
        </div>

        {refreshError && (
          <p className="strip strip-warn" role="status" data-testid="refresh-error">
            Couldn't refresh the places, so the numbers below may be out of date. {refreshError} Trying again…
          </p>
        )}

        {classes === null && !refreshError && <LoadingBlock>Loading places…</LoadingBlock>}
        {classes?.length === 0 && (
          <StateBlock icon={ClassesIcon}>
            No classes have been published yet. The registrar can add them in <a href="#/create">Registrar (Admin)</a>.
          </StateBlock>
        )}

        {classes && classes.length > 0 && (
          <>
            <ul className="places">
              {classes.slice(0, SHOWN).map((c) => (
                <li key={c.id} className="place-card" data-full={c.availableSeats === 0}>
                  <div className="place-head">
                    <h3>{c.name}</h3>
                    <AvailabilityBadge c={c} />
                  </div>
                  <AvailabilityBar c={c} />
                  <p className="place-meta">
                    <strong className="tnum">{c.availableSeats}</strong> of <span className="tnum">{c.totalSeats}</span> places available
                  </p>
                  <Button onClick={() => apply(c.id)} disabled={!canApply(c)} title={tooltip(c)}>
                    {label(c)}
                  </Button>
                </li>
              ))}
            </ul>
            <p className="section-link">
              <a className="arrow-link" href="#/classes">
                {classes.length > SHOWN ? `See all ${classes.length} classes` : "Open the places board"} <IconArrowRight size={16} />
              </a>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
