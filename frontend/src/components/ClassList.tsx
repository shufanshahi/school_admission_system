import { useMemo, useState } from "react";
import type { SchoolClass } from "../api/types";
import { useStudentDialog } from "../context/StudentDialogContext";
import { useStudent } from "../context/StudentContext";
import { useApply } from "../hooks/useApply";
import { useClasses } from "../hooks/useClasses";
import { IconSearch } from "./brand/icons";
import { PageHeader } from "./layout/PageHeader";
import { ClassesIcon, LoadingBlock, StateBlock } from "./StateBlock";
import { AvailabilityBadge, AvailabilityBar } from "./ui/Availability";
import { Button } from "./ui/Button";

type Sort = "listed" | "name" | "available";

export function ClassList() {
  const { isValid } = useStudent();
  const { openStudentId } = useStudentDialog();
  const { classes, refreshError, refresh } = useClasses();
  const { apply, canApply, tooltip, label } = useApply(() => void refresh());

  // Search and filters live here, so they survive the 3-second refresh.
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("listed");

  const visible = useMemo<SchoolClass[] | null>(() => {
    if (!classes) return null;
    const needle = query.trim().toLowerCase();
    let list = classes.filter((c) => c.name.toLowerCase().includes(needle));
    if (onlyOpen) list = list.filter((c) => c.availableSeats > 0);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (sort === "available")
      list = [...list].sort((a, b) => b.availableSeats - a.availableSeats || a.name.localeCompare(b.name, undefined, { numeric: true }));
    return list;
  }, [classes, query, onlyOpen, sort]);

  const filtering = query.trim() !== "" || onlyOpen;
  const clear = () => {
    setQuery("");
    setOnlyOpen(false);
  };

  return (
    <section>
      <PageHeader title="Places & Apply" lead="Every class and shift, with live availability. Choose one and reserve a place." />

      <div className="container page-body">
        {!isValid && (
          <p className="hint" data-testid="id-hint">
            Enter your 17-digit birth registration number to apply.{" "}
            <button type="button" className="text-link" onClick={openStudentId}>
              Enter student number
            </button>
          </p>
        )}

        {refreshError && (
          <p className="strip strip-warn" role="status" data-testid="refresh-error">
            Couldn't refresh seat counts, so the numbers below may be out of date. {refreshError} Trying again…
          </p>
        )}

        {classes === null && !refreshError && <LoadingBlock>Loading classes…</LoadingBlock>}
        {classes === null && refreshError && <p className="muted">No class information to show yet.</p>}
        {classes?.length === 0 && (
          <StateBlock icon={ClassesIcon} testId="no-classes">
            No classes yet. An admin can add one in “Registrar (Admin)”.
          </StateBlock>
        )}

        {classes && classes.length > 0 && (
          <>
            <div className="toolbar" role="search">
              <div className="search-field">
                <IconSearch size={18} />
                <label className="sr-only" htmlFor="class-search">Search classes</label>
                <input
                  id="class-search"
                  type="search"
                  placeholder="Search classes, e.g. Class 6"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <label className="check">
                <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
                <span>Only classes with places</span>
              </label>
              <label className="sort">
                <span>Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="listed">Order added</option>
                  <option value="name">Name</option>
                  <option value="available">Most places available</option>
                </select>
              </label>
            </div>

            {visible && visible.length === 0 && (
              <StateBlock icon={ClassesIcon} testId="no-matches">
                {filtering ? "No classes match your search." : "No classes to show."}{" "}
                <button type="button" className="text-link" onClick={clear}>Clear filters</button>
              </StateBlock>
            )}

            {visible && visible.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th className="num">Total</th>
                      <th className="num">Held</th>
                      <th className="num">Confirmed</th>
                      <th className="num">Available</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id} data-testid={`class-row-${c.name}`} data-full={c.availableSeats === 0}>
                        <td>
                          <span className="class-name">{c.name}</span>
                          <AvailabilityBar c={c} />
                        </td>
                        <td className="num" data-label="Total">{c.totalSeats}</td>
                        <td className="num" data-label="Held" data-testid="held">{c.heldSeats}</td>
                        <td className="num" data-label="Confirmed" data-testid="confirmed">{c.confirmedSeats}</td>
                        <td className="num" data-label="Available" data-testid="available"><strong>{c.availableSeats}</strong></td>
                        <td data-label="Status"><AvailabilityBadge c={c} /></td>
                        <td>
                          <Button onClick={() => apply(c.id)} disabled={!canApply(c)} title={tooltip(c)}>
                            {label(c)}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
