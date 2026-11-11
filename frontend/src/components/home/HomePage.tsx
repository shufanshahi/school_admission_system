import { school } from "../../content/site";
import { useClasses } from "../../hooks/useClasses";
import { summarize } from "../../lib/availability";
import { scrollToId } from "../../lib/scroll";
import { Button } from "../ui/Button";
import { AdmissionsPortal } from "./AdmissionsPortal";
import { LivePlaces } from "./LivePlaces";
import { FaqAndVisit, Fees, Houses, News, Timeline } from "./SchoolSections";

export function HomePage() {
  const { classes, refreshError, refresh } = useClasses();
  const totals = classes ? summarize(classes) : null;
  const figure = (n: number | undefined) => (n === undefined ? "–" : n.toLocaleString("en"));

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1 className="hero-title">A place at Imperial begins here.</h1>
            <p className="hero-lead">
              Reserve a place for your child online. Your seat is held while you pay the admission fee, and released
              to other families if the time runs out.
            </p>
            <div className="hero-actions">
              <Button onClick={() => scrollToId("live-places")}>Reserve a place</Button>
              <Button variant="outline" href="#/mine">My applications</Button>
            </div>
            <p className="hero-motto">
              {school.motto}
              <span> · {school.mottoMeaning}</span>
            </p>
          </div>

          <AdmissionsPortal />
        </div>

        <div className="container">
          <dl className="register" aria-label="Admissions at a glance">
            <div>
              <dt>Classes open</dt>
              <dd className="tnum">{figure(totals?.classes)}</dd>
            </div>
            <div>
              <dt>Places in total</dt>
              <dd className="tnum">{figure(totals?.totalPlaces)}</dd>
            </div>
            <div>
              <dt>Places still available</dt>
              <dd className="tnum">{figure(totals?.placesAvailable)}</dd>
            </div>
            <div>
              <dt>Admissions confirmed</dt>
              <dd className="tnum">{figure(totals?.confirmed)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <LivePlaces classes={classes} refreshError={refreshError} refresh={refresh} />
      <Timeline />
      <Houses />
      <News />
      <Fees />
      <FaqAndVisit />
    </>
  );
}
