import { useState, type FormEvent } from "react";
import { createClass } from "../api/client";
import { useNotifications } from "../context/NotificationContext";
import { PageHeader } from "./layout/PageHeader";

const MAX_NAME = 200;
const MAX_SEATS = 100_000;

export function CreateClassForm() {
  const { notifyError } = useNotifications();
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");
  const [errors, setErrors] = useState<{ name?: string; seats?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setCreated(null);

    // Check here first so obvious mistakes never reach the server.
    const next: { name?: string; seats?: string } = {};
    const trimmed = name.trim();
    if (!trimmed) next.name = "Please enter a class name.";
    else if (trimmed.length > MAX_NAME) next.name = `Class name must be at most ${MAX_NAME} characters.`;

    const seatText = seats.trim();
    if (!/^[0-9]+$/.test(seatText)) next.seats = "Total seats must be a whole number, like 120.";
    else if (Number(seatText) < 1 || Number(seatText) > MAX_SEATS)
      next.seats = `Total seats must be between 1 and ${MAX_SEATS}.`;

    setErrors(next);
    if (next.name || next.seats) return;

    setSubmitting(true);
    try {
      const result = await createClass(trimmed, Number(seatText));
      setCreated(`Class created: ${result.name} (${result.totalSeats} seats)`);
      setName("");
      setSeats("");
    } catch (error) {
      notifyError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Registrar's Office"
        lead="Admin area. Add the classes that families can apply for. There is no login in this demonstration."
      />

      <div className="container page-body registrar">
        <div className="form-card">
          <form onSubmit={onSubmit} noValidate className="form">
            <div className="field">
              <label htmlFor="class-name">Class name</label>
              <input
                id="class-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Class 6 - Morning Shift"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "class-name-error" : undefined}
              />
              {errors.name && (
                <span id="class-name-error" className="field-error" role="alert">
                  {errors.name}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="class-seats">Total seats</label>
              <input
                id="class-seats"
                inputMode="numeric"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="120"
                aria-invalid={!!errors.seats}
                aria-describedby={errors.seats ? "class-seats-error" : undefined}
              />
              {errors.seats && (
                <span id="class-seats-error" className="field-error" role="alert">
                  {errors.seats}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create class"}
            </button>
          </form>

          {created && (
            <p className="success" role="status" data-testid="created">
              {created}. <a href="#/classes">See it on the places board</a>.
            </p>
          )}
        </div>

        <aside className="registrar-note" aria-label="Naming classes">
          <h2>Naming classes</h2>
          <p className="muted">
            Each shift is its own class with its own places, so name them for the grade and the shift:
          </p>
          <ul>
            <li>Class 6 - Morning Shift</li>
            <li>Class 6 - Day Shift</li>
            <li>Class 9 - Science, Morning</li>
          </ul>
          <p className="muted">Places can't be changed once families start applying, so check the number first.</p>
        </aside>
      </div>
    </section>
  );
}
