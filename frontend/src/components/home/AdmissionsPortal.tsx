import { useMyHoldCount } from "../../hooks/useMyHoldCount";
import { scrollToId } from "../../lib/scroll";
import { IconArrowRight } from "../brand/icons";
import { StudentIdBar } from "../StudentIdBar";

/** The real admission tool, on the first screen: the student number, then the three things a guardian does. */
export function AdmissionsPortal() {
  const count = useMyHoldCount();

  return (
    <section className="portal" aria-labelledby="portal-title">
      <h2 id="portal-title">Admissions Portal</h2>
      <p className="portal-lead">Enter the student's number to begin. It is saved on this device.</p>

      <StudentIdBar />

      <ul className="portal-links">
        <li>
          <a className="portal-link" href="#/classes">
            <span className="portal-link-text">
              <strong>Browse places &amp; apply</strong>
              <span>Every class and shift, with live availability</span>
            </span>
            <IconArrowRight size={18} />
          </a>
        </li>
        <li>
          <a className="portal-link" href="#/mine">
            <span className="portal-link-text">
              <strong>
                My applications
                {count !== null && (
                  <span className="count-pill" aria-label={`${count} applications`}>{count}</span>
                )}
              </strong>
              <span>Check a reservation, pay the fee or cancel</span>
            </span>
            <IconArrowRight size={18} />
          </a>
        </li>
        <li>
          <button type="button" className="portal-link" onClick={() => scrollToId("how-it-works")}>
            <span className="portal-link-text">
              <strong>How admission works</strong>
              <span>Four steps, from reserving a place to confirmation</span>
            </span>
            <IconArrowRight size={18} />
          </button>
        </li>
      </ul>
    </section>
  );
}
