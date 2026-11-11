import { createContext, useContext } from "react";

interface StudentDialogValue {
  /** Brings the student-number field into view: focuses it on Home, opens the header popover elsewhere. */
  openStudentId: () => void;
}

const StudentDialogContext = createContext<StudentDialogValue>({ openStudentId: () => {} });

export const StudentDialogProvider = StudentDialogContext.Provider;
export const useStudentDialog = () => useContext(StudentDialogContext);
