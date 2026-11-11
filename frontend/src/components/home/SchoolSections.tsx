import { faq, fees, houses, news, school, timeline } from "../../content/site";
import { HouseCrest } from "../brand/Crest";
import { IconChevronDown, IconMail, IconMapPin, IconPhone } from "../brand/icons";

/** How admission works: four steps. The numbers stay because the order matters. */
export function Timeline() {
  return (
    <section className="section section-alt" id="how-it-works" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head">
          <h2 id="how-title">How admission works</h2>
          <p className="lead">There are no forms to post and no queues to stand in.</p>
        </div>
        <ol className="timeline">
          {timeline.map((step, i) => (
            <li key={step.title}>
              <span className="timeline-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Houses() {
  return (
    <section className="section" aria-labelledby="houses-title">
      <div className="container">
        <div className="section-head">
          <h2 id="houses-title">The four houses</h2>
          <p className="lead">Every pupil belongs to a house for life: a family within the school, with its own colours and its own motto.</p>
        </div>
        <ul className="houses">
          {houses.map((h) => (
            <li key={h.name}>
              <HouseCrest color={h.color} letter={h.letter} />
              <h3>{h.name}</h3>
              <p className="house-motto">{h.motto}</p>
              <p className="muted">{h.meaning}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function News() {
  return (
    <section className="section section-alt" aria-labelledby="news-title">
      <div className="container">
        <div className="section-head">
          <h2 id="news-title">News and events</h2>
        </div>
        <ul className="news">
          {news.map((n) => (
            <li key={n.title}>
              <time className="news-date">
                <span className="news-day">{n.day}</span>
                <span className="news-month">{n.month}</span>
              </time>
              <div>
                <h3>{n.title}</h3>
                <p className="muted">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Fees() {
  return (
    <section className="section" aria-labelledby="fees-title">
      <div className="container">
        <div className="section-head">
          <h2 id="fees-title">Fee schedule</h2>
          <p className="lead">{fees.note}</p>
        </div>
        <div className="table-wrap fees-wrap">
          <table className="fees-table">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col" className="num">Admission fee</th>
                <th scope="col" className="num">Tuition per term</th>
                <th scope="col" className="num">Boarding per term</th>
              </tr>
            </thead>
            <tbody>
              {fees.rows.map((r) => (
                <tr key={r.level}>
                  <th scope="row">{r.level}</th>
                  <td className="num" data-label="Admission fee">{r.admission}</td>
                  <td className="num" data-label="Tuition per term">{r.tuition}</td>
                  <td className="num" data-label="Boarding per term">{r.boarding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function FaqAndVisit() {
  return (
    <section className="section section-alt" aria-labelledby="faq-title">
      <div className="container faq-grid">
        <div>
          <div className="section-head">
            <h2 id="faq-title">Questions families ask</h2>
          </div>
          <div className="faq">
            {faq.map((item) => (
              <details key={item.q}>
                <summary>
                  <span>{item.q}</span>
                  <IconChevronDown size={18} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        <aside className="visit" aria-labelledby="visit-title">
          <h2 id="visit-title">Visit the school</h2>
          <p className="muted">{school.visiting}</p>
          <ul>
            <li><IconMapPin size={18} /> <span>{school.address[0]}<br />{school.address[1]}</span></li>
            <li><IconPhone size={18} /> <a href={`tel:${school.phone.replace(/\s/g, "")}`}>{school.phone}</a></li>
            <li><IconMail size={18} /> <a href={`mailto:${school.email}`}>{school.email}</a></li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
