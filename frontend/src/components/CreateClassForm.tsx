import { useState, type FormEvent } from "react";
import { createClass } from "../api/client";
import { useNotifications } from "../context/NotificationContext";

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
      <h2>Create class (school admin)</h2>
      <p className="hint">Each shift is its own class, e.g. “Class 6 - Morning Shift” and “Class 6 - Day Shift”.</p>

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

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create class"}
        </button>
      </form>

      {created && (
        <p className="success" role="status" data-testid="created">
          {created}. <a href="#/classes">See it in the class list</a>.
        </p>
      )}
    </section>
  );
}
