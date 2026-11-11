/*
 * All fictional school content lives here, in one place, so it is easy to replace.
 * Everything below is illustrative: names, numbers, dates and contact details are made up.
 * (".example" is a reserved domain, so the email address can never reach a real inbox.)
 */

export const school = {
  name: "The Imperial School",
  motto: "Virtus et Scientia",
  mottoMeaning: "Virtue and Knowledge",
  tagline: "Excellence, Character, Service.",
  founded: 1887,
  announcement: "Admissions for 2027 are now open",
  phone: "+880 2 5555 0142",
  email: "admissions@imperialschool.example",
  address: ["Hawthorn Estate, Savar", "Dhaka 1340, Bangladesh"],
  visiting: "Visits by appointment, Sunday to Thursday, 9:00 to 16:00",
  registrar: "Dr. A. Rahman, Registrar",
} as const;

export const timeline = [
  { title: "Enter the student's number", text: "Use the 17-digit birth registration number. It is saved on this device." },
  { title: "Reserve a place", text: "Choose a class and shift. A seat is held in the student's name straight away." },
  { title: "Pay within the hold time", text: "Pay the admission fee before the timer ends, or the seat goes back to other families." },
  { title: "Admission confirmed", text: "The place is yours. Print the admission letter for your records." },
] as const;

export const houses = [
  { name: "Windsor", letter: "W", color: "#B5453A", motto: "Honor Primus", meaning: "Honour first" },
  { name: "Kensington", letter: "K", color: "#3F78C4", motto: "Sapere Aude", meaning: "Dare to be wise" },
  { name: "Balmoral", letter: "B", color: "#3E9A74", motto: "Per Aspera", meaning: "Through hardship" },
  { name: "Sandringham", letter: "S", color: "#8B62B8", motto: "Lux in Tenebris", meaning: "Light in darkness" },
] as const;

export const news = [
  { day: "05", month: "Dec 2026", title: "Open Day for new families", text: "Tour the grounds, meet the housemasters and sit in on a morning lesson." },
  { day: "14", month: "Jan 2027", title: "Founders' Day", text: "A formal assembly and the annual cup, held in the Great Hall with the whole school." },
  { day: "20", month: "Jan 2027", title: "Scholarship results announced", text: "Offers for the 2027 entrance scholarships are published to families by email." },
] as const;

export const faq = [
  { q: "How long is a place held for me?", a: "A place is held for a limited time while you pay the admission fee. The countdown is shown on your reservation page, and it keeps running even if you close the page." },
  { q: "What happens if I do not pay in time?", a: "The reservation expires by itself and the place is released to other families straight away. You can apply again if places are still available." },
  { q: "Can I apply to both shifts of the same class?", a: "Yes. Each shift is its own class with its own places, so you may reserve a place in more than one. Only one active application per class is allowed." },
  { q: "Can I cancel a reservation?", a: "Yes, while it is still held. Cancelling releases the place immediately. A confirmed admission cannot be cancelled from this page." },
  { q: "What is the birth registration number for?", a: "It identifies the student. There are no passwords: enter the same 17-digit number to see your applications again on any device." },
  { q: "How are places allocated?", a: "First come, first served. There is no lottery, and the number of places never exceeds what each class offers." },
] as const;

export const fees = {
  note: "Illustrative figures for this demonstration. Amounts are in BDT.",
  rows: [
    { level: "Classes 6 to 8", admission: "50,000", tuition: "85,000", boarding: "60,000" },
    { level: "Classes 9 and 10", admission: "60,000", tuition: "98,000", boarding: "60,000" },
    { level: "Classes 11 and 12", admission: "70,000", tuition: "112,000", boarding: "65,000" },
  ],
} as const;
