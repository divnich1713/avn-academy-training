// P1-5: Code-split heavy section components via React.lazy
// This avoids loading all 1300+ lines of SectionsInstructor / SectionsCadet
// until the user actually navigates to them.
import { lazy } from "react";

export const Dashboard = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Dashboard })));
export const Materials = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Materials })));
export const Lectures = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Lectures })));
export const Practices = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Practices })));
export const Exams = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Exams })));
export const Reports = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Reports })));
export const Grades = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Grades })));
export const Profile = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Profile })));
export const Instructors = lazy(() => import("./SectionsCadet").then(m => ({ default: m.Instructors })));
export const InstructorPanel = lazy(() => import("./SectionsInstructor").then(m => ({ default: m.InstructorPanel })));
export const InstructorRatings = lazy(() => import("./SectionsRatings").then(m => ({ default: m.InstructorRatings })));
export const PromotionSection = lazy(() => import("./Promotions").then(m => ({ default: m.PromotionSection })));
export const TestingSystem = lazy(() => import("./TestingSystem").then(m => ({ default: m.TestingSystem })));
export const TestingHistory = lazy(() => import("./TestingHistory").then(m => ({ default: m.TestingHistory })));
export const TestingAdmin = lazy(() => import("./TestingAdmin").then(m => ({ default: m.TestingAdmin })));
export const Simulator = lazy(() => import("./Simulator").then(m => ({ default: m.Simulator })));
export const Flashcards = lazy(() => import("./Flashcards").then(m => ({ default: m.Flashcards })));

