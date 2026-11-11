import { useStudent } from "../context/StudentContext";

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
        placeholder="17 digits, e.g. 20152691234567890"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        aria-invalid={hasInput && !isValid}
        aria-describedby="student-id-help"
      />
      <span id="student-id-help" className={isValid ? "ok" : hasInput ? "bad" : "hint"} aria-live="polite">
        {isValid
          ? "✓ Valid"
          : hasInput
            ? `Birth registration number must be exactly 17 digits (${studentId.length}/17).`
            : "Enter your 17-digit birth registration number to apply."}
      </span>
    </div>
  );
}
