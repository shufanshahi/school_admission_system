import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { isValidStudentId } from "../lib/hold";

const STORAGE_KEY = "school-admission.studentId";

interface StudentContextValue {
  studentId: string;
  setStudentId: (value: string) => void;
  /** True once exactly 17 digits have been entered. */
  isValid: boolean;
}

const StudentContext = createContext<StudentContextValue | null>(null);

function load(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? "").replace(/[^0-9]/g, "").slice(0, 17);
  } catch {
    return "";   // storage blocked (private mode etc.): the app still works, it just won't remember
  }
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setRaw] = useState(load);

  const setStudentId = useCallback((value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 17);   // only digits, at most 17
    setRaw(cleaned);
    try {
      localStorage.setItem(STORAGE_KEY, cleaned);
    } catch {
      // ignore: see load()
    }
  }, []);

  const value = useMemo(
    () => ({ studentId, setStudentId, isValid: isValidStudentId(studentId) }),
    [studentId, setStudentId],
  );
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used inside <StudentProvider>");
  return ctx;
}
