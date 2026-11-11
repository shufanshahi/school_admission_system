import { school } from "../../content/site";
import { Crest } from "../brand/Crest";
import { IconMail, IconMapPin, IconPhone } from "../brand/icons";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Crest size={52} />
          <p className="footer-name">{school.name}</p>
          <p className="footer-motto">{school.motto}</p>
          <p className="muted">{school.mottoMeaning}</p>
        </div>

        <div>
          <h2 className="footer-h">Admissions</h2>
          <ul className="footer-links">
            <li><a href="#/classes">Places &amp; Apply</a></li>
            <li><a href="#/mine">My Applications</a></li>
            <li><a href="#/create">Registrar (Admin)</a></li>
          </ul>
        </div>

        <div>
          <h2 className="footer-h">Visit us</h2>
          <ul className="footer-contact">
            <li><IconMapPin size={16} /> <span>{school.address[0]}<br />{school.address[1]}</span></li>
            <li><IconPhone size={16} /> <a href={`tel:${school.phone.replace(/\s/g, "")}`}>{school.phone}</a></li>
            <li><IconMail size={16} /> <a href={`mailto:${school.email}`}>{school.email}</a></li>
          </ul>
          <p className="muted footer-hours">{school.visiting}</p>
        </div>
      </div>

      <div className="container footer-base">
        <span>© 2026 {school.name}</span>
        <span>Demo product. School details are illustrative.</span>
      </div>
    </footer>
  );
}
