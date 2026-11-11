import { useStudent } from "../context/StudentContext";
import { IconCheck } from "./brand/icons";

/** The "login": the student's 17-digit birth registration number, kept in the browser. */
export function StudentIdBar() {
  const { studentId, setStudentId, isValid } = useStudent();
  const hasInput = studentId.length > 0;

  return (
    <div className="student-bar">
      <label htmlFor="student-id">Student birth registration number</label>
      <input
        id="student-id"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={17}
        placeholder="17 digits"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        aria-invalid={hasInput && !isValid}
        aria-describedby="student-id-help"
      />
      <span id="student-id-help" className={isValid ? "ok" : hasInput ? "bad" : "hint"} aria-live="polite">
        {isValid ? (
          <>
            <IconCheck size={16} /> Valid
          </>
        ) : hasInput ? (
          `Birth registration number must be exactly 17 digits (${studentId.length}/17).`
        ) : (
          "Enter your 17-digit birth registration number to apply."
        )}
      </span>
    </div>
  );
}
