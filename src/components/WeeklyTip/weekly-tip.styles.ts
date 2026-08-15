/**
 * Styles for the WeeklyTip component
 *
 * These styles use Tailwind CSS classes and are designed to be compatible
 * with the project's design system and dark mode support.
 */

export const weeklyTipStyles = {
  container: "border border-gray-200 bg-white shadow-sm weekly-tip-container",
  header: "flex items-center justify-between gap-2 p-3 border-b border-gray-200 weekly-tip-header",
  headerLabel: "flex items-center gap-2 min-w-0",
  headerIcon: "text-indigo-500 flex-shrink-0",
  headerText: "font-medium text-gray-500 truncate weekly-tip-header-text",
  navGroup: "flex items-center gap-1 flex-shrink-0",
  navButton: "p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none weekly-tip-nav-button",
  body: "p-4 weekly-tip-body",
  titleRow: "flex items-center justify-between gap-2 w-full text-left",
  title: "text-sm font-semibold text-gray-900 weekly-tip-title",
  text: "text-sm text-gray-700 mt-1 weekly-tip-text",
  source: "mt-3 text-xs text-gray-400 weekly-tip-source",
  sourceLink: "underline hover:text-gray-600 weekly-tip-source-link",
} as const;
